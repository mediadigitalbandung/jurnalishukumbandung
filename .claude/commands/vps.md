# VPS — Manajemen Server JHB

Operasi VPS Jurnalis Hukum Bandung: monitoring, logs, restart, troubleshoot.

## Input

$ARGUMENTS — perintah spesifik (opsional): `status`, `logs`, `restart`, `rebuild`, `clean`

## Info VPS

- **IP:** `145.79.15.99`
- **App dir:** `/var/www/jhb`
- **PM2 process:** `jhb`
- **Port:** `3001`

## Operasi

### status — Cek kondisi server
```bash
ssh root@145.79.15.99 "pm2 list && pm2 show jhb && df -h && free -m"
```

### logs — Lihat error log terbaru
```bash
ssh root@145.79.15.99 "pm2 logs jhb --lines 50 --nostream"
```

### restart — Restart aplikasi
```bash
ssh root@145.79.15.99 "pm2 restart jhb && pm2 show jhb"
```

### rebuild — Full rebuild + restart (untuk fix build error)
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && git pull origin master && rm -f tsconfig.tsbuildinfo && rm -rf .next && npm install && npm run build && pm2 restart jhb"
```

### clean — Bersihkan .next lama sebelum build
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && rm -rf .next tsconfig.tsbuildinfo && npm run build && pm2 restart jhb"
```

## Alur Default (tanpa argumen)

1. Cek `pm2 list` — apakah `jhb` berstatus `online`
2. Cek recent error logs (50 baris terakhir)
3. Cek disk space — pastikan cukup untuk build
4. Laporkan kondisi ke user

## Troubleshooting Umum

| Error | Solusi |
|---|---|
| `ENOTEMPTY .next/export` | Jalankan `clean` dulu |
| `Could not find production build` | PM2 restart sebelum build selesai — jalankan `rebuild` |
| SSH timeout | Minta user pakai **Hostinger Terminal** dan paste command |
| `Out of memory` | `pm2 restart jhb` + cek `free -m` |
| Build stuck | Cek log, kill proses, `rebuild` ulang |