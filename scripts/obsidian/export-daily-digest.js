#!/usr/bin/env node
/**
 * Auto-generate daily editorial log dari aktivitas hari ini
 *
 * Usage:
 *   node scripts/obsidian/export-daily-digest.js                  # Hari ini
 *   node scripts/obsidian/export-daily-digest.js 2026-04-23       # Tanggal spesifik
 *   node scripts/obsidian/export-daily-digest.js --last-7-days    # 7 hari terakhir (file terpisah)
 *
 * Generate file ke 05-Editorial/Daily-Log/YYYY-MM-DD.md
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const p = new PrismaClient();
const LOG_DIR = path.resolve(__dirname, '../../docs/vault/05-Editorial/Daily-Log');

const args = process.argv.slice(2);
const last7Days = args.includes('--last-7-days');
const specificDate = args.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));

function fmtDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function fmtIndo(d) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const date = new Date(d);
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

async function generateDigest(dateStr) {
  const start = new Date(dateStr + 'T00:00:00.000Z');
  const end = new Date(dateStr + 'T23:59:59.999Z');

  const [published, drafts, sidang, comments, reports] = await Promise.all([
    p.article.findMany({
      where: { status: 'PUBLISHED', publishedAt: { gte: start, lte: end } },
      select: { title: true, slug: true, viewCount: true, category: { select: { name: true } } },
      orderBy: { publishedAt: 'desc' },
    }),
    p.article.findMany({
      where: { status: 'DRAFT', createdAt: { gte: start, lte: end } },
      select: { title: true, slug: true },
    }),
    p.courtSchedule.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { time: 'asc' },
    }),
    p.comment.count({ where: { createdAt: { gte: start, lte: end } } }),
    p.report.count({ where: { createdAt: { gte: start, lte: end } } }),
  ]);

  const md = `---
type: daily-log
date: ${dateStr}
auto_generated: true
synced_at: ${new Date().toISOString()}
tags:
  - daily-log
  - auto-generated
---

# Editorial Log — ${fmtIndo(dateStr)}

> Auto-generated dari DB pada ${new Date().toISOString().slice(0, 16)}.
> Edit manual untuk tambah catatan editorial, mood, refleksi.

## 📰 Artikel Hari Ini

### Published (${published.length})

${published.length === 0 ? '_Belum ada artikel published hari ini._' : published.map(a =>
  `- [${a.title}](https://jurnalishukumbandung.com/berita/${a.slug}) — ${a.category?.name || '-'} · ${a.viewCount} views`
).join('\n')}

### Draft Dibuat Hari Ini (${drafts.length})

${drafts.length === 0 ? '_Belum ada draft baru._' : drafts.map(d => `- ${d.title} (slug: \`${d.slug}\`)`).join('\n')}

## 🏛️ Sidang Hari Ini (${sidang.length})

${sidang.length === 0 ? '_Tidak ada sidang dijadwalkan._' : sidang.map(s =>
  `- **${s.time || '-'}** · ${s.court || '-'}: ${s.title}${s.defendant ? ` (${s.defendant})` : ''} — ${s.agenda || '-'}`
).join('\n')}

## 📊 Engagement

- Komentar masuk: **${comments}**
- Laporan masuk: **${reports}**

## 📞 Narasumber Dihubungi

| Narasumber | Untuk | Status |
|---|---|---|
|  |  |  |

_(Diisi manual)_

## 💡 Ide Artikel Besok

1.
2.
3.

## 🔥 Trending / Breaking

_(Manual: catat berita viral relevan)_

-

## 📝 Catatan Lain

_(Refleksi, learnings, ide editorial)_



---

## Wrap-up

- Total publish: **${published.length}**
- Mood: 😊 / 😐 / 😞 _(pilih)_

## Navigasi

← [[${fmtDate(new Date(start.getTime() - 86400000))}|Kemarin]] · [[${fmtDate(new Date(start.getTime() + 86400000))}|Besok]] →
`;

  return md;
}

(async () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  const dates = [];
  if (last7Days) {
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(fmtDate(d));
    }
  } else if (specificDate) {
    dates.push(specificDate);
  } else {
    dates.push(fmtDate(new Date()));
  }

  for (const dateStr of dates) {
    const filepath = path.join(LOG_DIR, `${dateStr}.md`);
    const md = await generateDigest(dateStr);
    fs.writeFileSync(filepath, md, 'utf8');
    console.log(`✓ ${dateStr}.md`);
  }

  console.log(`\n=== DONE: ${dates.length} daily log file(s) generated ===`);
  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
