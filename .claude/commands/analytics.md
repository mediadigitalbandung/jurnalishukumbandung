# Analytics — Laporan Statistik & Performa JHB

Agent pelapor statistik website, konten, dan media sosial JHB.

## Input

$ARGUMENTS — aksi: `content`, `social`, `seo`, `traffic`, `full`

## Konteks Data

Data tersedia di database JHB:
- Artikel: `Article` table (views, publishedAt, category, tags)
- Sosial: `SocialPost` table (platform, status, publishedAt, externalPostId)
- User: `User` table (role, createdAt)
- Komentar: `Comment` table (articleId, createdAt, status)

## Operasi

### content — Laporan Konten

**Sub-agent 1 (paralel) — Statistik artikel:**
Query DB:
```sql
- Total artikel published
- Artikel bulan ini vs bulan lalu (growth %)
- Artikel per kategori (breakdown)
- Artikel per author
- Top 10 artikel by views (7 hari terakhir)
- Artikel tanpa featured image (butuh perhatian)
- Artikel dengan kata < 300 (kualitas rendah)
- Draft yang belum dipublish > 7 hari
```

**Sub-agent 2 (paralel) — Analisis konten:**
- Distribusi kategori (pie chart ASCII)
- Kata rata-rata per artikel
- Artikel yang paling banyak punya social post
- Tag paling sering digunakan

**Output:**
```
📊 LAPORAN KONTEN JHB
Periode: [tanggal] — [tanggal]
═══════════════════════════════

📰 ARTIKEL
Total Published: [N]
Bulan ini: [N] (+/-[N]% vs bulan lalu)
Draft aktif: [N]

📂 PER KATEGORI
Berita Terbaru    ██████████████  45 artikel (38%)
Tipikor           ████████        25 artikel (21%)
Sidang            ██████          18 artikel (15%)
HAM               ████            12 artikel (10%)
Lainnya           ████            19 artikel (16%)

✍️ PER PENULIS
[Nama]            [N] artikel bulan ini
[Nama]            [N] artikel bulan ini

🏆 TOP ARTIKEL (7 hari)
1. [Judul] — [N] views
2. [Judul] — [N] views
...

⚠️ PERLU PERHATIAN
- [N] artikel tanpa gambar
- [N] artikel < 300 kata
- [N] draft > 7 hari tidak dipublish
```

### social — Laporan Media Sosial

**Sub-agent 1 (paralel) — Statistik posting:**
Query `SocialPost`:
```
- Total post per platform (IG/FB)
- Post minggu ini vs minggu lalu
- Breakdown status: published/draft/failed/deleted
- Artikel tanpa social post (missed opportunities)
- Post terbaru per platform
```

**Sub-agent 2 (paralel) — Coverage check:**
Bandingkan artikel published vs artikel yang punya social post:
- Berapa % artikel sudah diposting ke sosmed?
- Artikel mana yang belum dipost sama sekali?
- Artikel mana yang sudah di IG tapi belum FB (atau sebaliknya)?

**Output:**
```
📱 LAPORAN MEDIA SOSIAL
═══════════════════════════════

INSTAGRAM
Published: [N] post
Draft pending: [N]
Minggu ini: [N] post
Coverage: [N]% artikel sudah di-posting

FACEBOOK
Published: [N] post
Draft pending: [N]
Minggu ini: [N] post
Coverage: [N]% artikel sudah di-posting

📋 ARTIKEL BELUM DI-POST (prioritas):
1. [Judul] — Published [N] hari lalu — [Buat Draft]
2. [Judul] — Published [N] hari lalu — [Buat Draft]
...

💡 REKOMENDASI:
- Ada [N] artikel > 3 hari yang belum dipost ke sosmed
- Platform dengan coverage paling rendah: [platform]
- Waktu posting terbaik berdasarkan data: [jam] WIB
```

### seo — Laporan SEO Health

**Sub-agent — Audit metadata artikel:**
Query semua artikel published, hitung:
- % punya seoTitle optimal (50-60 char)
- % punya seoDescription optimal (150-155 char)
- % punya excerpt
- % punya featured image
- % punya minimal 3 tags
- Distribution word count

**Output:**
```
🔍 LAPORAN SEO HEALTH
═══════════════════════════════

METADATA COMPLETENESS
seoTitle optimal:     [N]% ([N]/[total] artikel)
seoDescription:       [N]%
Excerpt:              [N]%
Featured image:       [N]%
Tags (≥3):            [N]%
Word count ≥400:      [N]%

OVERALL SEO SCORE: [N]/100

🔴 KRITIS (perlu segera):
- [N] artikel tanpa seoTitle
- [N] artikel tanpa seoDescription

⚠️ MEDIUM PRIORITY:
- [N] artikel word count < 300 kata
- [N] artikel tanpa featured image

💡 REKOMENDASI:
Jalankan /article-optimize untuk scan detail tiap artikel.
```

### traffic — Laporan Traffic (dari DB views)

Query `Article.views` dan `Article.publishedAt`:
```
- Total views semua waktu
- Views 7 hari terakhir
- Views 30 hari terakhir
- Top 10 artikel all-time
- Artikel yang viewsnya naik pesat (trending)
- Distribusi views per kategori
```

**Output:**
```
📈 LAPORAN TRAFFIC
═══════════════════════════════

VIEWS
Total all-time: [N]
7 hari terakhir: [N]
30 hari terakhir: [N]
Rata-rata per artikel: [N]

🏆 TOP ARTIKEL ALL-TIME
1. [Judul] — [N] views
2. [Judul] — [N] views
...

📂 VIEWS PER KATEGORI
Tipikor       ████████████  45% of total views
Berita Terkini ████████     30%
Sidang         ████          15%
...

📊 TRENDING (naik pesat minggu ini)
[Judul] — [N] views (+[N]% dari minggu lalu)
```

### full — Laporan Lengkap (semua di atas)

Jalankan semua sub-agent (content + social + seo + traffic) secara paralel, kompilasi laporan komprehensif.

Tambahkan:

```
🎯 REKOMENDASI PRIORITAS MINGGU INI
1. [Aksi paling impactful berdasarkan data]
2. [Konten gap yang perlu diisi]
3. [Optimasi yang perlu dilakukan]
```

## Alur Default (tanpa argumen)

Jalankan mode `full` dengan semua sub-agent paralel.

## Chain ke

- `/article-optimize` — untuk artikel dengan SEO score rendah
- `/social-ig` atau `/social-fb` — untuk artikel yang belum dipost
- `/keyword` — jika ditemukan keyword gap dari data
- `/content` atau `/article-writer` — jika ada topik yang perlu artikel baru