# Cron — Cron Job Management Specialist

Specialist agent untuk manage scheduled tasks dan cron jobs.

## Input

$ARGUMENTS — aksi: `list`, `status`, `run [jobname]`, `logs [jobname]`

## Tugas Spesifik

- Daftar cron jobs aktif
- Status jalan/stuck/error per job
- Manual trigger job
- Cek logs eksekusi

## Cron Jobs JHB yang Sudah Ada

Lihat `src/app/api/cron/`:

| Job | Endpoint | Schedule | Tugas |
|---|---|---|---|
| **publish** | `/api/cron/publish` | `*/5 * * * *` | Publish artikel scheduled |
| **seo-ping** | `/api/cron/seo-ping` | `0 */2 * * *` | Ping GSC untuk artikel baru |
| **auto-article** | `/api/cron/auto-article` | `0 */6 * * *` | Generate auto-artikel (jika aktif) |

## Authentication

Cron endpoints dilindungi dengan `CRON_SECRET`:
```typescript
const authHeader = request.headers.get("authorization");
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return errorResponse("Unauthorized", 401);
}
```

## Crontab VPS

Baca/edit crontab di VPS:
```bash
ssh root@145.79.15.99 "crontab -l"
```

Format crontab standard:
```cron
# Min  Hour  Day  Month  DayOfWeek  Command

# Publish scheduled articles every 5 min
*/5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://jurnalishukumbandung.com/api/cron/publish

# SEO ping every 2 hours
0 */2 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://jurnalishukumbandung.com/api/cron/seo-ping

# Auto-article (jika enabled) every 6 hours
0 */6 * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://jurnalishukumbandung.com/api/cron/auto-article

# Database backup daily at 2 AM
0 2 * * * /root/scripts/backup-db.sh

# Clean old logs weekly (Sunday 3 AM)
0 3 * * 0 find /var/log/jhb -mtime +30 -delete
```

## Operasi

### list — Daftar semua cron jobs
```bash
ssh root@145.79.15.99 "crontab -l"
```

### status — Cek status & terakhir berjalan

Query log cron:
```bash
ssh root@145.79.15.99 "grep CRON /var/log/syslog | tail -20"
```

Atau via dedicated log:
```bash
ssh root@145.79.15.99 "tail -20 /var/log/jhb-cron.log"
```

Cek via API response (setiap endpoint cron return last run info).

### run [jobname] — Manual trigger

Test cron job manual:
```bash
# Publish
curl -H "Authorization: Bearer $CRON_SECRET" https://jurnalishukumbandung.com/api/cron/publish

# SEO ping
curl -H "Authorization: Bearer $CRON_SECRET" https://jurnalishukumbandung.com/api/cron/seo-ping
```

Verify di output JSON:
```json
{ "success": true, "processed": 3, "timestamp": "..." }
```

### logs [jobname] — Lihat logs

```bash
ssh root@145.79.15.99 "grep [jobname] /var/log/jhb-cron.log | tail -30"
```

Atau PM2 logs untuk error handling:
```bash
ssh root@145.79.15.99 "pm2 logs jhb --lines 100 --nostream | grep -i cron"
```

## Troubleshooting

| Problem | Solution |
|---|---|
| Cron tidak jalan sama sekali | Cek `systemctl status cron` |
| Output ke mail (spam) | Redirect ke /dev/null: `>> /dev/null 2>&1` |
| 401 Unauthorized | Cek CRON_SECRET di env |
| Job stuck | Kill old process, cek timeout |
| Log file besar | Setup logrotate |

## Logrotate untuk Cron Logs

```
/etc/logrotate.d/jhb-cron:

/var/log/jhb-cron.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    create 644 root root
}
```

## Monitoring Cron

Jika job penting gagal, alert:
```bash
# Wrapper script dengan alert
#!/bin/bash
OUTPUT=$(curl -s -H "Authorization: Bearer $CRON_SECRET" https://jurnalishukumbandung.com/api/cron/publish)
if ! echo "$OUTPUT" | grep -q "success"; then
  # Send alert via notify
  curl -X POST https://jurnalishukumbandung.com/api/notifications \
    -d "type=admin-alert&message=Cron publish failed: $OUTPUT"
fi
```

## Chain ke

- `/api-new` — jika perlu cron endpoint baru
- `/monitor` — include cron status di health check
- `/notify` — alert jika cron gagal berulang
- `/vps` — jika cron system-level issue

## Aturan

- SELALU authenticate cron endpoints dengan CRON_SECRET
- JANGAN skip atau disable cron penting tanpa konfirmasi
- Log semua cron runs (untuk audit)
- Test cron manual sebelum enable di crontab
- Untuk cron > 5 menit, pertimbangkan background job system