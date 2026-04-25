# Vault — Obsidian Vault Orchestrator

Agent untuk operasi Obsidian vault di `docs/vault/` — knowledge base editorial JHB.

## Input

$ARGUMENTS — aksi: `sync-sidang` · `import-draft [slug]` · `pull-keywords` · `push-keywords` · `daily-log` · `status`

## Konteks Vault

- Lokasi: `docs/vault/` (Git-tracked)
- Folder: 00-Inbox, 01-Kasus, 02-Narasumber, 03-Hukum/{Pasal,Yurisprudensi}, 04-Topik-Riset, 05-Editorial/{Daily-Log,Calendar}, 06-Sidang, 07-Drafts, 08-Sosmed-Plan, 09-Templates, 99-Archive
- 9 template di `09-Templates/`
- Plugin config di `.obsidian/`
- Integration scripts di `scripts/obsidian/`

## Operasi

### sync-sidang
Pull `CourtSchedule` table → markdown di `06-Sidang/`.
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && node scripts/obsidian/export-sidang.js"
git pull origin master  # Get hasil di lokal
```

Pakai `--upcoming` untuk hanya yang akan datang.
Pakai `--force` untuk overwrite existing.

### import-draft [slug]
Push draft dari Obsidian `07-Drafts/[slug].md` → DB sebagai status DRAFT.
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && node scripts/obsidian/import-draft.js [slug]"
```

Tanpa argumen: import semua draft baru (yang belum punya `imported_at` di frontmatter).
Pakai `--dry-run` untuk preview tanpa insert.

### pull-keywords
Pull `TargetKeyword` DB → `04-Topik-Riset/Keywords.md`.
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && node scripts/obsidian/sync-keywords.js pull"
git pull origin master
```

### push-keywords
Push perubahan di Keywords.md → DB.
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && node scripts/obsidian/sync-keywords.js push"
```

### daily-log
Generate daily editorial log dari aktivitas DB.
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && node scripts/obsidian/export-daily-digest.js"
# atau --last-7-days untuk batch 7 hari
```

### narasumber [--min-mentions=N]
Pull `Source` table (narasumber dari artikel) → markdown konsolidasi di `02-Narasumber/`.
Source dengan nama mirip otomatis di-merge jadi 1 file.
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && node scripts/obsidian/export-narasumber.js"
ssh root@145.79.15.99 "cd /var/www/jhb && node scripts/obsidian/export-narasumber.js --min-mentions=3"
```

### Via Panel UI (paling mudah)
Buka `/panel/vault` di admin panel. Klik tombol Run untuk action apapun. Tidak perlu SSH.

### Cron Otomatis
Tiap 23:00 WIB cron jalan otomatis:
- daily-log (hari ini)
- export-sidang --upcoming
- sync-keywords pull
- Auto-commit + push (kalau credentials setup)

Edit cron via `crontab -e` di VPS. Script: `/var/www/jhb/scripts/obsidian/cron-sync.sh`. Log: `/var/log/jhb-vault-cron.log`.

### status
Cek status sync — apa yang beda antara DB dan vault.
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && node scripts/obsidian/sync-keywords.js status"
```

Plus: hitung file di vault, daftar draft yang belum di-import, dll.

## Alur Default (tanpa argumen)

1. Run `status` — laporkan apa yang perlu sync
2. Tanya user: mau pull/push/import yang mana?

## Aturan

- **Sync** umumnya dijalankan di VPS (DB live ada di sana)
- Setelah pull dari DB, **commit + push** ke Git supaya vault lokal user dapat update via `git pull`
- **Import draft** tidak destructive — selalu sebagai status DRAFT, user review manual di /panel/artikel
- Frontmatter `imported_at` di file draft cegah double-import
- Vault changes di-commit di branch master langsung — bukan branch terpisah

## Chain ke

- `/article-optimize` — setelah draft di-import + published, optimize SEO
- `/social` — kalau artikel published mau auto-post ke IG/FB
- `/deploy` — jika ada perubahan kode (script, dll)
