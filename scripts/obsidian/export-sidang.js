#!/usr/bin/env node
/**
 * Export CourtSchedule dari DB → Markdown di docs/vault/06-Sidang/
 *
 * Usage:
 *   node scripts/obsidian/export-sidang.js
 *   node scripts/obsidian/export-sidang.js --upcoming  # Hanya yang akan datang
 *
 * Idempotent: skip file yang sudah ada (kecuali --force)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const p = new PrismaClient();
const VAULT_DIR = path.resolve(__dirname, '../../docs/vault/06-Sidang');

const args = process.argv.slice(2);
const upcomingOnly = args.includes('--upcoming');
const force = args.includes('--force');

function slugify(s) {
  return String(s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 60);
}

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function buildMarkdown(s) {
  const dateStr = fmtDate(s.date);
  const time = s.time || '';
  const fmYAML = {
    type: 'sidang-note',
    kasus: s.title || '',
    nomor_perkara: s.caseNumber || '',
    tanggal: dateStr,
    waktu: time,
    pengadilan: s.court || '',
    ruangan: s.location || '',
    agenda: s.agenda || '',
    terdakwa: s.defendant || '',
    status: s.status || 'scheduled',
    article_slug: s.articleSlug || '',
    db_id: s.id,
    created: dateStr,
    tags: ['sidang', 'auto-imported'],
  };

  const fmStr = Object.entries(fmYAML)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}:\n${v.map(x => `  - ${x}`).join('\n')}`;
      if (typeof v === 'string' && v.includes(':')) return `${k}: "${v.replace(/"/g, '\\"')}"`;
      return `${k}: ${v}`;
    })
    .join('\n');

  return `---
${fmStr}
---

# Sidang: ${s.title}

> Auto-imported dari DB pada ${new Date().toISOString().slice(0, 16)}.
> Edit manual untuk tambah catatan verbatim, kutipan, foto.

## Identitas Sidang

- **Pengadilan**: ${s.court || '-'}
- **Ruang**: ${s.location || '-'}
- **Tanggal & jam**: ${dateStr} · ${time || '-'}
- **Agenda**: ${s.agenda || '-'}
- **Terdakwa**: ${s.defendant || '-'}
- **Nomor perkara**: ${s.caseNumber || '-'}
- **Status**: ${s.status || 'scheduled'}

${s.articleSlug ? `**Artikel terkait**: https://jurnalishukumbandung.com/berita/${s.articleSlug}\n` : ''}

## Catatan Verbatim

(Diisi manual setelah hadir sidang)

## Kutipan Penting

(Diisi manual)

## Foto / Dokumentasi

(Embed gambar setelah upload)

## Hal Penting / Sudut Berita

-

## Action Items

- [ ] Tulis artikel berdasarkan sidang ini
- [ ] Wawancara lanjutan (jika perlu)

## Sumber

- DB ID: \`${s.id}\`
- Imported: ${new Date().toISOString()}
`;
}

(async () => {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
    console.log(`Created: ${VAULT_DIR}`);
  }

  const where = upcomingOnly
    ? { date: { gte: new Date() } }
    : {};

  const schedules = await p.courtSchedule.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  console.log(`Found ${schedules.length} court schedules${upcomingOnly ? ' (upcoming only)' : ''}.`);

  let created = 0, skipped = 0;
  for (const s of schedules) {
    const dateStr = fmtDate(s.date);
    const slug = slugify(s.title || s.defendant || s.id);
    const filename = `${dateStr}-${slug}.md`;
    const filepath = path.join(VAULT_DIR, filename);

    if (fs.existsSync(filepath) && !force) {
      skipped++;
      continue;
    }

    fs.writeFileSync(filepath, buildMarkdown(s), 'utf8');
    console.log(`✓ ${filename}`);
    created++;
  }

  console.log(`\n=== DONE: ${created} created, ${skipped} skipped (already exists) ===`);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
