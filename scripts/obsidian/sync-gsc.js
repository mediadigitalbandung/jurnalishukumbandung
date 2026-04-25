#!/usr/bin/env node
/**
 * Sync Google Search Console data → Obsidian vault
 *
 * Output: 04-Topik-Riset/GSC-Insight.md dengan kategori:
 *  - 🏆 TOP 3 — keyword di posisi #1-3 (current wins)
 *  - 🥇 PAGE 1 — posisi #4-10 (sudah bagus, bisa lebih tinggi)
 *  - 🎯 OPPORTUNITY — posisi #11-30 dengan impresi >= 50 (rank 1 candidate)
 *  - ⚠️  LOW CTR — posisi top 10 tapi CTR < expected (judul/meta perlu revisi)
 *  - 📍 PAGE 2-3 — posisi #11-30 (semua, untuk monitoring)
 *  - 🔭 DEEP — posisi >30 (need optimasi besar atau drop)
 *
 * Usage:
 *   node scripts/obsidian/sync-gsc.js              # Last 28 days
 *   node scripts/obsidian/sync-gsc.js --days=90    # Last 90 days
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const p = new PrismaClient();
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/vault/04-Topik-Riset/GSC-Insight.md');

const args = process.argv.slice(2);
const daysArg = args.find(a => a.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1]) : 28;

// Expected CTR by position (industry benchmark, Advanced Web Ranking 2023-2024)
const EXPECTED_CTR = {
  1: 39.8, 2: 18.7, 3: 10.2, 4: 7.2, 5: 5.1,
  6: 4.4, 7: 3.0, 8: 2.1, 9: 1.9, 10: 1.6,
};

async function getSetting(key) {
  const s = await p.systemSetting.findUnique({ where: { key } });
  return s?.value ?? null;
}

async function getAccessToken(serviceAccountJson) {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })).toString("base64url");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key, "base64url");

  const jwt = `${header}.${payload}.${sig}`;

  const tokenData = await new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString();

    const req = https.request("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(data.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  if (!tokenData.access_token) throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  return tokenData.access_token;
}

async function gscQuery(siteUrl, accessToken, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(data.slice(0, 200))); }
      });
    });
    req.on("error", reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

function fmtPct(n) { return (n * 100).toFixed(1) + '%'; }
function fmtNum(n) { return n.toLocaleString("id-ID"); }
function fmtPos(n) { return '#' + n.toFixed(1); }

(async () => {
  const [serviceAccountJson, siteUrl] = await Promise.all([
    getSetting('google_service_account'),
    getSetting('search_console_site_url'),
  ]);

  if (!serviceAccountJson || !siteUrl) {
    console.error('GSC credentials not configured (google_service_account / search_console_site_url)');
    process.exit(1);
  }

  console.log(`Fetching GSC data: ${siteUrl} (last ${days} days)...`);
  const accessToken = await getAccessToken(serviceAccountJson);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr = endDate.toISOString().slice(0, 10);

  // Fetch top 1000 queries
  const queriesRes = await gscQuery(siteUrl, accessToken, {
    startDate: startStr,
    endDate: endStr,
    dimensions: ['query'],
    rowLimit: 1000,
  });

  const queries = (queriesRes.rows || []).map(r => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));

  console.log(`Got ${queries.length} queries.`);

  // Categorize
  const top3 = queries.filter(q => q.position >= 1 && q.position <= 3).sort((a, b) => b.clicks - a.clicks);
  const page1 = queries.filter(q => q.position > 3 && q.position <= 10).sort((a, b) => b.clicks - a.clicks);
  const opportunity = queries.filter(q => q.position > 10 && q.position <= 30 && q.impressions >= 50).sort((a, b) => b.impressions - a.impressions);
  const page23 = queries.filter(q => q.position > 10 && q.position <= 30).sort((a, b) => a.position - b.position);
  const deep = queries.filter(q => q.position > 30).sort((a, b) => b.impressions - a.impressions);

  // Low CTR: posisi top 10 tapi CTR < 50% expected
  const lowCtr = queries
    .filter(q => q.position <= 10 && q.position >= 1)
    .filter(q => {
      const expected = EXPECTED_CTR[Math.round(q.position)] || 1;
      return (q.ctr * 100) < (expected * 0.5) && q.impressions >= 30;
    })
    .sort((a, b) => b.impressions - a.impressions);

  // Build markdown
  const now = new Date().toISOString();
  const lines = [
    '---',
    `type: gsc-insight`,
    `synced_at: ${now}`,
    `period: last-${days}-days (${startStr} → ${endStr})`,
    `total_queries: ${queries.length}`,
    `top_3: ${top3.length}`,
    `page_1: ${page1.length}`,
    `opportunity: ${opportunity.length}`,
    `low_ctr: ${lowCtr.length}`,
    `page_2_3: ${page23.length}`,
    `deep: ${deep.length}`,
    `tags:`,
    `  - gsc`,
    `  - seo-insight`,
    `  - auto-generated`,
    '---',
    '',
    `# 🔍 GSC Insight — ${days} Hari Terakhir`,
    '',
    `> Auto-synced ${new Date(now).toLocaleString('id-ID')} dari Google Search Console.`,
    `> Periode: **${startStr}** → **${endStr}** (${days} hari)`,
    '',
    '## 📊 Ringkasan',
    '',
    `| Kategori | Jumlah | Aksi |`,
    `|---|---|---|`,
    `| 🏆 **Top 3** (posisi #1-3) | **${top3.length}** | Maintain — internal link, refresh content |`,
    `| 🥇 **Page 1** (posisi #4-10) | **${page1.length}** | Push to top 3 — improve title/meta CTR |`,
    `| 🎯 **OPPORTUNITY** (posisi #11-30, impresi ≥50) | **${opportunity.length}** | **PRIORITAS HARI INI** — optimasi konten |`,
    `| ⚠️ **Low CTR** (top 10 dengan CTR rendah) | **${lowCtr.length}** | Revisi seoTitle + seoDescription |`,
    `| 📍 **Page 2-3** (posisi #11-30 semua) | ${page23.length} | Monitor + optimasi bertahap |`,
    `| 🔭 **Deep** (posisi >30) | ${deep.length} | Bahan riset / drop strategy |`,
    '',
    '---',
    '',
    '## 🎯 QUICK WINS — Optimasi Hari Ini',
    '',
    `Keyword di posisi #11-30 dengan **impresi ≥50** dalam ${days} hari terakhir. Ini "buah yang siap dipetik" — sedikit usaha = naik ke page 1.`,
    '',
  ];

  if (opportunity.length === 0) {
    lines.push('_Tidak ada keyword di kategori ini saat ini._');
  } else {
    lines.push(`| Keyword | Posisi | Impresi | Klik | CTR | Saran |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const q of opportunity.slice(0, 25)) {
      const action = q.position <= 15 ? 'Tambah internal link, expand konten' : 'Optimasi keyword density + H2 + judul';
      lines.push(`| \`${q.query}\` | ${fmtPos(q.position)} | ${fmtNum(q.impressions)} | ${q.clicks} | ${fmtPct(q.ctr)} | ${action} |`);
    }
  }

  lines.push('', '---', '', '## 🏆 TOP 3 — Posisi #1-3 (Current Wins)', '');
  if (top3.length === 0) {
    lines.push('_Belum ada keyword di top 3._');
  } else {
    lines.push(`| Keyword | Posisi | Klik | Impresi | CTR |`);
    lines.push(`|---|---|---|---|---|`);
    for (const q of top3.slice(0, 50)) {
      lines.push(`| \`${q.query}\` | ${fmtPos(q.position)} | ${fmtNum(q.clicks)} | ${fmtNum(q.impressions)} | ${fmtPct(q.ctr)} |`);
    }
  }

  lines.push('', '---', '', '## 🥇 PAGE 1 — Posisi #4-10 (Push to Top 3)', '');
  if (page1.length === 0) {
    lines.push('_Belum ada keyword di posisi 4-10._');
  } else {
    lines.push(`| Keyword | Posisi | Klik | Impresi | CTR |`);
    lines.push(`|---|---|---|---|---|`);
    for (const q of page1.slice(0, 50)) {
      lines.push(`| \`${q.query}\` | ${fmtPos(q.position)} | ${fmtNum(q.clicks)} | ${fmtNum(q.impressions)} | ${fmtPct(q.ctr)} |`);
    }
  }

  lines.push('', '---', '', '## ⚠️ LOW CTR — Top 10 dengan CTR Rendah', '');
  lines.push('Keyword di top 10 tapi CTR < 50% dari benchmark. Berarti judul/meta-deskripsi kurang menarik.');
  lines.push('');
  if (lowCtr.length === 0) {
    lines.push('_Tidak ada keyword dengan CTR rendah anomali._');
  } else {
    lines.push(`| Keyword | Posisi | Impresi | CTR Aktual | CTR Expected | Aksi |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const q of lowCtr.slice(0, 30)) {
      const expected = EXPECTED_CTR[Math.round(q.position)] || 1;
      lines.push(`| \`${q.query}\` | ${fmtPos(q.position)} | ${fmtNum(q.impressions)} | ${fmtPct(q.ctr)} | ${expected.toFixed(1)}% | Revisi seoTitle + seoDescription |`);
    }
  }

  lines.push('', '---', '', '## 📍 PAGE 2-3 — Posisi #11-30 (All)', '');
  if (page23.length === 0) {
    lines.push('_Belum ada keyword di page 2-3._');
  } else {
    lines.push(`<details><summary>${page23.length} keyword (klik untuk buka)</summary>`, '');
    lines.push(`| Keyword | Posisi | Impresi | Klik | CTR |`);
    lines.push(`|---|---|---|---|---|`);
    for (const q of page23) {
      lines.push(`| \`${q.query}\` | ${fmtPos(q.position)} | ${fmtNum(q.impressions)} | ${q.clicks} | ${fmtPct(q.ctr)} |`);
    }
    lines.push('', '</details>');
  }

  lines.push('', '---', '', '## 🔭 DEEP — Posisi >30 (Top 30 by Impresi)', '');
  if (deep.length === 0) {
    lines.push('_Tidak ada keyword di posisi >30._');
  } else {
    lines.push(`<details><summary>${deep.length} keyword (klik untuk buka)</summary>`, '');
    lines.push(`| Keyword | Posisi | Impresi | Klik |`);
    lines.push(`|---|---|---|---|`);
    for (const q of deep.slice(0, 50)) {
      lines.push(`| \`${q.query}\` | ${fmtPos(q.position)} | ${fmtNum(q.impressions)} | ${q.clicks} |`);
    }
    lines.push('', '</details>');
  }

  lines.push('', '---', '', '## 💡 Cara Pakai', '');
  lines.push('1. **Pagi**: buka file ini → fokus section 🎯 OPPORTUNITY');
  lines.push('2. Pilih 1-3 keyword dengan impresi tertinggi');
  lines.push('3. Cari artikel terkait di `/panel/artikel` → optimasi:');
  lines.push('   - Pastikan keyword di seoTitle, seoDescription, H1, H2, paragraf 1');
  lines.push('   - Tambah internal link dari artikel cluster');
  lines.push('   - Update featured image alt text');
  lines.push('4. Submit ulang ke Google Indexing API via /panel/seo');
  lines.push('5. Re-sync besok untuk lihat dampaknya');
  lines.push('');
  lines.push('## 🔗 Files Terkait');
  lines.push('- [[Keywords|Target Keywords (sync DB ↔ vault)]]');
  lines.push('- [[Dashboard-Editorial|Dashboard Editorial]]');
  lines.push('- [[Rank-History|Rank History (snapshot harian)]]');
  lines.push('');

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));
  console.log(`✓ Written: ${OUTPUT_FILE}`);
  console.log(`\n=== SUMMARY ===`);
  console.log(`Top 3: ${top3.length}, Page 1: ${page1.length}`);
  console.log(`Opportunity (PRIORITAS): ${opportunity.length}`);
  console.log(`Low CTR (revisi judul): ${lowCtr.length}`);
  console.log(`Page 2-3: ${page23.length}, Deep: ${deep.length}`);

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
