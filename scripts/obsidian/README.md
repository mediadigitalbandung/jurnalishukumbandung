# Scripts Obsidian Vault Integration

Script Node.js untuk jembatani Obsidian vault (`docs/vault/`) ↔ JHB Database.

## 📋 Daftar Script

| Script | Arah | Fungsi |
|---|---|---|
| [export-sidang.js](export-sidang.js) | DB → Vault | Pull `CourtSchedule` → buat markdown di `06-Sidang/` |
| [import-draft.js](import-draft.js) | Vault → DB | Read `07-Drafts/*.md` → POST artikel sebagai DRAFT |
| [sync-keywords.js](sync-keywords.js) | Bidirectional | Sync `TargetKeyword` ↔ `04-Topik-Riset/Keywords.md` |
| [export-daily-digest.js](export-daily-digest.js) | DB → Vault | Auto-generate daily editorial log |

## 🚀 Cara Pakai

### Lokal (development)

```bash
cd "<repo-jhb>"
node scripts/obsidian/export-sidang.js
node scripts/obsidian/import-draft.js
node scripts/obsidian/sync-keywords.js pull
node scripts/obsidian/export-daily-digest.js
```

> ⚠️ Lokal tidak punya akses langsung ke DB Supabase. Pakai SSH ke VPS untuk eksekusi.

### Production (VPS)

```bash
ssh root@145.79.15.99
cd /var/www/jhb

# Pull jadwal sidang ke vault
node scripts/obsidian/export-sidang.js
# → file masuk ke docs/vault/06-Sidang/

# Pull semua keyword DB ke Keywords.md
node scripts/obsidian/sync-keywords.js pull

# Generate daily log hari ini
node scripts/obsidian/export-daily-digest.js
node scripts/obsidian/export-daily-digest.js --last-7-days  # 7 hari sekaligus

# Import draft yang ditulis di Obsidian
node scripts/obsidian/import-draft.js               # semua file di 07-Drafts/
node scripts/obsidian/import-draft.js my-slug       # 1 file spesifik
node scripts/obsidian/import-draft.js --dry-run     # preview

# Push keyword baru di vault ke DB
node scripts/obsidian/sync-keywords.js push
```

Setelah eksekusi di VPS, **commit + push** vault changes:

```bash
git add docs/vault/
git commit -m "vault: sync from DB"
git push origin master
```

Lalu di local: `git pull` untuk dapat update vault.

## 🔄 Cron Otomatisasi (Opsional)

Edit crontab di VPS:

```bash
crontab -e
```

Tambahkan:

```cron
# Daily log auto-generate jam 23:00 WIB (16:00 UTC)
0 16 * * * cd /var/www/jhb && node scripts/obsidian/export-daily-digest.js > /tmp/jhb-daily-digest.log 2>&1

# Pull sidang upcoming setiap pagi jam 06:00 WIB (23:00 UTC)
0 23 * * * cd /var/www/jhb && node scripts/obsidian/export-sidang.js --upcoming > /tmp/jhb-sidang.log 2>&1
```

Setelah cron generate, jangan lupa commit + push (atau pakai post-cron hook untuk auto-commit).

## 📥 Workflow Tulis di Obsidian → Push ke JHB

1. **Di Obsidian**: New file di `07-Drafts/<slug-artikel>.md`
2. **Pakai template artikel** (Templater auto-fill)
3. **Isi frontmatter** wajib: `slug`, `title`, `category`, `excerpt`, `seoTitle`, `seoDescription`, `tags`
4. **Tulis konten** dalam markdown
5. **Save** di Obsidian
6. **Commit + push** vault changes ke Git
7. **SSH ke VPS**, run:
   ```bash
   cd /var/www/jhb
   git pull origin master
   node scripts/obsidian/import-draft.js <slug>
   ```
8. Artikel masuk DB sebagai DRAFT
9. Login `/panel/artikel`, review, klik **Publish** → live

## 🛡️ Catatan Penting

### Idempotency
- `export-sidang.js`: skip file yang sudah ada (kecuali `--force`)
- `import-draft.js`: tandai file dengan `imported_at` di frontmatter — skip kalau sudah pernah import
- `sync-keywords.js push`: hanya add/activate/deactivate, tidak duplicate
- `export-daily-digest.js`: overwrite file kalau sudah ada (auto-generate, tidak masalah)

### Error Handling
- Semua script exit code 1 kalau error
- Log ke stdout untuk dilihat manual atau di pipe ke file
- Tidak ada destructive ops — DELETE kasus, narasumber, artikel TIDAK pernah dilakukan otomatis

### Validasi Frontmatter
- `import-draft.js` akan reject file tanpa: `slug`, `title`
- Field optional: `category` (fallback ke first), `tags` (boleh kosong)

### Markdown → HTML
- Conversion sederhana di `import-draft.js` (h1-h3, bold, italic, blockquote, link)
- Wikilink `[[...]]` di-strip jadi text biasa (artikel publish tidak punya context vault)
- Untuk konversi lebih complex (image embed, table), edit manual di `/panel/artikel/[id]/edit` setelah import

## 🐛 Troubleshooting

| Error | Penyebab | Solusi |
|---|---|---|
| `No active SUPER_ADMIN user` | DB tidak ada user role admin aktif | Buat user di `/panel/pengguna` |
| `Slug "X" sudah dipakai` | Conflict dengan artikel existing | Ubah slug di frontmatter, atau update artikel existing manual |
| `No category in DB` | DB kategori kosong | Buat kategori di `/panel/kategori` |
| `Already imported` | File sudah pernah di-import | Pakai `--force` untuk re-import |
| Prisma connection error | DB env tidak loaded | Jalankan dari `/var/www/jhb` (load .env), atau export DATABASE_URL manual |
