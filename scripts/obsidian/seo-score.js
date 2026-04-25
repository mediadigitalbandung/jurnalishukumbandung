#!/usr/bin/env node
/**
 * SEO Score Calculator untuk semua draft di 07-Drafts/ + artikel published di DB
 *
 * Skor 0-100 berdasarkan 10 kriteria:
 *   1. Title length (50-60 char optimal) — 10 pts
 *   2. seoTitle present + length ideal — 10 pts
 *   3. seoDescription present + length 150-155 — 10 pts
 *   4. Excerpt present — 5 pts
 *   5. Keyword di title — 10 pts
 *   6. Keyword di H2 — 10 pts
 *   7. Keyword di paragraf 1 — 10 pts
 *   8. Word count ≥ 400 — 15 pts
 *   9. Internal link ≥ 2 — 10 pts
 *   10. Tags ≥ 3 — 5 pts
 *   Bonus: FAQ schema — 5 pts
 *
 * Output:
 *   - 04-Topik-Riset/SEO-Scores.md (dashboard semua artikel)
 *   - Update frontmatter tiap draft di 07-Drafts/ dengan seo_score
 *
 * Usage:
 *   node scripts/obsidian/seo-score.js                # Score draft + published
 *   node scripts/obsidian/seo-score.js --drafts-only  # Hanya draft di vault
 *   node scripts/obsidian/seo-score.js --update       # Update frontmatter draft (default: ya)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const p = new PrismaClient();
const DRAFTS_DIR = path.resolve(__dirname, '../../docs/vault/07-Drafts');
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/vault/04-Topik-Riset/SEO-Scores.md');

const args = process.argv.slice(2);
const draftsOnly = args.includes('--drafts-only');
const noUpdate = args.includes('--no-update');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const fmText = match[1];
  const body = match[2];
  const frontmatter = {};
  const lines = fmText.split('\n');
  let currentArr = null;

  for (const line of lines) {
    if (line.match(/^\s*-\s+/)) {
      if (currentArr) currentArr.push(line.replace(/^\s*-\s+/, '').trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    const kvMatch = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.*)$/);
    if (!kvMatch) continue;
    const [, key, val] = kvMatch;
    if (val.trim() === '') {
      currentArr = [];
      frontmatter[key] = currentArr;
    } else if (val.trim().startsWith('[')) {
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

function stripMd(s) { return s.replace(/[#*`_~\[\]()]/g, '').replace(/\s+/g, ' ').trim(); }
function stripHtml(s) { return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }

function scoreContent({ title, seoTitle, seoDescription, excerpt, body, tags, targetKeyword, isHtml = false }) {
  const score = { total: 0, max: 100, breakdown: {} };
  const issues = [];

  const text = isHtml ? stripHtml(body) : stripMd(body);
  const lowerText = text.toLowerCase();
  const kw = (targetKeyword || '').toLowerCase().trim();
  const kwFirst = kw.split(/\s+/)[0] || '';

  // 1. Title length 50-70 char (~10 pts)
  const titleLen = (title || '').length;
  if (titleLen >= 50 && titleLen <= 70) { score.breakdown.title_length = 10; }
  else if (titleLen >= 40 && titleLen <= 80) { score.breakdown.title_length = 6; }
  else if (titleLen > 0) { score.breakdown.title_length = 3; issues.push(`Title length ${titleLen} char (ideal 50-70)`); }
  else { score.breakdown.title_length = 0; issues.push('Title kosong'); }

  // 2. seoTitle present + ideal (10 pts)
  const seoTLen = (seoTitle || '').length;
  if (seoTLen >= 50 && seoTLen <= 60) { score.breakdown.seo_title = 10; }
  else if (seoTLen >= 40 && seoTLen <= 70) { score.breakdown.seo_title = 6; }
  else if (seoTLen > 0) { score.breakdown.seo_title = 3; issues.push(`seoTitle ${seoTLen} char (ideal 50-60)`); }
  else { score.breakdown.seo_title = 0; issues.push('seoTitle kosong'); }

  // 3. seoDescription 150-155 (10 pts)
  const seoDLen = (seoDescription || '').length;
  if (seoDLen >= 145 && seoDLen <= 160) { score.breakdown.seo_desc = 10; }
  else if (seoDLen >= 120 && seoDLen <= 175) { score.breakdown.seo_desc = 6; }
  else if (seoDLen > 0) { score.breakdown.seo_desc = 3; issues.push(`seoDescription ${seoDLen} char (ideal 145-160)`); }
  else { score.breakdown.seo_desc = 0; issues.push('seoDescription kosong'); }

  // 4. Excerpt (5 pts)
  if (excerpt && excerpt.length >= 50) { score.breakdown.excerpt = 5; }
  else if (excerpt) { score.breakdown.excerpt = 2; issues.push('Excerpt terlalu pendek'); }
  else { score.breakdown.excerpt = 0; issues.push('Excerpt kosong'); }

  // 5. Keyword in title (10 pts)
  if (!kw) { score.breakdown.kw_in_title = 0; issues.push('target_keyword tidak diset'); }
  else if ((title || '').toLowerCase().includes(kw)) { score.breakdown.kw_in_title = 10; }
  else if (kwFirst && (title || '').toLowerCase().includes(kwFirst)) { score.breakdown.kw_in_title = 5; issues.push('Keyword utama tidak full di title'); }
  else { score.breakdown.kw_in_title = 0; issues.push('Keyword utama tidak ada di title'); }

  // 6. Keyword in H2 (10 pts)
  const h2Pattern = isHtml ? /<h2[^>]*>([^<]+)<\/h2>/gi : /^##\s+(.+)$/gm;
  const h2Matches = [...(body || '').matchAll(h2Pattern)].map(m => m[1].toLowerCase());
  if (!kw) { score.breakdown.kw_in_h2 = 0; }
  else if (h2Matches.some(h => h.includes(kw))) { score.breakdown.kw_in_h2 = 10; }
  else if (h2Matches.some(h => h.includes(kwFirst))) { score.breakdown.kw_in_h2 = 5; issues.push('Keyword utama tidak ada di H2'); }
  else { score.breakdown.kw_in_h2 = 0; issues.push('Tidak ada H2 dengan keyword'); }

  // 7. Keyword in first 100 words (10 pts)
  const first100 = lowerText.split(/\s+/).slice(0, 100).join(' ');
  if (!kw) { score.breakdown.kw_in_first_para = 0; }
  else if (first100.includes(kw)) { score.breakdown.kw_in_first_para = 10; }
  else if (first100.includes(kwFirst)) { score.breakdown.kw_in_first_para = 5; issues.push('Keyword utama lemah di paragraf 1'); }
  else { score.breakdown.kw_in_first_para = 0; issues.push('Keyword utama tidak ada di paragraf 1'); }

  // 8. Word count (15 pts)
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 800) { score.breakdown.word_count = 15; }
  else if (wordCount >= 500) { score.breakdown.word_count = 12; }
  else if (wordCount >= 400) { score.breakdown.word_count = 8; }
  else if (wordCount >= 200) { score.breakdown.word_count = 4; issues.push(`Word count rendah: ${wordCount} (target 500+)`); }
  else { score.breakdown.word_count = 0; issues.push(`Word count sangat rendah: ${wordCount}`); }

  // 9. Internal links count (10 pts)
  const wikilinkCount = (body || '').match(/\[\[[^\]]+\]\]/g)?.length || 0;
  const htmlLinkCount = isHtml ? ((body || '').match(/<a[^>]*href=["']\/[^"']+["']/g)?.length || 0) : 0;
  const totalLinks = wikilinkCount + htmlLinkCount;
  if (totalLinks >= 5) { score.breakdown.internal_links = 10; }
  else if (totalLinks >= 2) { score.breakdown.internal_links = 7; }
  else if (totalLinks >= 1) { score.breakdown.internal_links = 4; issues.push('Internal link < 2'); }
  else { score.breakdown.internal_links = 0; issues.push('Tidak ada internal link'); }

  // 10. Tags ≥ 3 (5 pts)
  const tagCount = (Array.isArray(tags) ? tags : []).length;
  if (tagCount >= 5) { score.breakdown.tags = 5; }
  else if (tagCount >= 3) { score.breakdown.tags = 3; }
  else if (tagCount >= 1) { score.breakdown.tags = 1; issues.push(`Tags hanya ${tagCount}`); }
  else { score.breakdown.tags = 0; issues.push('Tidak ada tags'); }

  // Bonus: FAQ structure detected (5 pts)
  const hasFaq = /^##\s+(FAQ|Frequently)/im.test(body || '') || /<h2[^>]*>\s*(FAQ|Frequently)/i.test(body || '');
  if (hasFaq) { score.breakdown.faq_bonus = 5; score.max = 105; }

  score.total = Object.values(score.breakdown).reduce((s, v) => s + v, 0);
  score.percentage = Math.round((score.total / score.max) * 100);
  score.issues = issues;
  score.wordCount = wordCount;
  score.h2Count = h2Matches.length;
  score.linkCount = totalLinks;

  return score;
}

function classifyScore(pct) {
  if (pct >= 90) return { label: '🟢 Excellent', color: 'green' };
  if (pct >= 75) return { label: '🟡 Good', color: 'yellow' };
  if (pct >= 60) return { label: '🟠 Fair', color: 'orange' };
  if (pct >= 40) return { label: '🔴 Poor', color: 'red' };
  return { label: '⚫ Critical', color: 'black' };
}

function updateDraftFrontmatter(filepath, score) {
  const content = fs.readFileSync(filepath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(content);
  frontmatter.seo_score = `${score.total}/${score.max}`;
  frontmatter.seo_score_pct = score.percentage;
  frontmatter.seo_scored_at = new Date().toISOString().slice(0, 16);

  // Build new frontmatter
  const fmLines = Object.entries(frontmatter).map(([k, v]) => {
    if (Array.isArray(v)) {
      if (v.length === 0) return `${k}: []`;
      return `${k}:\n${v.map(x => `  - ${x}`).join('\n')}`;
    }
    if (typeof v === 'string' && (v.includes(':') || v.includes('"'))) return `${k}: "${v.replace(/"/g, '\\"')}"`;
    return `${k}: ${v}`;
  });
  const newContent = `---\n${fmLines.join('\n')}\n---\n${body}`;
  fs.writeFileSync(filepath, newContent, 'utf8');
}

(async () => {
  const results = [];

  // Score drafts in vault
  if (fs.existsSync(DRAFTS_DIR)) {
    const files = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.md'));
    console.log(`Scoring ${files.length} drafts in vault...`);
    for (const f of files) {
      const filepath = path.join(DRAFTS_DIR, f);
      const content = fs.readFileSync(filepath, 'utf8');
      const { frontmatter, body } = parseFrontmatter(content);

      const score = scoreContent({
        title: frontmatter.title || f.replace('.md', ''),
        seoTitle: frontmatter.seoTitle,
        seoDescription: frontmatter.seoDescription,
        excerpt: frontmatter.excerpt,
        body,
        tags: frontmatter.tags || [],
        targetKeyword: frontmatter.target_keyword,
        isHtml: false,
      });

      results.push({
        type: 'draft',
        slug: f.replace('.md', ''),
        title: frontmatter.title || f,
        category: frontmatter.category,
        targetKeyword: frontmatter.target_keyword || '-',
        status: frontmatter.status || 'draft',
        ...score,
        link: `[[07-Drafts/${f.replace('.md', '')}]]`,
      });

      if (!noUpdate) updateDraftFrontmatter(filepath, score);
    }
    console.log(`✓ ${files.length} drafts scored${noUpdate ? '' : ' + frontmatter updated'}`);
  }

  // Score published articles in DB
  if (!draftsOnly) {
    const articles = await p.article.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true, slug: true, title: true, content: true, excerpt: true,
        seoTitle: true, seoDescription: true,
        category: { select: { name: true } },
        tags: { select: { name: true } },
      },
      take: 200,
      orderBy: { publishedAt: 'desc' },
    });
    console.log(`\nScoring ${articles.length} published articles...`);
    for (const a of articles) {
      const score = scoreContent({
        title: a.title,
        seoTitle: a.seoTitle,
        seoDescription: a.seoDescription,
        excerpt: a.excerpt,
        body: a.content,
        tags: a.tags.map(t => t.name),
        targetKeyword: a.tags[0]?.name || '', // fallback
        isHtml: true,
      });

      results.push({
        type: 'published',
        slug: a.slug,
        title: a.title.slice(0, 80),
        category: a.category?.name,
        targetKeyword: a.tags[0]?.name || '-',
        status: 'published',
        ...score,
        link: `https://jurnalishukumbandung.com/berita/${a.slug}`,
      });
    }
  }

  // Build dashboard
  const sorted = [...results].sort((a, b) => a.percentage - b.percentage);
  const drafts = sorted.filter(r => r.type === 'draft');
  const published = sorted.filter(r => r.type === 'published');

  const lines = [
    '---',
    `type: seo-scores`,
    `synced_at: ${new Date().toISOString()}`,
    `total_drafts: ${drafts.length}`,
    `total_published: ${published.length}`,
    `avg_draft: ${drafts.length ? Math.round(drafts.reduce((s, r) => s + r.percentage, 0) / drafts.length) : 0}`,
    `avg_published: ${published.length ? Math.round(published.reduce((s, r) => s + r.percentage, 0) / published.length) : 0}`,
    `tags:`,
    `  - seo-scores`,
    `  - auto-generated`,
    '---',
    '',
    '# 📊 SEO Score Dashboard',
    '',
    `> Auto-scored ${new Date().toLocaleString('id-ID')}.`,
    `> **${drafts.length}** draft + **${published.length}** published article.`,
    '',
    '## 📈 Average Score',
    '',
    `| Type | Avg | Count |`,
    `|---|---|---|`,
    `| Drafts (vault) | ${drafts.length ? Math.round(drafts.reduce((s, r) => s + r.percentage, 0) / drafts.length) : 0}% | ${drafts.length} |`,
    `| Published (DB) | ${published.length ? Math.round(published.reduce((s, r) => s + r.percentage, 0) / published.length) : 0}% | ${published.length} |`,
    '',
  ];

  // Drafts table
  lines.push('---', '', '## ✏️ Drafts di Vault', '');
  if (drafts.length === 0) {
    lines.push('_Belum ada draft di 07-Drafts/._');
  } else {
    lines.push('| Score | Status | Title | Keyword | Word | H2 | Link |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const r of drafts) {
      const cls = classifyScore(r.percentage);
      lines.push(`| ${cls.label} ${r.percentage}% | ${r.status} | ${r.title.slice(0, 50)} | \`${r.targetKeyword}\` | ${r.wordCount} | ${r.h2Count} | ${r.linkCount} |`);
    }
  }

  // Published — top 25 worst
  lines.push('', '---', '', '## 🚨 Published — 25 Score Terendah (PRIORITAS OPTIMASI)', '');
  if (published.length === 0) {
    lines.push('_Tidak ada artikel published._');
  } else {
    lines.push('| Score | Title | Category | Keyword | Word | Issues |');
    lines.push('|---|---|---|---|---|---|');
    for (const r of published.slice(0, 25)) {
      const cls = classifyScore(r.percentage);
      lines.push(`| ${cls.label} ${r.percentage}% | [${r.title}](${r.link}) | ${r.category || '-'} | \`${r.targetKeyword}\` | ${r.wordCount} | ${r.issues.slice(0, 2).join('; ')} |`);
    }
  }

  // Published — top performers
  lines.push('', '---', '', '## 🏆 Published — Top 10 Score Tertinggi', '');
  const topPublished = [...published].sort((a, b) => b.percentage - a.percentage).slice(0, 10);
  if (topPublished.length === 0) {
    lines.push('_Tidak ada artikel published._');
  } else {
    lines.push('| Score | Title | Category | Word |');
    lines.push('|---|---|---|---|');
    for (const r of topPublished) {
      const cls = classifyScore(r.percentage);
      lines.push(`| ${cls.label} ${r.percentage}% | [${r.title}](${r.link}) | ${r.category || '-'} | ${r.wordCount} |`);
    }
  }

  // Distribution
  lines.push('', '---', '', '## 📊 Distribusi Score', '');
  const buckets = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };
  for (const r of results) {
    if (r.percentage >= 90) buckets.excellent++;
    else if (r.percentage >= 75) buckets.good++;
    else if (r.percentage >= 60) buckets.fair++;
    else if (r.percentage >= 40) buckets.poor++;
    else buckets.critical++;
  }
  lines.push(`- 🟢 **Excellent (90-100%)**: ${buckets.excellent}`);
  lines.push(`- 🟡 **Good (75-89%)**: ${buckets.good}`);
  lines.push(`- 🟠 **Fair (60-74%)**: ${buckets.fair}`);
  lines.push(`- 🔴 **Poor (40-59%)**: ${buckets.poor}`);
  lines.push(`- ⚫ **Critical (<40%)**: ${buckets.critical}`);

  lines.push('', '---', '', '## 💡 Cara Pakai', '');
  lines.push('1. Fokus optimasi artikel **Poor** atau **Critical** dulu (impact tertinggi)');
  lines.push('2. Buka artikel di `/panel/artikel/[id]/edit`, perbaiki sesuai issue');
  lines.push('3. Re-run script: `node scripts/obsidian/seo-score.js`');
  lines.push('4. Submit ulang ke Google via /panel/seo setelah optimasi');
  lines.push('');
  lines.push('## 🎯 Skor Per Kriteria');
  lines.push('1. Title length (50-70 char) — 10 pts');
  lines.push('2. seoTitle ideal (50-60) — 10 pts');
  lines.push('3. seoDescription (145-160) — 10 pts');
  lines.push('4. Excerpt — 5 pts');
  lines.push('5. Keyword di title — 10 pts');
  lines.push('6. Keyword di H2 — 10 pts');
  lines.push('7. Keyword di paragraf 1 — 10 pts');
  lines.push('8. Word count ≥400/500/800 — 15 pts');
  lines.push('9. Internal links ≥2/5 — 10 pts');
  lines.push('10. Tags ≥3/5 — 5 pts');
  lines.push('Bonus: FAQ section — 5 pts');
  lines.push('');
  lines.push('## 🔗 Files Terkait');
  lines.push('- [[GSC-Insight]] · [[Rank-History]] · [[Keywords]]');

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));
  console.log(`✓ Written: ${OUTPUT_FILE}`);
  console.log(`\nDrafts avg: ${drafts.length ? Math.round(drafts.reduce((s, r) => s + r.percentage, 0) / drafts.length) : 0}%`);
  console.log(`Published avg: ${published.length ? Math.round(published.reduce((s, r) => s + r.percentage, 0) / published.length) : 0}%`);

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
