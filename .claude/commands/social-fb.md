# Social-FB — Facebook Specialist Agent

Agent khusus Facebook Page JHB. Mengelola posting Facebook dengan detail penuh.

## Input

$ARGUMENTS — aksi: `draft [articleId]`, `publish [postId]`, `takedown [postId]`, `status`, `pending`

## Konteks Facebook JHB

- API: Meta Graph API v21.0 via `src/lib/social/facebook.ts`
- Page ID: tersimpan di `SocialMediaSettings.fbPageId`
- Post format: `link_share` (default) atau `photo`
- Caption: tidak ada batas ketat, ideal 1-3 paragraf + link
- Delete: BISA via API — `DELETE /{postId}?access_token={token}`
- Panel: `/panel/social` tab Facebook

## Operasi

### draft — Buat draft Facebook untuk artikel

**Sub-agent 1 (paralel) — Baca artikel:**
```
GET /api/articles/[articleId]
```
Ambil: title, content, excerpt, category, tags, featuredImage, slug, seoTitle, seoDescription

**Sub-agent 2 (paralel) — Cek settings Facebook:**
```
GET /api/social/settings
```
Ambil: fbPageId, defaultPostFormat, hashtagCountTarget, fixedHashtagsFb, utmParams

Setelah keduanya selesai:

**Langkah 3 — Tentukan format post:**
- Cek `categoryFormatOverride[article.category.slug]` → ada override?
- Jika tidak → gunakan `defaultPostFormat` (link_share/photo)
- `link_share`: share URL artikel dengan preview card otomatis dari Facebook
- `photo`: render gambar template + caption lengkap

**Langkah 4 — Generate caption Facebook:**
Struktur caption:
```
[Judul Artikel]

[Paragraf 1: Hook — intisari kasus, 2-3 kalimat]

[Paragraf 2: Konteks/implikasi hukumnya, 2-3 kalimat]

📖 Lihat selengkapnya: https://jurnalishukumbandung.com/berita/[slug]?utm_source=facebook&utm_medium=social

#Hashtag1 #Hashtag2 ... (5-8 hashtag)
```

**Langkah 5 — Render image (jika format photo):**
```
POST /api/social/templates/preview
{ "templateId": "[id]", "articleId": "[articleId]" }
```

**Langkah 6 — Simpan draft:**
```
POST /api/social/posts
{
  "articleId": "[id]",
  "platform": "facebook",
  "caption": "[caption]",
  "renderedImageUrl": "[url atau null]",
  "postFormat": "link_share | photo",
  "status": "draft"
}
```

**Output ke user:**
Preview caption + format yang dipilih + estimasi reach.

### publish — Publish draft yang sudah diapprove

```
POST /api/social/posts/[postId]/approve
```

Flow berdasarkan format:
- **link_share**: `POST /{pageId}/feed` dengan `{ message, link, access_token }`
- **photo**: `POST /{pageId}/photos` dengan `{ url, message, access_token }`

Simpan `externalPostId` di DB untuk keperluan takedown.

### takedown — Hapus post yang sudah dipublish

```
POST /api/social/posts/[postId]/takedown
```

Proses:
1. Ambil `externalPostId` dari DB
2. `DELETE https://graph.facebook.com/v21.0/{externalPostId}?access_token={token}`
3. Update DB status → `"deleted"`
4. Laporkan hasil

### pending — Lihat draft Facebook menunggu review

```
GET /api/social/posts?platform=facebook&status=draft
```

Tampilkan:
| Judul | Format | Caption (100 char) | Dibuat | Aksi |
|---|---|---|---|---|

### status — Status koneksi Facebook

Cek:
- `fbPageId` tersimpan?
- Token valid? (test call ke `/{pageId}?fields=name`)
- Posts minggu ini
- Engagement rate (likes + comments / reach)

## Alur Default (tanpa argumen)

1. Cek koneksi FB Page (token + pageId valid)
2. Lihat draft pending
3. Cek 5 artikel terbaru tanpa FB post
4. Sarankan: mau draft semuanya sekaligus atau satu per satu?

## UTM Tracking

Semua URL Facebook wajib pakai UTM dari settings:
```
?utm_source=facebook&utm_medium=social&utm_campaign=jhb-post
```
Bisa dikustomisasi per artikel atau per kampanye.

## Format Rekomendasi per Kategori

| Kategori | Format Rekomendasi | Alasan |
|---|---|---|
| Berita Terbaru | link_share | Facebook auto-generate preview bagus |
| Tipikor | photo | Gambar dengan template lebih menarik |
| Sidang | link_share | Cepat, mudah di-engage |
| Analisis Hukum | photo | Konten panjang butuh visual kuat |

## Chain ke

- `/social-caption` — edit caption sebelum publish
- `/social-template` — ganti template gambar
- `/social-ig` — sekalian post ke Instagram
- `/deploy` — tidak perlu