# Notify — Notification System Specialist

Specialist agent untuk sistem notifikasi JHB (in-app, email, push).

## Input

$ARGUMENTS — aksi: `send [type] [target]`, `subscribe`, `templates`, `preferences`

## Tugas Spesifik

- Kirim notifikasi (in-app, email, browser push)
- Manage notification templates
- Handle user preferences
- Trigger-based notifications

Model: `Notification`. API: `src/app/api/notifications/`.

## Tipe Notifikasi

### In-App (di panel)
- Artikel baru submitted untuk review
- Comment baru di artikel saya
- Hak jawab / koreksi
- System announcement

### Email (via SMTP)
- Welcome email (user baru)
- Password reset link
- Weekly digest (subscriber newsletter)
- Important editorial announcements

### Browser Push (service worker)
- Breaking news
- Artikel baru dari penulis favorit (jika subscribe)
- Sidang penting H-1 reminder

## Trigger-Based Notifications

| Event | Target | Channel |
|---|---|---|
| Artikel submitted | Editor | In-app |
| Artikel approved | Author | In-app + email |
| Comment di artikel saya | Author | In-app |
| Reply komentar saya | Original commenter | In-app |
| Breaking news | Subscribers | Push |
| Weekly digest | Newsletter subscribers | Email |
| Sidang H-1 (flagged) | Editor | In-app + email |
| New report on my article | Author + Editor | In-app |

## Operasi

### send — Kirim notifikasi manual

```
send breaking-news "Putusan MK: [topik]"
```
Broadcast ke semua push subscribers + newsletter.

### subscribe — Manage subscription

Newsletter:
- Subscribe via email form (/newsletter)
- Verify double opt-in
- Unsubscribe link di setiap email

Push:
- Subscribe via browser prompt
- Save endpoint di database
- Support Firefox, Chrome, Edge

### templates — Email templates

Standard templates di `src/lib/email-templates/`:
- welcome.tsx
- password-reset.tsx
- weekly-digest.tsx
- article-approved.tsx
- breaking-news.tsx

Gunakan react-email atau raw HTML dengan inline CSS.

### preferences — User notification preferences

User bisa pilih:
- Email frequency: daily / weekly / never
- Push: on/off per kategori (Tipikor, Sidang, HAM, dll)
- In-app: notification bell di panel

## Email Delivery

Check `src/lib/mailer.ts` atau setup baru:
- SMTP config di env: SMTP_HOST, SMTP_USER, SMTP_PASS
- Fallback: SendGrid, Resend, SES

Rate limit:
- Max 100 email/jam (avoid spam flag)
- Batch untuk newsletter
- Respect unsubscribe immediately

## Push Notification

Service worker di `public/sw.js`:
- Subscribe API di `/api/notifications/push/subscribe`
- Broadcast API di `/api/notifications/push/broadcast`

Payload format:
```json
{
  "title": "Breaking: [judul]",
  "body": "[excerpt pendek]",
  "icon": "/logo-jhb.png",
  "url": "/berita/[slug]"
}
```

## Chain ke

- `/email` — untuk custom email template
- `/users` — trigger welcome email saat user baru
- `/moderate` — notify user saat komentar di-reject
- `/court-schedule` — reminder sidang H-1

## Aturan

- SEMUA email WAJIB punya unsubscribe link
- Push subscription harus dari user click (bukan auto-request)
- Jangan spam — minimal interval 30 menit antar push
- Test email template di multiple clients (Gmail, Outlook, mobile)
- GDPR: simpan consent untuk subscription