# Social — Orchestrator Media Sosial JHB

Agent utama yang mengkoordinasikan semua aktivitas media sosial JHB.
Mendelegasikan ke specialist agents sesuai kebutuhan.

## Input

$ARGUMENTS — aksi umum (opsional): `dashboard`, `pending`, `publish-all`, `batch [N artikel]`

## Sub-Agent yang Dikelola

| Sub-Agent | Spesialisasi |
|---|---|
| `/social-ig` | Instagram — draft, publish, status, template IG |
| `/social-fb` | Facebook — draft, publish, takedown, format link_share/photo |
| `/social-caption` | Caption writer, hashtag optimizer, preview format |
| `/social-template` | Template designer, manage template image, preview render |

## Operasi Orchestrator

### dashboard — Ringkasan semua platform

**Spawn 2 sub-agent paralel:**

Sub-agent 1: Instagram status
```
GET /api/social/posts?platform=instagram&status=draft
GET /api/social/posts?platform=instagram&status=published&limit=5
```

Sub-agent 2: Facebook status
```
GET /api/social/posts?platform=facebook&status=draft
GET /api/social/posts?platform=facebook&status=published&limit=5
```

Sub-agent 3: Artikel belum dipost
```
GET /api/articles?status=published&noSocialPost=true&limit=10
```

Kompilasi dashboard:
```
📱 SOCIAL MEDIA DASHBOARD — JHB
═══════════════════════════════════════

INSTAGRAM
✅ Published: [N] | 📝 Draft: [N] | ❌ Failed: [N]
Post terbaru: [judul] — [N] jam lalu

FACEBOOK
✅ Published: [N] | 📝 Draft: [N] | ❌ Failed: [N]
Post terbaru: [judul] — [N] jam lalu

📋 ARTIKEL BELUM DIPOST ([N] artikel)
1. [Judul] — Published [N] hari lalu
2. [Judul] — Published [N] hari lalu
...

💡 AKSI TERSEDIA:
- Ketik "draft [articleId]" untuk buat draft
- Ketik "publish-all" untuk publish semua draft pending
- Ketik /social-ig untuk manage Instagram saja
- Ketik /social-fb untuk manage Facebook saja
```

### pending — Lihat dan approve draft yang menunggu

**Spawn 2 sub-agent paralel:**
- IG drafts: `GET /api/social/posts?platform=instagram&status=draft`
- FB drafts: `GET /api/social/posts?platform=facebook&status=draft`

Tampilkan semua draft gabungan dengan opsi approve/reject per post.

### publish-all — Publish semua draft yang approved

Untuk setiap draft dengan status "draft" yang sudah di-review:
1. Instagram → delegate ke `/social-ig publish [postId]`
2. Facebook → delegate ke `/social-fb publish [postId]`

Jalankan secara PARALEL untuk semua platform.
Laporkan hasil: berapa sukses, berapa gagal.

### batch — Buat draft untuk N artikel terbaru

Ambil N artikel published yang belum punya social post:
```
GET /api/articles?status=published&noSocialPost=true&limit=[N]
```

Untuk setiap artikel, **spawn paralel**:
- Draft IG via `/social-ig draft [articleId]`
- Draft FB via `/social-fb draft [articleId]`

Progress report per artikel.

## Alur Default (tanpa argumen)

1. Jalankan `dashboard` — tampilkan situasi saat ini
2. Jika ada draft pending → tanya "Mau review dan publish sekarang?"
3. Jika ada artikel belum dipost → tanya "Mau buat draft untuk [N] artikel ini?"
4. Jika Draft Mode aktif (dari settings) → ingatkan user bahwa post perlu approval manual

## Routing Cerdas

Berdasarkan keyword di pesan user, delegate ke sub-agent yang tepat:

| Keyword | Delegate ke |
|---|---|
| "instagram", "ig", "reels" | `/social-ig` |
| "facebook", "fb", "page" | `/social-fb` |
| "caption", "teks post", "hashtag" | `/social-caption` |
| "template", "gambar post", "desain" | `/social-template` |
| "artikel [id/judul]" | Generate draft di kedua platform |

## Draft Mode

Jika `globalSettings.draftModeEnabled = true`:
- JANGAN langsung publish
- Selalu buat draft dulu
- Ingatkan user setelah draft dibuat: "Draft siap. Review di /panel/social sebelum publish."

Jika `draftModeEnabled = false`:
- Bisa langsung publish setelah konfirmasi user
- Tetap tampilkan preview caption sebelum publish

## Chain ke

- `/analytics social` — untuk laporan statistik posting
- `/keyword` — jika mau tambah hashtag ke database
- `/deploy` — hanya jika ada perubahan kode social media
