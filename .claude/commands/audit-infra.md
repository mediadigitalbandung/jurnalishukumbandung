# Audit-Infra — Infrastructure Audit Specialist

Deep audit VPS, PM2, resources, uptime, logs. Read-only.

## Scope

- VPS resources (CPU, RAM, disk)
- PM2 processes status
- Nginx/reverse proxy config
- Uptime & restart frequency
- System logs (journalctl, PM2 logs)
- Cron jobs
- Firewall & ports
- SSL certificates expiry

## Checklist

### CRITICAL
1. **Disk > 90%** — imminent failure
2. **RAM > 90% used** consistently
3. **PM2 process stopped/errored**
4. **SSL cert expires < 14 days**
5. **Port 3001 tidak listen**

### HIGH
6. **High restart count** (PM2 restarted > 10x per hari)
7. **Log file > 500MB** — rotation missing
8. **Error log flood** — > 100 errors per jam
9. **CPU load avg > cores × 1.5**
10. **Failed cron jobs**

### MEDIUM
11. **Outdated OS packages** (apt update available)
12. **Unused ports open**
13. **Firewall rule inconsistency**
14. **SSH on port 22** (should be non-default untuk security)

### LOW
15. **No log rotation configured**
16. **PM2 memory limit not set**
17. **Old deployments** di `/var/www/` belum dihapus

## Metodologi

```bash
# VPS health (via SSH)
ssh root@145.79.15.99 "df -h /var/www"
ssh root@145.79.15.99 "free -h"
ssh root@145.79.15.99 "uptime"
ssh root@145.79.15.99 "pm2 list"
ssh root@145.79.15.99 "pm2 info jhb"
ssh root@145.79.15.99 "systemctl status nginx"
ssh root@145.79.15.99 "journalctl -u nginx --since '1 hour ago' | tail -50"

# Log size
ssh root@145.79.15.99 "du -sh /var/www/jhb/logs/* ~/.pm2/logs/*"

# SSL expiry
ssh root@145.79.15.99 "certbot certificates"

# Cron jobs
ssh root@145.79.15.99 "crontab -l"

# Open ports
ssh root@145.79.15.99 "ss -tulpn | grep LISTEN"

# Apt updates
ssh root@145.79.15.99 "apt list --upgradable 2>/dev/null | head -20"
```

## Output Format

```
### 📊 Infra Metrics
- CPU load: [X.XX] (cores: [N])
- RAM: [X]GB used / [Y]GB total
- Disk: [X]GB used / [Y]GB ([Z]%)
- Uptime: [X days]
- PM2 restarts (24h): [N]
- SSL expiry: [date]
- Log size: [N] MB

### Services Status
| Service | Status | Memory | Restarts |
|---|---|---|---|
| jhb (PM2) | online | 450MB | 3 |
| nginx | active | - | 0 |
| postgresql | active | 200MB | 0 |
```

## Chain ke

- `/vps` — execute fixes
- `/rollback` — jika service down setelah deploy
- `/cron` — fix cron issues
- `/backup` — jika disk low, cleanup old backups
- `/audit-all` — return