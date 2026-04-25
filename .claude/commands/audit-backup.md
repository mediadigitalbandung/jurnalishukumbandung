# Audit-Backup — Backup & Disaster Recovery Audit Specialist

Audit freshness, completeness, dan recoverability backup JHB. Read-only.

## Scope

- Database backup freshness
- Media backup (uploads)
- Config backup (.env, nginx)
- Backup rotation & retention
- Offsite backup (cloud copy)
- Restore tested recently
- Recovery Point Objective (RPO) & Recovery Time Objective (RTO)

## Checklist

### CRITICAL (data loss risk)
1. **No recent DB backup** — > 24 jam tidak ada backup
2. **Backup corrupt** — backup file 0 bytes atau tidak restorable
3. **No offsite backup** — single-point-of-failure
4. **Restore never tested** — backup ada tapi tidak pernah di-verify

### HIGH
5. **Backup > 7 hari lama** — RPO terlalu besar
6. **Media uploads tidak backup** — image artikel bisa hilang
7. **No automated backup** — manual, rawan lupa
8. **Backup di server yang sama** — disk failure = total loss

### MEDIUM
9. **No retention policy** — backup menumpuk tanpa cleanup
10. **Backup tidak encrypted** — security risk jika leak
11. **No backup monitoring/alert** — silent failure
12. **Config files tidak di-backup** (.env, nginx.conf)

### LOW
13. **Single backup location** — diversifikasi storage belum ada
14. **No documentation** tentang restore procedure
15. **RTO > 1 jam** — terlalu lama recovery

## Metodologi

```bash
# 1. Check backup directory di VPS
ssh root@145.79.15.99 "ls -lh /var/backups/jhb/ 2>/dev/null || echo 'No backup dir'"

# 2. Latest DB backup age
ssh root@145.79.15.99 "find /var/backups/jhb -name '*.sql*' -mtime -1 | head -5"

# 3. Backup size distribution
ssh root@145.79.15.99 "du -sh /var/backups/jhb/* 2>/dev/null"

# 4. Backup cron job
ssh root@145.79.15.99 "crontab -l | grep -i backup"

# 5. Test restore integrity (pakai temp DB)
ssh root@145.79.15.99 "zcat /var/backups/jhb/latest.sql.gz | head -50"

# 6. Disk space availability
ssh root@145.79.15.99 "df -h /var/backups"

# 7. Offsite backup check (S3, Hostinger Backup, etc.)
# Depends on setup
```

## Output Format

```
### 📊 Backup Health
- DB backup latest: [timestamp] ([N] jam lalu)
- DB backup size: [N] MB
- DB backup count (last 7 days): [N]
- Media backup: [present/missing]
- Config backup: [present/missing]
- Offsite backup: [present/missing]
- Last restore test: [date / never]

### RPO & RTO Assessment
- Current RPO: [N hours] (target: 24h)
- Estimated RTO: [N minutes] (target: 60min)

### Backup Schedule
| Type | Schedule | Last Success | Size |
|---|---|---|---|
| DB full | daily 02:00 | today 02:03 | 45 MB |
| DB incr | hourly | 14:00 | 2 MB |
| Media | weekly | 3 days ago | 320 MB |
| Config | weekly | 3 days ago | 15 KB |

### Critical Gaps
1. No offsite backup — recommend S3/Backblaze sync
2. [...]
```

## Chain ke

- `/backup` — execute new backup
- `/vps` — fix backup cron
- `/rollback` — use backup untuk recovery
- `/audit-all` — return

## Aturan

- Backup adalah INSURANCE — test restore minimal 1x/bulan
- 3-2-1 rule: 3 copies, 2 different media, 1 offsite
- Automated > manual untuk reliability