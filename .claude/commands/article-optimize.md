# Article-Optimize — SEO & Kualitas Optimizer per Artikel

Agent khusus mengoptimasi artikel yang sudah ada untuk peringkat Google yang lebih baik.

## Input

$ARGUMENTS — articleId atau slug artikel yang akan dioptimasi. Jika kosong, scan semua artikel.

## Mode Operasi

### Mode Single Article (ada $ARGUMENTS)

**Sub-agent 1 (paralel) — Baca artikel lengkap:**
```
GET /api/articles/[id_atau_slug]
```
Ambil: title, content, excerpt, seoTitle, seoDescription, tags, category, slug, publishedAt

**Sub-agent 2 (paralel) — Baca target keywords:**
```
GET /api/target-keywords?active=true
```
Cari keyword yang paling relevan untuk artikel ini.

**Sub-agent 3 (paralel) — Analisis struktur konten:**
Dari konten HTML:
- Hitung kata (word count)
- Identifikasi H2, H3 headings
- Cek keberadaan keyword di: title, H1, H2, excerpt, paragraf 1
- Deteksi: apakah ada gambar dengan alt text?
- Hitung density keyword utama

Setelah semua sub-agent selesai:

**Langkah 4 — Audit SEO:**

Checklist 20 poin:
```
TITLE TAG
[ ] seoTitle ada? (panjang 50-60 char ideal)
[ ] seoTitle mengandung keyword utama?
[ ] seoTitle mengandung "Bandung" atau lokasi?

META DESCRIPTION
[ ] seoDescription ada? (150-155 char ideal)
[ ] seoDescription ada CTA atau info menarik?
[ ] seoDescription mengandung keyword?

KONTEN
[ ] Word count >= 400 kata? (ideal 600-800)
[ ] Ada H2 headings yang mengandung keyword?
[ ] Keyword muncul di paragraf pertama?
[ ] Keyword density 1-3% (tidak over-stuffed)?
[ ] Ada kutipan narasumber? (E-E-A-T)
[ ] Tanggal disebutkan dalam konten?
[ ] Nama instansi/lembaga disebutkan dengan lengkap?

EXCERPT
[ ] excerpt ada dan informatif?
[ ] excerpt mengandung keyword?

TAGS
[ ] Minimal 3 tag yang relevan?
[ ] Tag mengandung keyword lokal (Bandung, Jawa Barat)?

URL
[ ] Slug singkat dan mengandung keyword?
[ ] Tidak ada karakter aneh di slug?

GAMBAR
[ ] Featured image ada?
[ ] Alt text gambar mengandung keyword?
```

**Langkah 5 — Generate rekomendasi perbaikan:**

Untuk setiap poin yang gagal, berikan solusi konkret:
- "seoTitle terlalu panjang (75 char). Saran: '[judul yang diperpendek]'"
- "Keyword 'hukum bandung' tidak ada di paragraf pertama. Saran: tambahkan di kalimat pembuka"
- dll.

**Langkah 6 — Tawaran perbaikan otomatis:**

Untuk masalah yang bisa diperbaiki tanpa mengubah konten utama:
- `seoTitle` → generate ulang yang optimal
- `seoDescription` → generate ulang
- `excerpt` → generate dari paragraf pertama
- `tags` → tambah tag yang relevan

Tanya user: "Mau saya langsung perbaiki [N] item di atas? (seoTitle, seoDescription, tags)"

Jika user setuju:
```
PATCH /api/articles/[id]
{
  "seoTitle": "[optimal]",
  "seoDescription": "[optimal]",
  "excerpt": "[optimal]",
  "tags": ["tag1", "tag2", ...]
}
```

### Mode Scan Semua Artikel (tanpa $ARGUMENTS)

**Sub-agent — Ambil semua artikel published:**
```
GET /api/articles?status=published&limit=50
```

Untuk setiap artikel, hitung **SEO Score** (0-100):
- seoTitle optimal: +15 poin
- seoDescription ada & optimal: +15 poin
- Word count >= 400: +10 poin
- Keyword di H2: +10 poin
- excerpt ada: +10 poin
- Tags >= 3: +10 poin
- Featured image ada: +10 poin
- Slug clean: +10 poin
- Keyword di paragraf 1: +10 poin

Tampilkan ranking:
| Artikel | Score | Masalah Utama | Aksi |
|---|---|---|---|
| Judul... | 45/100 | Tidak ada seoTitle, word count 200 kata | [Optimize] |

Prioritas: tampilkan artikel dengan score < 60 dulu.

## Output Format

```
## Audit SEO: [Judul Artikel]
Slug: /berita/[slug]
Score: [N]/100

### ✅ Sudah Baik
- seoTitle optimal (58 char)
- Word count: 650 kata
- ...

### ⚠️ Perlu Diperbaiki
- seoDescription terlalu pendek (90 char, ideal 150-155)
  → Saran: "[deskripsi baru yang optimal]"
- Tidak ada keyword di H2
  → Saran: ubah heading "[heading saat ini]" jadi "[heading dengan keyword]"
- ...

### 🔴 Kritis
- Tidak ada seoTitle (akan pakai title biasa, tidak optimal)
  → Saran: "[seo title baru]"

### Perbaikan Otomatis Tersedia
Bisa langsung saya perbaiki: seoTitle, seoDescription, excerpt, tags
Konten utama TIDAK akan diubah (hanya metadata).

Ketik "perbaiki" untuk langsung apply, atau "tampilkan saja" jika mau review manual.
```

## Chain ke

- `/content` — jika konten terlalu pendek dan perlu diperluas
- `/seo` — untuk optimasi level site (sitemap, structured data)
- `/keyword` — untuk review dan tambah target keyword baru
- `/deploy` — setelah perbaikan di-apply