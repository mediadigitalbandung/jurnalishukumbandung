# Rollback — Deployment Rollback Specialist

Specialist agent untuk rollback deploy yang bermasalah di VPS JHB.

## Input

$ARGUMENTS — aksi: `preview`, `to [commit-hash]`, `last-working`, `db`

## Tugas Spesifik

- Rollback kode ke commit sebelumnya
- Restore DB dari backup
- Disable feature flag
- Hot-fix deploy emergency

## Kapan Rollback vs Fix

| Situasi | Aksi |
|---|---|
| Site totally broken (500 all pages) | 🚨 Rollback IMMEDIATE |
| Fitur baru broken, lainnya OK | Disable feature flag / hot-fix |
| Performance degradation besar | Rollback, baru investigasi |
| Minor bug, tidak blocking | `/fix` — jangan rollback |
| Data corruption | Stop PM2, restore DB backup |

## Operasi

### preview — Preview rollback options

Tampilkan 10 commit terakhir dan estimasi impact:
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && git log --oneline -10"
```

Output dengan info:
```
ba6f8b8 (HEAD) fix(seo): commit missing seo-utils exports — fixes VPS build
cbb8acf seo(news): fix dates to Jakarta timezone
fe85992 feat: robust autosave for article editor
...
```

Rekomendasikan "last-working" commit berdasarkan timestamp + success deploy.

### to [commit-hash] — Rollback ke commit spesifik

**WARNING: Destructive. Konfirmasi user dulu.**

Langkah:
```bash
# 1. Backup state saat ini
ssh root@145.79.15.99 "cd /var/www/jhb && git log -1 > /tmp/pre-rollback-state.txt"

# 2. Backup DB (safety)
ssh root@145.79.15.99 "pg_dump -U postgres -Fc jhb_db > /backups/pre-rollback-$(date +%Y%m%d-%H%M%S).dump"

# 3. Stop PM2
ssh root@145.79.15.99 "pm2 stop jhb"

# 4. Hard reset ke commit
ssh root@145.79.15.99 "cd /var/www/jhb && git fetch origin && git reset --hard [COMMIT_HASH]"

# 5. Rebuild
ssh root@145.79.15.99 "cd /var/www/jhb && rm -rf .next && npm install && npm run build"

# 6. Start PM2
ssh root@145.79.15.99 "pm2 start jhb && pm2 show jhb"

# 7. Verify
curl -I https://jurnalishukumbandung.com/
```

### last-working — Auto find last-working commit

Strategi:
1. Start dari commit sebelumnya (HEAD~1)
2. Try git checkout + build
3. If build success → OK, deploy that commit
4. If build fails → go back more (HEAD~2, HEAD~3)
5. Max 10 commits back

```bash
for i in 1 2 3 4 5; do
  ssh root@145.79.15.99 "cd /var/www/jhb && git checkout HEAD~$i && npm run build"
  # check exit code
done
```

### db — Rollback database

**WARNING: Data loss possible. Konfirmasi user dulu.**

```bash
# 1. Stop PM2
ssh root@145.79.15.99 "pm2 stop jhb"

# 2. List backups
ssh root@145.79.15.99 "ls -lh /backups/jhb-*.dump.gz | tail -10"

# 3. Restore (pilih backup terbaru yang good)
ssh root@145.79.15.99 "gunzip -c /backups/jhb-YYYYMMDD-HHMMSS.dump.gz | pg_restore -U postgres -h localhost -d jhb_db -c"

# 4. Start PM2
ssh root@145.79.15.99 "pm2 start jhb"
```

## Post-Rollback Actions

Setelah rollback berhasil:

1. **Verify site**: Cek halaman utama, panel, API
2. **Notify user**: "Site kembali normal, rollback ke commit [X]"
3. **Investigate root cause**:
   - Apa yang breaking di commit terakhir?
   - Kenapa review/test tidak catch?
   - Update test suite untuk prevent next time

4. **Forward fix**:
   - Branch baru dari last-working
   - Fix issue
   - Test thoroughly
   - Deploy ulang

## Rollback Prevention

Sebelum deploy berisiko:
```
/backup db    → backup database
/test         → verify build + types
/review       → quality + security gate
/deploy       → safe deploy
```

Untuk perubahan schema besar:
- Feature flag dulu (bisa disable tanpa rollback)
- Staging environment (jika ada)
- Deploy off-peak hours (dini hari)

## Chain ke

- `/backup` — jika butuh DB restore
- `/fix` — setelah rollback, perbaiki root cause
- `/monitor` — monitor setelah rollback
- `/notify` — alert team tentang rollback

## Aturan

- KONFIRMASI user sebelum rollback (kecuali explicit "rollback sekarang")
- Backup state SEBELUM rollback (agar bisa forward lagi)
- Rollback minimal steps — 1 commit dulu, baru lebih banyak jika perlu
- Document rollback reason di git commit message next deploy
- Post-mortem wajib setelah rollback untuk prevent recurrence
- Jangan rollback DB kecuali benar-benar data corruption