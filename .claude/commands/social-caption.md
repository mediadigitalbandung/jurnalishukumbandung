# Social-Caption — Caption Writer & Optimizer

Agent khusus penulisan dan optimasi caption media sosial JHB.

## Input

$ARGUMENTS — aksi: `write [articleId] [platform]`, `edit [postId]`, `hashtags [articleId]`, `preview [postId]`

## Kemampuan Agent

Agent ini menguasai:
- Penulisan caption jurnalistik hukum 2 paragraf
- Optimasi hashtag dari TargetKeyword database
- Penyesuaian tone per platform (Instagram vs Facebook)
- Validasi panjang dan format caption

## Operasi

### write — Tulis caption baru dari artikel

**Input:** articleId + platform (instagram/facebook)

**Sub-agent 1 (paralel) — Baca konten artikel:**
- Ambil dari DB: title, content, excerpt, category, tags, slug
- Strip HTML: hapus semua tag untuk analisis konten
- Identifikasi: pihak utama, pasal yang disebut, status kasus, fakta kunci

**Sub-agent 2 (paralel) — Ambil keyword database:**
```
GET /api/target-keywords?active=true
```
Siapkan daftar keyword untuk hashtag matching.

**Sub-agent 3 (paralel) — Baca platform settings:**
```
GET /api/social/settings
```
Ambil: hashtagCount, fixedHashtagsBrand, fixedHashtagsPlatform

Setelah semua sub-agent selesai:

**Langkah 4 — Tulis caption dengan AI:**

Prompt AI (sistem):
```
Anda editor media hukum profesional JHB. Tulis caption [platform] untuk artikel berita hukum.

ATURAN:
1. TEPAT 2 paragraf
2. Paragraf 1: Hook — intisari kasus (2-3 kalimat, langsung ke inti)
3. Paragraf 2: Konteks/implikasi hukum (2-3 kalimat, mengapa penting)
4. Bahasa Indonesia formal, mengalir, tidak kaku
5. Tidak clickbait, akurat terhadap artikel
6. Tidak ada sapaan pembuka
7. Tidak ada hashtag (ditambahkan terpisah)
8. Maks 500 karakter total
```

**Langkah 5 — Build hashtag list:**

Prioritas hashtag:
1. Brand: #JurnalisHukumBandung (selalu ada)
2. Tags artikel (dari editor)
3. TargetKeyword matched (fuzzy match dengan isi artikel)
4. Kategori artikel
5. Platform fixed hashtags

Normalisasi: hapus spasi/tanda baca, CamelCase, prefix #

**Langkah 6 — Assemble caption final:**
```
[Judul Artikel]

[Paragraf 1]

[Paragraf 2]

📖 [CTA dengan URL]

#Hashtag1 #Hashtag2 ...
```

**Output:** Caption lengkap + jumlah karakter + jumlah hashtag

### edit — Edit caption post yang sudah ada

```
GET /api/social/posts/[postId]
```

Tampilkan caption saat ini. Tanya user:
- Bagian mana yang mau diubah?
- Atau minta user paste revisi

Setelah user beri input → update:
```
PATCH /api/social/posts/[postId]
{ "caption": "[caption baru]" }
```

### hashtags — Generate ulang hashtag saja

Tanpa mengubah body caption. Hanya update bagian hashtag.

**Sub-agent — Analisis artikel:**
- Baca konten, category, tags
- Match dengan TargetKeyword aktif
- Scoring: exact match = 100, partial (≥70% kata) = 56-80

**Output hashtag terurut:**
1. Brand hashtag
2. Artikel tags
3. Matched keywords (sort by score)
4. Kategori
5. Platform hashtags

Maks sesuai `hashtagCountTarget` dari settings.

### preview — Preview caption di mock UI

Tampilkan caption dalam format visual yang menggambarkan tampilan di platform:

**Instagram mock:**
```
┌─────────────────────────────┐
│ [IMAGE PLACEHOLDER]         │
│                             │
│ @jurnalishukumbandung        │
│ [Judul]                     │
│                             │
│ [Paragraf 1]...             │
│ [Paragraf 2]...             │
│                             │
│ 📖 Lihat di link bio        │
│                             │
│ #Tag1 #Tag2 #Tag3...        │
│                             │
│ ❤️ 0  💬 0  📤 0           │
└─────────────────────────────┘
Panjang: [N] karakter | [N] hashtag
```

**Facebook mock:**
```
┌─────────────────────────────┐
│ Jurnalis Hukum Bandung      │
│ Just now · 🌐               │
│                             │
│ [Judul]                     │
│                             │
│ [Paragraf 1]                │
│                             │
│ [Paragraf 2]                │
│                             │
│ 📖 Lihat selengkapnya: URL  │
│                             │
│ #Tag1 #Tag2                 │
│                             │
│ ┌──────────────────────┐    │
│ │ [LINK PREVIEW IMAGE] │    │
│ │ Judul Artikel        │    │
│ │ jurnalishukumbandung │    │
│ └──────────────────────┘    │
│                             │
│ 👍 Suka  💬 Komentar  📤   │
└─────────────────────────────┘
```

## Kualitas Caption JHB

Checklist sebelum output:
- [ ] Tidak ada opini — hanya fakta & kutipan
- [ ] Asas praduga tak bersalah dijaga
- [ ] Keyword utama muncul natural di paragraf 1
- [ ] CTA jelas dan ada URL
- [ ] Hashtag: 15-20 (IG) atau 5-8 (FB)
- [ ] Total karakter: < 2200 (IG) atau < 600 (FB ideal)

## Chain ke

- `/social-ig` — setelah caption siap, publish ke Instagram
- `/social-fb` — setelah caption siap, publish ke Facebook
- `/keyword` — jika perlu tambah keyword baru ke database
