# Monitor — Health Check Orchestrator

Full health check: VPS + aplikasi + SEO + konten. Spawn checks secara paralel.

## Input

$ARGUMENTS — area spesifik (opsional): `vps`, `seo`, `content`, `errors`, `full`

## Spawn Pattern

### Full Health Check (default)

**Spawn checks PARALEL:**
```
PARALEL:
├── VPS Check     → pm2 status, disk, memory, uptime
├── Error Check   → PM2 logs, recent errors
└── Content Check → artikel terbaru, draft pending, auto-article status
```

Sequential setelah paralel:
```
SEQUENTIAL (butuh hasil dari atas):
→ SEO Status Check (GSC connection, sitemap status)
→ Compile laporan
→ Tentukan action items
```

## Check Detail per Area

### VPS Check
```bash
ssh root@145.79.15.99 "pm2 list && echo '---' && df -h / && echo '---' && free -m && echo '---' && uptime"
```
Threshold:
- Disk: WARN jika > 80%, CRITICAL jika > 90%
- Memory: WARN jika free < 200MB
- PM2 restarts: WARN jika > 5 kali hari ini

### Error Check
```bash
ssh root@145.79.15.99 "pm2 logs jhb --lines 50 --nostream 2>&1 | grep -iE 'error|warn|failed|crash' | tail -20"
```
Klasifikasi error:
- Build error → delegate `/fix-build`
- Runtime error → delegate `/fix-runtime`
- DB error → delegate ke `/fix-runtime` (Prisma section)

### Content Check
Cek via API:
```
GET /api/articles?status=PUBLISHED&limit=1&orderBy=publishedAt
→ Apakah ada artikel baru dalam 24 jam?

GET /api/articles?status=DRAFT&limit=10
→ Berapa draft tertunda?
```

### SEO Status
```
GET /api/seo/status
→ GSC credentials valid?
→ Last ping berhasil?
```

## Dashboard Report

```
╔══════════════════════════════════════╗
║     JHB HEALTH DASHBOARD             ║
╠══════════════════════════════════════╣
║ 🖥️  VPS                              ║
║   Status: ✅ Online                  ║
║   Uptime: X hari X jam               ║
║   Disk:   XX% used (XX GB free)      ║
║   Memory: XX MB free                 ║
║   PM2:    ✅ jhb running (X restarts)║
╠══════════════════════════════════════╣
║ ⚠️  ERRORS (last 24h)                ║
║   [error summary atau "None found"]  ║
╠══════════════════════════════════════╣
║ 📄 CONTENT                           ║
║   Artikel terbaru: X jam lalu        ║
║   Draft pending: X artikel           ║
║   Auto-article: aktif/nonaktif       ║
╠══════════════════════════════════════╣
║ 🔍 SEO                               ║
║   GSC: ✅/❌ terhubung               ║
║   Last ping: X jam lalu              ║
╚══════════════════════════════════════╝

🎯 ACTION ITEMS:
1. [aksi yang perlu dilakukan jika ada]
```

## Auto-Chain Berdasarkan Hasil

| Temuan | Otomatis Spawn |
|---|---|
| PM2 down | `/vps restart` |
| Disk > 90% | `/vps` + `/clean media` |
| Build corrupt | `/vps rebuild` |
| Error berulang | `/fix-runtime` |
| TypeScript error di log | `/fix-build` |
| Tidak ada artikel 48h | Ingatkan user |
| Draft > 10 | Ingatkan user |

## Aturan

- Jangan auto-deploy atau auto-fix tanpa konfirmasi user
- Hanya ingatkan dan rekomendasikan — keputusan ada di user
- Jika SSH timeout, instruksikan user pakai Hostinger Terminal