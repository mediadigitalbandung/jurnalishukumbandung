#!/usr/bin/env node
/**
 * Import draft artikel dari Obsidian vault → JHB DB sebagai status DRAFT
 *
 * Usage:
 *   node scripts/obsidian/import-draft.js                     # Import semua draft baru di 07-Drafts/
 *   node scripts/obsidian/import-draft.js <slug>              # Import 1 file spesifik
 *   node scripts/obsidian/import-draft.js --dry-run           # Preview saja, tidak insert
 *
 * Frontmatter wajib di file:
 *   ---
 *   type: artikel-draft
 *   slug: my-article-slug
 *   title: Judul Artikel
 *   category: Berita Terbaru
 *   tags: [tag1, tag2]
 *   excerpt: Ringkasan...
 *   seoTitle: SEO Title (max 60ch)
 *   seoDescription: Meta desc (155ch)
 *   ---
 *   # Konten markdown di sini
 *
 * Setelah import, artikel masuk DB sebagai DRAFT — review di /panel/artikel.
 * File di vault DITANDAI dengan `imported_at` di frontmatter (untuk skip future import).
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const p = new PrismaClient();
const DRAFTS_DIR = path.resolve(__dirname, '../../docs/vault/07-Drafts');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const targetSlug = args.find(a => !a.startsWith('--'));

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fmText = match[1];
  const body = match[2];
  const frontmatter = {};

  const lines = fmText.split('\n');
  let currentKey = null;
  let currentArr = null;

  for (const line of lines) {
    if (line.match(/^\s*-\s+/)) {
      if (currentArr) currentArr.push(line.replace(/^\s*-\s+/, '').trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const kvMatch = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.*)$/);
    if (!kvMatch) continue;
    const [, key, val] = kvMatch;
    currentKey = key;
    if (val.trim() === '') {
      currentArr = [];
      frontmatter[key] = currentArr;
    } else if (val.trim().startsWith('[') && val.trim().endsWith(']')) {
      try { frontmatter[key] = JSON.parse(val.trim().replace(/'/g, '"')); }
      catch { frontmatter[key] = val.trim().slice(1, -1).split(',').map(s => s.trim()); }
      currentArr = null;
    } else {
      frontmatter[key] = val.trim().replace(/^["']|["']$/g, '');
      currentArr = null;
    }
  }
  return { frontmatter, body };
}

function markdownToHtml(md) {
  // Simple conversion — Obsidian markdown → HTML untuk DB
  // (Production: pakai marked atau markdown-it)
  let html = md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // wikilink → plain text (kontekstual link)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Wrap paragraf
  html = html.split(/\n\n+/).map(p => {
    p = p.trim();
    if (!p) return '';
    if (/^<(h\d|blockquote|ul|ol|p|div)/i.test(p)) return p;
    return `<p>${p}</p>`;
  }).join('\n');

  return html;
}

async function importFile(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(content);

  // Validate
  if (!frontmatter.slug) return { error: 'No slug in frontmatter' };
  if (!frontmatter.title) return { error: 'No title' };
  if (frontmatter.imported_at && !args.includes('--force')) {
    return { skipped: 'Already imported (use --force to re-import)' };
  }

  // Get default author (first SUPER_ADMIN)
  const defaultAuthor = await p.user.findFirst({
    where: { role: 'SUPER_ADMIN', isActive: true },
    select: { id: true },
  });
  if (!defaultAuthor) return { error: 'No active SUPER_ADMIN user' };

  // Get category
  const categoryName = frontmatter.category || 'Berita Terbaru';
  let category = await p.category.findFirst({ where: { name: categoryName } });
  if (!category) {
    category = await p.category.findFirst(); // fallback ke first category
  }
  if (!category) return { error: 'No category in DB' };

  // Build article data
  const articleData = {
    title: String(frontmatter.title).slice(0, 250),
    slug: String(frontmatter.slug).slice(0, 90),
    content: markdownToHtml(body),
    excerpt: frontmatter.excerpt ? String(frontmatter.excerpt).slice(0, 500) : '',
    seoTitle: frontmatter.seoTitle ? String(frontmatter.seoTitle).slice(0, 150) : null,
    seoDescription: frontmatter.seoDescription ? String(frontmatter.seoDescription).slice(0, 300) : null,
    status: 'DRAFT',
    authorId: defaultAuthor.id,
    categoryId: category.id,
  };

  // Connect tags
  const tagNames = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
  const tagConnects = [];
  for (const tn of tagNames) {
    const slug = slugify(tn);
    if (!slug) continue;
    let tag = await p.tag.findUnique({ where: { slug } });
    if (!tag) {
      tag = await p.tag.create({ data: { name: tn.trim(), slug } });
    }
    tagConnects.push({ id: tag.id });
  }
  if (tagConnects.length) articleData.tags = { connect: tagConnects };

  if (dryRun) return { dryRun: true, articleData };

  // Check existing slug
  const existing = await p.article.findUnique({ where: { slug: articleData.slug } });
  if (existing) {
    return { error: `Slug "${articleData.slug}" sudah dipakai oleh artikel lain (id: ${existing.id})` };
  }

  const created = await p.article.create({ data: articleData });

  // Mark as imported in vault file
  const newFrontmatter = { ...frontmatter, imported_at: new Date().toISOString(), db_id: created.id };
  const newFmStr = Object.entries(newFrontmatter)
    .map(([k, v]) => Array.isArray(v) ? `${k}:\n${v.map(x => `  - ${x}`).join('\n')}` : `${k}: ${v}`)
    .join('\n');
  fs.writeFileSync(filepath, `---\n${newFmStr}\n---\n${body}`, 'utf8');

  return { created: created.id, slug: created.slug };
}

function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 90);
}

(async () => {
  if (!fs.existsSync(DRAFTS_DIR)) {
    console.log(`Drafts dir not found: ${DRAFTS_DIR}`);
    process.exit(1);
  }

  let files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
  if (targetSlug) {
    files = files.filter(f => f.replace(/\.md$/, '') === targetSlug);
    if (files.length === 0) {
      console.log(`File not found: ${targetSlug}.md`);
      process.exit(1);
    }
  }

  console.log(`Processing ${files.length} draft file(s)${dryRun ? ' [DRY RUN]' : ''}...`);

  let imported = 0, skipped = 0, errored = 0;
  for (const f of files) {
    const result = await importFile(path.join(DRAFTS_DIR, f));
    if (result.created) {
      console.log(`✓ ${f} → DB id=${result.created}`);
      imported++;
    } else if (result.skipped) {
      console.log(`⊝ ${f} — ${result.skipped}`);
      skipped++;
    } else if (result.error) {
      console.log(`✗ ${f} — ${result.error}`);
      errored++;
    } else if (result.dryRun) {
      console.log(`◇ ${f} → would import:`, JSON.stringify(result.articleData, null, 2).slice(0, 300) + '...');
    }
  }

  console.log(`\n=== DONE: ${imported} imported, ${skipped} skipped, ${errored} errored ===`);
  if (imported > 0) console.log(`\nReview di /panel/artikel — status DRAFT.`);

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
