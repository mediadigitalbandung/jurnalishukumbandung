#!/usr/bin/env node
/**
 * Track posisi target keywords over time — daily/weekly snapshot.
 *
 * Append snapshot ke 04-Topik-Riset/Rank-History.md sebagai time-series data.
 * Output Dataview-compatible untuk lihat trend.
 *
 * Usage:
 *   node scripts/obsidian/track-rank.js              # Snapshot hari ini
 *   node scripts/obsidian/track-rank.js --no-append  # Override (debug)
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const p = new PrismaClient();
const OUTPUT_FILE = path.resolve(__dirname, '../../docs/vault/04-Topik-Riset/Rank-History.md');

const args = process.argv.slice(2);
const noAppend = args.includes('--no-append');

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

  if (!tokenData.access_token) throw new Error("Failed to get access token");
  return tokenData.access_token;
}

async function gscQuery(siteUrl, accessToken, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
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

function parseExistingHistory(filepath) {
  if (!fs.existsSync(filepath)) return { snapshots: [] };
  const content = fs.readFileSync(filepath, 'utf8');
  // Find ```json snapshot blocks
  const matches = content.match(/```json snapshot\s*\n([\s\S]*?)\n```/g);
  if (!matches) return { snapshots: [] };
  const snapshots = matches.map(m => {
    const json = m.replace(/```json snapshot\s*\n/, '').replace(/\n```$/, '');
    try { return JSON.parse(json); }
    catch { return null; }
  }).filter(Boolean);
  return { snapshots };
}

function buildMarkdown(snapshots, keywords, today) {
  const sortedSnaps = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const lastSnap = sortedSnaps[sortedSnaps.length - 1];
  const prevSnap = sortedSnaps[sortedSnaps.length - 2];

  const lines = [
    '---',
    `type: rank-history`,
    `last_synced: ${new Date().toISOString()}`,
    `total_snapshots: ${sortedSnaps.length}`,
    `total_keywords: ${keywords.length}`,
    `tags:`,
    `  - rank-history`,
    `  - seo-tracking`,
    `  - auto-generated`,
    '---',
    '',
    '# 📈 Rank History — Target Keywords',
    '',
    '> Snapshot harian/mingguan posisi target keyword di Google Search Console.',
    `> Total snapshot: **${sortedSnaps.length}** | Last: **${lastSnap?.date || 'N/A'}**`,
    '',
    '## 🎯 Posisi Saat Ini vs Snapshot Sebelumnya',
    '',
  ];

  if (!lastSnap) {
    lines.push('_Belum ada snapshot. Run script untuk pertama kali._');
  } else {
    lines.push(`Membandingkan snapshot **${lastSnap.date}** vs **${prevSnap?.date || 'baseline'}**.`);
    lines.push('');
    lines.push(`| Keyword | Posisi Sekarang | Posisi Sebelum | Δ | Impresi | Klik |`);
    lines.push(`|---|---|---|---|---|---|`);

    const sorted = [...lastSnap.data].sort((a, b) => a.position - b.position);
    for (const cur of sorted) {
      const prev = prevSnap?.data.find(d => d.keyword.toLowerCase() === cur.keyword.toLowerCase());
      const diff = prev ? (prev.position - cur.position).toFixed(1) : '-';
      const arrow = prev
        ? (cur.position < prev.position ? `🟢 +${diff}` : cur.position > prev.position ? `🔴 ${diff}` : '➖')
        : '🆕';
      const positionStr = cur.position ? `#${cur.position.toFixed(1)}` : 'unranked';
      const prevStr = prev ? `#${prev.position.toFixed(1)}` : '—';
      lines.push(`| \`${cur.keyword}\` | ${positionStr} | ${prevStr} | ${arrow} | ${cur.impressions || 0} | ${cur.clicks || 0} |`);
    }
  }

  // Trend chart per keyword (last 14 snapshots)
  lines.push('', '---', '', '## 📊 Trend per Keyword (14 snapshot terakhir)', '');
  const recent = sortedSnaps.slice(-14);
  if (recent.length >= 2) {
    for (const kw of keywords) {
      const positions = recent.map(s => {
        const d = s.data.find(x => x.keyword.toLowerCase() === kw.toLowerCase());
        return { date: s.date, position: d?.position };
      });
      if (positions.every(p => !p.position)) continue;

      lines.push(`### \`${kw}\``);
      lines.push('');
      const trendStr = positions.map(p => p.position ? `${p.date.slice(5)}=${p.position.toFixed(1)}` : `${p.date.slice(5)}=—`).join(' · ');
      lines.push(`Trend: ${trendStr}`);

      // Mini sparkline (basic)
      const valid = positions.filter(p => p.position);
      if (valid.length >= 2) {
        const min = Math.min(...valid.map(p => p.position));
        const max = Math.max(...valid.map(p => p.position));
        if (max - min > 0.5) {
          const direction = valid[0].position > valid[valid.length - 1].position ? '🟢 NAIK' : valid[0].position < valid[valid.length - 1].position ? '🔴 TURUN' : '➖ FLAT';
          lines.push(`Status: ${direction} (range #${min.toFixed(1)} ↔ #${max.toFixed(1)})`);
        }
      }
      lines.push('');
    }
  } else {
    lines.push('_Butuh minimal 2 snapshot untuk lihat trend. Run script tiap hari._');
  }

  // Snapshots raw data
  lines.push('---', '', '## 💾 Raw Snapshots (untuk parsing script)', '');
  lines.push('Jangan edit manual — di-append otomatis tiap run.');
  lines.push('');
  for (const snap of sortedSnaps.slice(-30)) {
    lines.push('```json snapshot');
    lines.push(JSON.stringify(snap));
    lines.push('```');
    lines.push('');
  }

  lines.push('---', '', '## 💡 Cara Pakai', '');
  lines.push('- Run otomatis tiap hari via cron (lihat `cron-sync.sh`)');
  lines.push('- Manual: `node scripts/obsidian/track-rank.js`');
  lines.push('- Snapshot disimpan di file ini (max 30 snapshot terakhir)');
  lines.push('- 🟢 = posisi naik (semakin kecil angka), 🔴 = turun, ➖ = flat, 🆕 = keyword baru');
  lines.push('');
  lines.push('## 🔗 Files Terkait');
  lines.push('- [[Keywords|Target Keywords]]');
  lines.push('- [[GSC-Insight|GSC Insight]]');

  return lines.join('\n');
}

(async () => {
  const [serviceAccountJson, siteUrl] = await Promise.all([
    getSetting('google_service_account'),
    getSetting('search_console_site_url'),
  ]);

  if (!serviceAccountJson || !siteUrl) {
    console.error('GSC credentials not configured');
    process.exit(1);
  }

  // Load active target keywords
  const targets = await p.targetKeyword.findMany({
    where: { isActive: true },
    orderBy: { keyword: 'asc' },
  });
  const targetKeywords = targets.map(k => k.keyword);
  console.log(`Tracking ${targetKeywords.length} active target keywords...`);

  // Pull last 7 days from GSC (rank tracking benchmark)
  const accessToken = await getAccessToken(serviceAccountJson);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 7);

  const queriesRes = await gscQuery(siteUrl, accessToken, {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    dimensions: ['query'],
    rowLimit: 1000,
  });

  const allQueries = (queriesRes.rows || []).map(r => ({
    keyword: r.keys[0],
    position: r.position,
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: r.ctr,
  }));

  // Match target keywords (case-insensitive substring or exact)
  const matched = targetKeywords.map(tk => {
    const lower = tk.toLowerCase();
    const exact = allQueries.find(q => q.keyword.toLowerCase() === lower);
    if (exact) return { keyword: tk, ...exact, match_type: 'exact' };
    const partial = allQueries
      .filter(q => q.keyword.toLowerCase().includes(lower))
      .sort((a, b) => b.impressions - a.impressions)[0];
    if (partial) return { keyword: tk, position: partial.position, impressions: partial.impressions, clicks: partial.clicks, match_type: `partial:${partial.keyword}` };
    return { keyword: tk, position: null, impressions: 0, clicks: 0, match_type: 'unranked' };
  });

  console.log(`Matched: ${matched.filter(m => m.position).length}/${matched.length}`);

  // Today's snapshot
  const today = new Date().toISOString().slice(0, 10);
  const newSnapshot = { date: today, data: matched };

  // Read existing
  const { snapshots } = parseExistingHistory(OUTPUT_FILE);

  // Replace existing snapshot for today (if any) or append
  const filtered = noAppend ? [] : snapshots.filter(s => s.date !== today);
  filtered.push(newSnapshot);

  // Build markdown
  const md = buildMarkdown(filtered, targetKeywords, today);

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, md);
  console.log(`✓ Written: ${OUTPUT_FILE}`);
  console.log(`Total snapshots: ${filtered.length}`);

  await p.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
