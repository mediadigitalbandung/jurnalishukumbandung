# Comment — Comment System Specialist

Specialist agent untuk comment system management.

## Input

$ARGUMENTS — aksi: `config`, `article [id]`, `stats`, `spam-check`

## Tugas Spesifik

- Konfigurasi comment system (allow/disable per artikel, moderation level)
- Stats comment engagement
- Spam detection & handling
- Reply thread management

Model: `Comment`. API: `src/app/api/comments/` dan `src/app/api/articles/[id]/comments/`.

## Tidak Termasuk

- Moderasi individual per komentar → `/moderate`
- Ban user → `/users`

## Operasi

### config — Konfigurasi comment system

Settings di `systemSetting`:
```
- comment_enabled: true/false (global)
- comment_require_login: true/false
- comment_auto_approve: true/false (for trusted users)
- comment_moderation_level: strict | normal | loose
- comment_max_length: 1000 (chars)
```

### article [id] — Comment di artikel tertentu

```
GET /api/articles/[id]/comments
```
Info:
- Total comments
- Top thread (by replies)
- Moderation status breakdown
- Aktivitas 7 hari terakhir

Action per artikel:
- Disable comments (kontroversial article)
- Pinned comment (klarifikasi redaksi)
- Sort order (terbaru / top)

### stats — Engagement metrics

```
## Comment Stats — [Periode]

Total comments: X
Unique commenters: X
Avg comments per article: X.XX
Most commented article: "..." ([N] comments)

Engagement by category:
- Tipikor: X comments
- Sidang: X comments
- HAM: X comments

Sentiment (estimasi):
- Positive: X%
- Neutral: X%
- Negative: X%
```

### spam-check — Deteksi spam otomatis

Kriteria:
- Komentar dengan > 3 external links → flag
- Copy-paste pattern → flag
- Kata-kata spam commerce (judi, crypto, casino) → auto-reject
- Commenter dengan > 10 komentar dalam 1 jam → rate limit

## Anti-Abuse Features

**Rate limiting:**
- Max 5 comments per user per 10 menit
- Max 20 comments per user per jam

**Flood protection:**
- Duplicate comment dalam 5 menit → reject
- Same user, same article, > 5 komentar → slow mode

**Shadow banning:**
- Repeat offender: komentar tidak muncul buat user lain
- User sendiri masih lihat (tidak tahu di-ban)

## Comment Notification

Trigger notifikasi untuk:
- Penulis artikel: ada komentar baru di artikelnya
- Parent commenter: ada reply di thread-nya
- Admin: komentar yang di-flag

## Chain ke

- `/moderate` — moderasi komentar individual
- `/notify` — setup notifikasi ke penulis/admin
- `/analytics` — integrate engagement metrics

## Aturan

- Comments DEFAULT OFF untuk kategori sensitif (kasus anak, korban)
- Per-article override: editor bisa disable comments
- Backup comments sebelum bulk delete
- Hak jawab: komentar klarifikasi dari pihak yang disebutkan → jangan dihapus