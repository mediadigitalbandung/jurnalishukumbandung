#!/bin/bash
# JHB PostgreSQL daily backup script.
#
# Setup di VPS (sekali saja):
#   1. Copy file ini ke /root/scripts/backup-db.sh
#   2. chmod +x /root/scripts/backup-db.sh
#   3. mkdir -p /var/backups/jhb
#   4. Edit /root/.pgpass dengan format: host:port:db:user:password (chmod 600)
#   5. Test manual: /root/scripts/backup-db.sh
#   6. Pasang cron daily 02:00:
#        crontab -e
#        0 2 * * * /root/scripts/backup-db.sh >> /var/log/jhb-backup.log 2>&1
#
# Retention: 14 hari (daily) + Sunday otomatis disalin ke weekly/ (8 minggu).
# Offsite: TODO — bisa tambah `rclone copy /var/backups/jhb/ remote:jhb-backup/` kalau sudah set up Backblaze B2 / S3.

set -euo pipefail

DB_NAME="${DB_NAME:-jhb_production}"
DB_USER="${DB_USER:-jhb_user}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/jhb}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
WEEKLY_RETENTION="${WEEKLY_RETENTION:-8}"

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

TIMESTAMP=$(date +%Y%m%d-%H%M)
DAILY_FILE="$BACKUP_DIR/daily/jhb-$TIMESTAMP.sql.gz"

echo "[$(date)] Backup mulai → $DAILY_FILE"

# pg_dump format custom (-Fc) lebih kecil + bisa pg_restore --jobs parallel.
# Gunakan plain SQL gzip biar mudah inspect manual.
pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" \
  -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl \
  | gzip -9 > "$DAILY_FILE"

SIZE=$(du -h "$DAILY_FILE" | cut -f1)
echo "[$(date)] Backup selesai ($SIZE)"

# Verifikasi file bisa di-read sebagai gzip valid + isinya bukan kosong.
if ! gzip -t "$DAILY_FILE" 2>/dev/null; then
  echo "[$(date)] ERROR: backup file corrupt, hapus"
  rm -f "$DAILY_FILE"
  exit 1
fi
if [ ! -s "$DAILY_FILE" ]; then
  echo "[$(date)] ERROR: backup file kosong, hapus"
  rm -f "$DAILY_FILE"
  exit 1
fi

# Hari Minggu → salin ke weekly/
if [ "$(date +%u)" = "7" ]; then
  WEEKLY_FILE="$BACKUP_DIR/weekly/jhb-$(date +%Y%m%d).sql.gz"
  cp "$DAILY_FILE" "$WEEKLY_FILE"
  echo "[$(date)] Weekly snapshot → $WEEKLY_FILE"
fi

# Retention — hapus daily > N hari.
find "$BACKUP_DIR/daily" -name "jhb-*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR/weekly" -name "jhb-*.sql.gz" -mtime +"$((WEEKLY_RETENTION * 7))" -delete

echo "[$(date)] Retention pruning selesai"
echo ""

# Ringkasan
DAILY_COUNT=$(find "$BACKUP_DIR/daily" -name "jhb-*.sql.gz" | wc -l)
WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -name "jhb-*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Status: $DAILY_COUNT daily backup, $WEEKLY_COUNT weekly backup, total $TOTAL_SIZE"
