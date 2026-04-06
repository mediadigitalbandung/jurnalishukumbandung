# Deploy JHB ke VPS

Deploy Jurnalis Hukum Bandung ke production VPS.

## Langkah-langkah

Jalankan langkah berikut secara berurutan. Jika ada langkah yang gagal, STOP dan laporkan error ke user.

### 1. Build lokal
Pastikan tidak ada error sebelum deploy:
```
npx next build
```
Jika build gagal, STOP — jangan deploy kode yang error.

### 2. Git commit & push
Stage semua file yang berubah (JANGAN pakai `git add -A` kalau ada `.env`), commit dengan pesan deskriptif bahasa Inggris, lalu push:
```
git add [files yang berubah]
git commit -m "feat/fix/style: deskripsi perubahan

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin master
```

### 3. Deploy ke VPS
SSH ke VPS dan deploy:
```
ssh root@145.79.15.99 "cd /var/www/jhb && git pull origin master && npm install && npm run build && pm2 restart jhb"
```

**PENTING:**
- VPS dir: `/var/www/jhb` (BUKAN `/var/www/kartawarta`)
- PM2 process: `jhb` (BUKAN `kartawarta`)
- Port: `3001`
- Domain: `jurnalishukumbandung.com`

### 4. Verifikasi
Cek PM2 status dan pastikan `jhb` online:
```
ssh root@145.79.15.99 "pm2 list"
```

Laporkan hasil ke user: berhasil atau gagal.
