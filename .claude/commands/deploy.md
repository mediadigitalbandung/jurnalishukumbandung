# Deploy — Deploy Orchestrator JHB

Gate akhir: review → test → build → commit → push → VPS deploy.
Dipanggil setelah setiap perubahan kode selesai.

## Input

$ARGUMENTS — pesan commit (opsional). Jika tidak ada, buat otomatis dari git diff.

## Alur Wajib (sequential)

```
STEP 1: Pre-deploy check
  → git status (pastikan file benar yang akan di-commit)
  → git diff (ringkasan perubahan)

STEP 2: Build lokal (BLOCKING — stop jika gagal)
  → npx next build
  → Jika GAGAL → spawn /fix-build → ulangi dari STEP 2

STEP 3: Commit & push
  → git add [files yang berubah] (JANGAN git add -A)
  → git commit -m "[pesan]"
  → git push origin master

STEP 4: VPS Deploy
  → ssh root@145.79.15.99 deploy command
  → Verifikasi pm2 status

STEP 5: Health check
  → pm2 list (jhb harus online)
  → Laporkan hasil ke user
```

## VPS Deploy Command

```bash
ssh root@145.79.15.99 "cd /var/www/jhb && git pull origin master && npm install --prefer-offline && npm run build && pm2 restart jhb"
```

**Jika SSH timeout:** Minta user jalankan di **Hostinger Terminal**:
```
cd /var/www/jhb && git pull origin master && npm install --prefer-offline && npm run build && pm2 restart jhb
```

## Commit Message Format

```
[type]: [deskripsi singkat dalam bahasa Inggris]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat` | `fix` | `style` | `refactor` | `seo` | `perf` | `docs` | `chore`

## Error Handling

| Error VPS | Solusi |
|---|---|
| `ENOTEMPTY .next/export` | `rm -rf .next` dulu, rebuild |
| `Could not find production build` | PM2 restart sebelum build — rebuild |
| SSH timeout | Minta user pakai Hostinger Terminal |
| `npm ERR! ENOSPC` | Disk penuh — `df -h`, bersihkan cache |
| PM2 `errored` setelah deploy | Cek logs: `pm2 logs jhb --lines 20` |

## Rollback (jika deploy berhasil tapi site broken)

```bash
ssh root@145.79.15.99 "cd /var/www/jhb && git log --oneline -5"
# Pilih commit yang baik, lalu:
ssh root@145.79.15.99 "cd /var/www/jhb && git reset --hard [COMMIT_HASH] && npm run build && pm2 restart jhb"
```
**KONFIRMASI USER dulu sebelum rollback.**

## VPS Info

- **IP:** `145.79.15.99`
- **App dir:** `/var/www/jhb` (BUKAN kartawarta)
- **PM2:** `jhb` (BUKAN kartawarta)
- **Port:** `3001`

## Chain dari

Dipanggil oleh: `/code`, `/fix`, `/seo`, `/style`, `/perf`, `/panel`, `/api-new`, `/db-migrate`

Setelah deploy berhasil → laporkan URL live: **https://jurnalishukumbandung.com**