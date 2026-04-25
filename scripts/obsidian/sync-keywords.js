#!/usr/bin/env node
/**
 * Sync TargetKeyword DB ↔ Obsidian vault Keywords.md
 *
 * Usage:
 *   node scripts/obsidian/sync-keywords.js pull   # DB → vault (overwrite Keywords.md)
 *   node scripts/obsidian/sync-keywords.js push   # Vault → DB (insert keyword baru)
 *   node scripts/obsidian/sync-keywords.js status # Compare diff, no action
 *
 * Format Keywords.md:
 *   # Target Keywords
 *
 *   ## Aktif
 *   - keyword 1
 *   - keyword 2
 *   - #tag-untuk-grouping
 *
 *   ## Nonaktif
 *   - keyword lama
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const p = new PrismaClient();
const KEYWORDS_FILE = path.resolve(__dirname, '../../docs/vault/04-Topik-Riset/Keywords.md');

const action = process.argv[2];
if (!['pull', 'push', 'status'].includes(action)) {
  console.log('Usage: node sync-keywords.js [pull|push|status]');
  process.exit(1);
}

function buildMarkdown(active, inactive) {
  return `---
type: keywords-sync
synced_at: ${new Date().toISOString()}
total_active: ${active.length}
total_inactive: ${inactive.length}
---

# Target Keywords

> Sinkronisasi 2 arah dengan TargetKeyword DB.
> Ubah file ini, lalu jalankan: \`node scripts/obsidian/sync-keywords.js push\`
> Pull terbaru dari DB: \`node scripts/obsidian/sync-keywords.js pull\`

**Last sync**: ${new Date().toISOString()}

## Aktif (${active.length})

${active.map(k => `- ${k.keyword}${k.notes ? ` — _${k.notes}_` : ''}`).join('\n')}

## Nonaktif (${inactive.length})

${inactive.map(k => `- ${k.keyword}`).join('\n')}

---

## Cara Tambah Keyword Baru

1. Edit section **Aktif** di atas, tambah baris baru: \`- keyword baru\`
2. Save file
3. Run: \`node scripts/obsidian/sync-keywords.js push\`
4. Keyword baru akan masuk DB sebagai \`isActive=true\`

## Cara Nonaktifkan Keyword

1. Pindahkan dari **Aktif** ke **Nonaktif** (cut/paste manual)
2. Run \`push\`
3. DB akan di-update isActive=false
`;
}

function parseMarkdown(content) {
  // Parse Aktif & Nonaktif sections
  const lines = content.split('\n');
  let section = null;
  const result = { active: [], inactive: [] };
  for (const line of lines) {
    if (/^##\s+Aktif/i.test(line)) section = 'active';
    else if (/^##\s+Nonaktif/i.test(line)) section = 'inactive';
    else if (/^##\s+/i.test(line)) section = null;
    else if (section && line.match(/^-\s+/)) {
      const kw = line.replace(/^-\s+/, '').split(' — ')[0].trim();
      if (kw && !kw.startsWith('#') && !kw.startsWith('//')) {
        result[section].push(kw);
      }
    }
  }
  return result;
}

(async () => {
  if (action === 'pull' || action === 'status') {
    const all = await p.targetKeyword.findMany({ orderBy: { keyword: 'asc' } });
    const active = all.filter(k => k.isActive);
    const inactive = all.filter(k => !k.isActive);

    console.log(`DB has ${active.length} active + ${inactive.length} inactive keywords.`);

    if (action === 'pull') {
      fs.mkdirSync(path.dirname(KEYWORDS_FILE), { recursive: true });
      fs.writeFileSync(KEYWORDS_FILE, buildMarkdown(active, inactive), 'utf8');
      console.log(`✓ Written: ${KEYWORDS_FILE}`);
    } else {
      // status — compare with file
      if (!fs.existsSync(KEYWORDS_FILE)) {
        console.log(`File not found: ${KEYWORDS_FILE}. Run 'pull' first.`);
        await p.$disconnect();
        return;
      }
      const fileContent = fs.readFileSync(KEYWORDS_FILE, 'utf8');
      const parsed = parseMarkdown(fileContent);
      const dbKeywords = new Set(all.map(k => k.keyword.toLowerCase()));
      const fileKeywords = new Set([...parsed.active, ...parsed.inactive].map(k => k.toLowerCase()));

      const onlyInFile = [...fileKeywords].filter(k => !dbKeywords.has(k));
      const onlyInDb = [...dbKeywords].filter(k => !fileKeywords.has(k));

      console.log('\n=== STATUS ===');
      console.log(`File only (akan ditambah saat push): ${onlyInFile.length}`);
      onlyInFile.forEach(k => console.log(`  + ${k}`));
      console.log(`DB only (akan ditambah ke file saat pull): ${onlyInDb.length}`);
      onlyInDb.forEach(k => console.log(`  - ${k}`));
    }
  }

  if (action === 'push') {
    if (!fs.existsSync(KEYWORDS_FILE)) {
      console.log(`File not found: ${KEYWORDS_FILE}. Run 'pull' first to seed.`);
      process.exit(1);
    }
    const fileContent = fs.readFileSync(KEYWORDS_FILE, 'utf8');
    const parsed = parseMarkdown(fileContent);

    let added = 0, activated = 0, deactivated = 0;

    // Active section → upsert isActive=true
    for (const kw of parsed.active) {
      const existing = await p.targetKeyword.findUnique({ where: { keyword: kw } });
      if (existing) {
        if (!existing.isActive) {
          await p.targetKeyword.update({ where: { id: existing.id }, data: { isActive: true } });
          activated++;
        }
      } else {
        await p.targetKeyword.create({ data: { keyword: kw, isActive: true, source: 'obsidian' } });
        added++;
      }
    }

    // Inactive section → set isActive=false
    for (const kw of parsed.inactive) {
      const existing = await p.targetKeyword.findUnique({ where: { keyword: kw } });
      if (existing && existing.isActive) {
        await p.targetKeyword.update({ where: { id: existing.id }, data: { isActive: false } });
        deactivated++;
      }
    }

    console.log(`\n=== PUSH DONE ===`);
    console.log(`Added: ${added}, Activated: ${activated}, Deactivated: ${deactivated}`);
  }

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
