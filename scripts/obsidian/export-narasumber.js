#!/usr/bin/env node
/**
 * Export Source table (narasumber dari artikel) → Markdown di docs/vault/02-Narasumber/
 *
 * Konsolidasi: Source dengan nama mirip → 1 file narasumber.md
 * Misal: Source name="Hari Megawati" muncul di 5 artikel → 1 file narasumber dengan history 5 artikel.
 *
 * Usage:
 *   node scripts/obsidian/export-narasumber.js
 *   node scripts/obsidian/export-narasumber.js --force   # overwrite existing
 *   node scripts/obsidian/export-narasumber.js --min-mentions=3  # hanya yg muncul ≥ 3 artikel
 *
 * Idempotent: skip file existing kecuali --force.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const p = new PrismaClient();
const VAULT_DIR = path.resolve(__dirname, '../../docs/vault/02-Narasumber');

const args = process.argv.slice(2);
const force = args.includes('--force');
const minMentionsArg = args.find(a => a.startsWith('--min-mentions='));
const minMentions = minMentionsArg ? parseInt(minMentionsArg.split('=')[1]) : 1;

function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 60);
}

function normalizeName(name) {
  // Trim, normalize whitespace, capitalize
  return String(name).trim().replace(/\s+/g, ' ');
}

function buildMarkdown(narasumber) {
  const slug = slugify(narasumber.name);
  const articles = narasumber.articles
    .map(a => `- [[07-Drafts/${a.slug}|${a.title}]] _(${a.publishedAt ? new Date(a.publishedAt).toISOString().slice(0, 10) : 'draft'})_${a.title_in_source ? ` — quoted as "${a.title_in_source}"` : ''}`)
    .join('\n');

  const titlesUsed = [...new Set(narasumber.titles_used.filter(Boolean))];
  const institutions = [...new Set(narasumber.institutions.filter(Boolean))];

  return `---
type: narasumber
nama: ${narasumber.name}
peran: ${titlesUsed[0] || ''}
institusi: ${institutions[0] || ''}
jabatan: ${titlesUsed[0] || ''}
kepakaran: []
public_figure: ${titlesUsed.some(t => /hakim|jaksa|menteri|gubernur|dpr/i.test(t || '')) ? 'true' : 'false'}
mentions: ${narasumber.articles.length}
trust_level:
created: ${new Date().toISOString().slice(0, 10)}
auto_imported: true
synced_at: ${new Date().toISOString()}
tags:
  - narasumber
  - auto-imported
---

# ${narasumber.name}

> Auto-imported dari Source table (${narasumber.articles.length} artikel mention).
> Edit manual untuk tambah kontak, profil detail, kepakaran.

## Profil Singkat

(Diisi manual berdasarkan data lapangan)

## Peran / Jabatan yang Pernah Disebutkan

${titlesUsed.map(t => `- ${t}`).join('\n') || '- _(belum ada)_'}

## Institusi

${institutions.map(i => `- ${i}`).join('\n') || '- _(belum ada)_'}

## Kontak

- **Telepon**:
- **Email**:
- **WhatsApp**:
- **Kantor**:

> ⚠️ **Privasi**: kontak narasumber sensitif. Jangan share ke orang lain tanpa izin.

## Kepakaran

(Diisi manual)

-

## Riwayat Disebut di Artikel JHB

${articles}

## Kasus yang Pernah Ditangani

\`\`\`dataview
LIST
FROM "01-Kasus"
WHERE contains(string(hakim), this.file.name) OR contains(string(jaksa), this.file.name) OR contains(string(penasihat_hukum), this.file.name)
SORT mulai_sidang DESC
\`\`\`

## Catatan Karakter / Pendekatan

(Diisi manual: gaya bicara, hal yang harus dihindari, hal yang membuka)



## Trust Level

- [ ] **A — Highly reliable**
- [ ] **B — Reliable**
- [ ] **C — Mixed**
- [ ] **D — Caution**
- [ ] **E — Hostile**

## Tags

#narasumber #auto-imported
`;
}

(async () => {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    console.log(`Created: ${VAULT_DIR}`);
  }

  // Pull semua Source dengan article info
  const sources = await p.source.findMany({
    include: {
      article: {
        select: { id: true, title: true, slug: true, publishedAt: true, status: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`Total Source rows: ${sources.length}`);

  // Group by normalized name
  const groups = new Map();
  for (const s of sources) {
    const name = normalizeName(s.name);
    if (!name) continue;
    if (!groups.has(name)) {
      groups.set(name, {
        name,
        titles_used: [],
        institutions: [],
        articles: [],
      });
    }
    const g = groups.get(name);
    if (s.title) g.titles_used.push(s.title);
    if (s.institution) g.institutions.push(s.institution);
    if (s.article && s.article.status === 'PUBLISHED') {
      g.articles.push({
        id: s.article.id,
        title: s.article.title,
        slug: s.article.slug,
        publishedAt: s.article.publishedAt,
        title_in_source: s.title,
      });
    }
  }

  console.log(`Unique narasumber (after grouping): ${groups.size}`);
  console.log(`Filtering: minimal ${minMentions} mention(s)...`);

  let created = 0, skipped = 0;
  for (const [name, narasumber] of groups) {
    if (narasumber.articles.length < minMentions) continue;

    const slug = slugify(name);
    if (!slug) continue;

    // Capitalize each word for filename
    const filename = name.split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join('-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .slice(0, 80) + '.md';
    const filepath = path.join(VAULT_DIR, filename);

    if (fs.existsSync(filepath) && !force) {
      skipped++;
      continue;
    }

    fs.writeFileSync(filepath, buildMarkdown(narasumber), 'utf8');
    console.log(`✓ ${filename} (${narasumber.articles.length} mentions)`);
    created++;
  }

  console.log(`\n=== DONE: ${created} created, ${skipped} skipped (already exists, use --force) ===`);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
