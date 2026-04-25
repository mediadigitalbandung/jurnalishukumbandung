# Social-IG — Instagram Specialist Agent

Agent khusus Instagram untuk JHB. Mengelola seluruh alur posting Instagram secara detail.

## Input

$ARGUMENTS — aksi: `draft [articleId]`, `publish [postId]`, `status`, `templates`, `pending`

## Konteks Instagram JHB

- API: Meta Graph API v21.0 via `src/lib/social/instagram.ts`
- Caption: max ~2200 char, hashtag ideal 15-20 tag
- Image: wajib ada, rasio 1:1 atau 4:5
- Delete: TIDAK bisa via API — harus manual di app, lalu "Tandai Dihapus" di panel
- Panel: `/panel/social` tab Instagram

## Operasi

### draft — Buat draft Instagram untuk artikel

Langkah detail:

**Sub-agent 1 (paralel) — Baca artikel:**
```
GET /api/articles/[articleId]
```
Ambil: title, content, excerpt, category, tags, featuredImage, slug

**Sub-agent 2 (paralel) — Cek template aktif:**
```
GET /api/social/templates?platform=instagram
```
Cari template dengan `isDefault=true` dan `platform=instagram`

Setelah keduanya selesai:

**Langkah 3 — Generate caption:**
Panggil logic di `src/lib/social/caption-generator.ts`:
- 2 paragraf: hook (intisari kasus) + konteks/implikasi
- CTA: "📖 Lihat selengkapnya di link bio atau kunjungi: [URL]"
- Hashtag: brand + artikel tags + matched TargetKeyword + kategori + platform fixed
- Target: 15-20 hashtag, diakhir caption

**Langkah 4 — Render image:**
Jika ada template aktif:
```
POST /api/social/templates/preview
{ "templateId": "[id]", "articleId": "[articleId]" }
```
Jika tidak ada template — gunakan featuredImage langsung.

**Langkah 5 — Simpan draft:**
```
POST /api/social/posts
{
  "articleId": "[id]",
  "platform": "instagram",
  "caption": "[caption]",
  "renderedImageUrl": "[url]",
  "status": "draft"
}
```

**Output ke user:**
- Preview caption lengkap (dengan hashtag)
- URL image yang akan diposting
- Tombol: "Approve & Publish" atau "Edit Caption dulu"

### publish — Publish draft yang sudah diapprove

```
POST /api/social/posts/[postId]/approve
```

Flow Instagram publish:
1. Create media container → `POST /{igUserId}/media`
2. Publish container → `POST /{igUserId}/media_publish`
3. Fetch permalink → `GET /{mediaId}?fields=permalink`
4. Update DB status → `published`

### pending — Lihat draft yang menunggu review

```
GET /api/social/posts?platform=instagram&status=draft
```

Tampilkan tabel:
| Judul Artikel | Caption Preview | Image | Dibuat | Aksi |
|---|---|---|---|---|
| ... | ... (100 char) | ✓/✗ | ... | [Approve] [Reject] |

### status — Cek status akun Instagram JHB

```
GET /api/social/settings
```

Tampilkan:
- igUserId: terhubung atau tidak
- Token valid: ya/tidak
- Posts minggu ini: berapa
- Last post: kapan, tentang apa

### templates — Lihat template Instagram aktif

```
GET /api/social/templates?platform=instagram
```

Tampilkan semua template dengan preview URL.
Rekomendasikan jika belum ada template default.

## Alur Default (tanpa argumen)

1. Jalankan `status` — cek akun aktif
2. Jalankan `pending` — lihat draft menunggu
3. Cek artikel published 3 hari terakhir tanpa Instagram post:
   ```
   GET /api/articles?published=true&noSocialPost=instagram&limit=5
   ```
4. Rekomendasikan: "Ada [N] artikel belum dipost ke Instagram. Mau generate draft?"

## Aturan Khusus Instagram

- Selalu cek `featuredImage` ada sebelum draft — Instagram wajib gambar
- Caption > 2200 char: potong di batas paragraf, jangan tengah kalimat
- Hashtag: 15-20 optimal, jangan >30 (berisiko shadow ban)
- Jangan publish langsung tanpa draft review kecuali user minta "langsung publish"
- Setelah publish sukses: update `SocialPost.status = "published"` dan simpan `externalPostId`

## Chain ke

- `/social-caption` — jika user mau edit caption sebelum publish
- `/social-template` — jika user mau ganti/buat template
- `/social-fb` — jika user mau sekaligus post ke Facebook
- `/deploy` — tidak perlu (tidak ada perubahan kode)
