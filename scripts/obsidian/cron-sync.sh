#!/bin/bash
# Cron wrapper script untuk auto-sync vault
# Jalan periodic via crontab di VPS
#
# Tugas:
#   1. Pull latest code (kalau ada update)
#   2. Run sync scripts
#   3. Commit hasil ke Git (kalau ada perubahan)
#   4. Push (gagal-graceful kalau no credentials)
#   5. Log ke /var/log/jhb-vault-cron.log

set -e
cd /var/www/jhb

LOG=/var/log/jhb-vault-cron.log
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "=== [$TIMESTAMP] Cron sync started ===" >> "$LOG"

# 1. Pull (jangan force, jangan tabrak local changes)
git pull origin master --rebase 2>&1 | tail -3 >> "$LOG" || echo "Git pull failed (continue)" >> "$LOG"

# 2. Run sync scripts
echo "--- Daily digest ---" >> "$LOG"
node scripts/obsidian/export-daily-digest.js 2>&1 | tail -5 >> "$LOG"

echo "--- Export sidang upcoming ---" >> "$LOG"
node scripts/obsidian/export-sidang.js --upcoming 2>&1 | tail -5 >> "$LOG"

echo "--- Sync keywords pull ---" >> "$LOG"
node scripts/obsidian/sync-keywords.js pull 2>&1 | tail -3 >> "$LOG"

# 3. Auto-commit kalau ada perubahan
if ! git diff --quiet docs/vault/ 2>/dev/null || ! git diff --cached --quiet docs/vault/ 2>/dev/null; then
  git config user.email "vault-bot@jurnalishukumbandung.com" 2>/dev/null || true
  git config user.name "JHB Vault Bot" 2>/dev/null || true
  git add docs/vault/
  git commit -m "vault: auto-sync $TIMESTAMP" >> "$LOG" 2>&1 || echo "Commit failed" >> "$LOG"

  # 4. Push (gagal-graceful)
  git push origin master >> "$LOG" 2>&1 || echo "Push failed (need credentials setup)" >> "$LOG"
else
  echo "No vault changes to commit" >> "$LOG"
fi

echo "=== [$TIMESTAMP] Cron sync done ===" >> "$LOG"
echo "" >> "$LOG"
