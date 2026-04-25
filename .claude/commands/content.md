# Content — Content Creation Orchestrator

Buat artikel hukum JHB end-to-end: riset keyword → tulis → metadata → social draft.

## Input

$ARGUMENTS — topik artikel. Contoh: "sidang korupsi kepala dinas Bandung", "putusan PN Bandung"

## Sub-Agents yang Dikelola

| Sub-Agent | Tugas |
|---|---|
| `/keyword` | Cek coverage gap, keyword yang relevan |
| `/seo-meta` | Generate metadata: title, description, OG |
| `/social` | Buat draft social post setelah artikel selesai |

## Alur Kerja

### Step 1: Keyword Research (spawn `/keyword`)

Sebelum nulis, cek:
- Apakah topik ini sudah punya artikel di JHB?
- Keyword apa yang paling relevant dan belum tercakup?
- Angle apa yang paling bernilai untuk SEO?

### Step 2: Tulis Artikel

Setelah keyword strategy jelas, tulis artikel dengan standar editorial JHB:

**Struktur:**
```
JUDUL: Keyword utama di awal (maks 70 char)
LEAD (p1): 5W+1H dalam 1-2 kalimat kuat
BODY:
  <h2>Kronologi / Latar Belakang</h2>
  <h2>Fakta Hukum / Detail Kasus</h2>
  <h2>Keterangan Narasumber / Pihak Terkait</h2>
  <h2>Analisis Hukum</h2> (jika kasus kompleks)
PENUTUP: Perkembangan selanjutnya atau kesimpulan faktual
```

**Standar Editorial:**
- Gaya: jurnalistik berita (5W+1H), bukan opini
- Panjang: 400-800 kata
- Format: HTML bersih (`<p>`, `<h2>`, `<h3>`, `<blockquote>`)
- Asas praduga tak bersalah: sebut "terduga" atau "tersangka" sesuai tahap
- Kutipan narasumber: dalam `<blockquote>`
- Sebut "Bandung" atau "Jawa Barat" minimal 2x
- HANYA topik hukum — tidak ada tech/lifestyle/otomotif

### Step 3: Metadata (spawn `/seo-meta`)

Generate paralel saat finalisasi artikel:
- SEO title (maks 60 char)
- Meta description (150-155 char)
- OG tags
- Excerpt (1-2 kalimat)

### Step 4: Social Draft (spawn `/social batch 1`)

Setelah artikel + metadata siap:
- Draft IG caption
- Draft FB post

**Spawn PARALEL:**
```
PARALEL:
├── /seo-meta → generate metadata
└── (siapkan konten untuk social)

SEQUENTIAL (setelah artikel confirmed):
└── /social → draft IG + FB
```

## Output Format

```
## Artikel Baru — [Judul]

### 📝 KONTEN ARTIKEL
[Konten HTML siap paste ke editor]

### 🔍 SEO
Title: [seo title]
Description: [seo description]
Excerpt: [excerpt]
Tags: [tag1, tag2, tag3, tag4, tag5]
Kategori: [kategori yang tepat]

### 📱 SOCIAL DRAFT
Instagram: [caption siap post]
Facebook: [post siap publish]

### ✅ CHECKLIST SEBELUM PUBLISH
[ ] Cek fakta semua nama orang, angka, tanggal
[ ] Konfirmasi tidak ada asumsi tanpa sumber
[ ] Pilih featured image yang relevan
[ ] Set kategori dan tags di panel
[ ] Pastikan SEO title < 60 char
```

## Aturan Konten

- HANYA hukum, peradilan, advokat, pengadilan, HAM, tipikor, kebijakan hukum
- Jangan tulis artikel tentang teknologi, otomotif, atau lifestyle
- Selalu cantumkan yurisdiksi: "PN Bandung", "Kejari Bandung", "Polrestabes Bandung", dll.
- Untuk artikel investigasi: tandai sebagai "memerlukan verifikasi lebih lanjut"