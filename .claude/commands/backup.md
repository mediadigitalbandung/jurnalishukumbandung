# Backup — Database & Media Backup Specialist

Specialist agent untuk backup database PostgreSQL dan media files.

## Input

$ARGUMENTS — aksi: `db`, `media`, `full`, `restore [filename]`, `list`, `schedule`

## Tugas Spesifik

- Backup PostgreSQL database
- Backup media uploads
- Manage backup retention
- Restore dari backup
- Schedule automated backups

## Operasi

### db — Backup database

**Local backup:**
```bash
ssh root@145.79.15.99 "pg_dump -U postgres -h localhost -Fc jhb_db > /backups/jhb-$(date +%Y%m%d-%H%M%S).dump"
```

**Compress & remote copy:**
```bash
ssh root@145.79.15.99 "cd /backups && gzip -9 jhb-*.dump"
# Optional: copy to S3/B2/offsite
```

**Verify backup:**
```bash
ssh root@145.79.15.99 "ls -lh /backups/ | tail -5"
```

### media — Backup uploaded files

```bash
ssh root@145.79.15.99 "cd /var/www/jhb && tar -czf /backups/media-$(date +%Y%m%d).tar.gz public/uploads/"
```

### full — Full backup (DB + media)

Jalankan db + media secara paralel:
```
PARALEL:
├── DB dump
└── Media tar

SEQUENTIAL:
→ Verify both files exist
→ Log to /backups/backup-log.txt
→ Cleanup old backups (retention)
```

### restore — Restore from backup

**WARNING: Destructive operation. Konfirmasi user dulu.**

```bash
# Restore DB
ssh root@145.79.15.99 "pg_restore -U postgres -h localhost -d jhb_db -c /backups/jhb-YYYYMMDD-HHMMSS.dump"

# Restore media
ssh root@145.79.15.99 "cd /var/www/jhb && tar -xzf /backups/media-YYYYMMDD.tar.gz"
```

Langkah keselamatan:
1. Backup database SEBELUM restore (backup of backup)
2. Stop PM2: `pm2 stop jhb`
3. Run restore
4. Verify data integrity
5. Start PM2: `pm2 start jhb`

### list — Daftar backup yang ada

```bash
ssh root@145.79.15.99 "ls -lh /backups/*.dump.gz /backups/*.tar.gz | head -20"
```

Tampilkan: tanggal, ukuran, checksum (jika ada).

### schedule — Setup cron untuk auto backup

```bash
# Edit crontab
ssh root@145.79.15.99 "crontab -l"

# Tambah:
# Daily DB backup at 2 AM
0 2 * * * /root/scripts/backup-db.sh

# Weekly full backup Sunday 3 AM
0 3 * * 0 /root/scripts/backup-full.sh
```

Script di `/root/scripts/backup-db.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
pg_dump -U postgres -Fc jhb_db | gzip > /backups/jhb-$DATE.dump.gz
# Retention: keep last 14 daily
find /backups -name "jhb-*.dump.gz" -mtime +14 -delete
```

## Retention Policy

- **Daily backups**: keep 14 hari terakhir
- **Weekly backups**: keep 8 minggu terakhir (setiap Minggu)
- **Monthly backups**: keep 12 bulan terakhir (tanggal 1 tiap bulan)
- **Media**: keep 4 minggu terakhir (media besar, retensi lebih pendek)

## Offsite Backup (Recommended)

Untuk safety, copy backup ke external:
- Backblaze B2 (murah)
- AWS S3 (reliable)
- Manual: rsync ke server lain

## Pre-Deploy Backup

SEBELUM migrasi DB besar atau deploy berisiko:
```
/backup db → backup dulu
/deploy   → deploy
```

Jika deploy bermasalah → `/backup restore [filename]`.

## Chain ke

- `/db-migrate` — backup otomatis sebelum schema change
- `/deploy` — backup sebelum deploy besar
- `/vps` — backup disk space management

## Aturan

- SELALU backup sebelum operasi destructive (delete, migrate)
- Test restore procedure secara berkala (monthly)
- Jangan simpan backup di disk yang sama dengan production
- Enkripsi backup yang mengandung data sensitif
- Backup file password/secrets TERPISAH dari DB backup