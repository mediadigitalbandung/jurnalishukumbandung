# Panduan Auto-Captions TikTok App

**Kenapa pakai TikTok native captions?**
Gratis, Whisper-class accuracy untuk Bahasa Indonesia, bagian dari flow TikTok (user familiar), support emoji/sticker.

---

## Alur Umum Publish Video JHB ke TikTok

```
┌──────────────────────┐
│ 1. Panel JHB         │
│ /panel/tiktok/[id]   │
│                      │
│ • Render video       │
│ • Klik "Publish"     │
└─────────┬────────────┘
          │
          ▼ Upload ke TikTok Inbox
┌──────────────────────┐
│ 2. TikTok App (HP)   │
│ Pakai akun tester    │
│                      │
│ • Buka inbox         │
│ • Edit + auto-cap    │
│ • Post               │
└──────────────────────┘
```

---

## Step 1: Publish dari Panel JHB

1. Buka `/panel/tiktok/[videoId]/edit`
2. Pastikan video sudah **rendered** (status hijau)
3. Klik **"Publish ke TikTok"** — tunggu "Upload sukses ke TikTok inbox"

## Step 2: Finalize di TikTok App

### 2a. Buka Notifikasi
- Login TikTok app pakai akun tester (`@jurnalis.hukum.ba`)
- Tap icon **Inbox** (pesawat kertas) di bottom bar
- Scroll cari notifikasi dari **Jurnalis Hukum Bandung Publisher**
- Tap notifikasi untuk buka video

Alternatif kalau notif tidak muncul:
- Tap **+** (Create button) di bottom
- Cek section **"Drafts"** atau **"Recent uploads"**
- Cari video terbaru

### 2b. Aktifkan Auto-Captions

Setelah video terbuka di editor:

1. Tap button **"Captions"** (ikon CC di toolbar kanan)
2. Pilih **"Auto captions"** atau **"Auto-generated"**
3. Pilih bahasa: **Indonesian (Bahasa Indonesia)**
4. Tunggu 10-30 detik — TikTok process audio → generate caption
5. Caption muncul timed per kata/frase

### 2c. Edit Caption (Optional)

Untuk perbaiki typo atau tambah emoji:

1. Tap salah satu segment caption di preview
2. Edit teks di popup
3. Bisa ubah:
   - Wording
   - Font (banyak pilihan font TikTok)
   - Warna (highlight, stroke, shadow)
   - Posisi (drag segment)
   - Timing (set start/end second)

### 2d. Polish Tambahan

TikTok editor juga kasih kamu:

- **Effects** — filter visual, transisi cinematic
- **Stickers** — emoji animated, text bubbles
- **Sounds** — swap/tambah background music dari library TikTok (gratis, legal)
- **Voice over** — rekam narasi tambahan
- **Text timing** — animasi text in/out

## Step 3: Post

1. Isi **caption** (description di bawah video) — pakai hashtag:
   ```
   Sidang korupsi kepala dinas Bandung. Terdakwa dituntut 8 tahun penjara atas dakwaan pasal 2 UU Tipikor.
   
   #HukumBandung #BeritaHukum #Tipikor #BandungNews #JurnalisHukumBandung #FYP
   ```

2. Set **Privacy**:
   - **Sandbox testing**: pilih **Only me** atau **Friends**
   - **Production** (after TikTok app approval): **Everyone**

3. Opsi lain:
   - ☑ Allow comments
   - ☑ Allow duet/stitch (boleh)
   - ☐ Save to device (biasanya tidak perlu)

4. Tap **Post**

---

## Tips Buat Video JHB yang Naik di TikTok

### Konten (berdasarkan best practice JHB)
- **Hook kuat di 3 detik pertama** — angka mencolok, pertanyaan, fakta shocking
- **Durasi optimal**: 30-60 detik (sweet spot TikTok)
- **Vertikal 9:16** — JHB render default sudah benar (1080×1920)

### Captions
- **Bahasa Indonesia** — kecuali target international audience
- **Emoji strategis** — ⚖ untuk hukum, 🏛 untuk pengadilan, 🔴 untuk breaking
- **Highlight kata kunci** — pakai background color per 1-2 kata

### Hashtag
Struktur 3-tier:
- **Broad (1-2)**: `#fyp`, `#foryou`
- **Niche (3-4)**: `#hukum`, `#bandung`, `#beritaviral`
- **Branded (2)**: `#jurnalishukumbandung`, `#hukumbandung`

Jangan kebanyakan — max 6-8 hashtag.

### Frame dari JHB Panel
Di `/panel/tiktok/[id]/edit`, pilih frame:
- **Breaking News** — kasus baru/urgent
- **News Ticker** — berita umum
- **Lower Third** — interview/analisis
- **Brand Green** — general branded content

Frame ini sudah burn-in, saat upload ke TikTok app tinggal tambah captions + polish.

---

## Troubleshooting

### Caption tidak akurat (banyak typo)
- Audio video kurang jelas (noise, bass music)
- **Fix:** Render ulang dengan backsong lebih pelan (volume 0.3-0.4)
- Atau: edit manual caption di TikTok app

### Auto-caption tidak muncul menu-nya
- TikTok app outdated → update via Play Store / App Store
- Atau: feature masih rolling out — coba Draft → Save → buka ulang

### Video tidak muncul di Inbox TikTok
- Sandbox tester: pastikan akun login adalah yang diinvite di Target Users
- Tunggu 1-2 menit — upload prosesing di server TikTok
- Cek status di panel JHB: `publishStatus = success`

### Caption bahasa Inggris padahal video Bahasa Indonesia
- TikTok auto-detect bahasa → manual set language ke **Indonesian** di menu Captions

---

## Setelah App Disetujui (Production Mode)

Saat TikTok approve app (3-7 hari review), kamu bisa switch ke **Direct Post** mode:
- Video langsung ter-post dari panel JHB, tanpa perlu buka TikTok app
- Caption bisa di-generate dari artikel JHB pakai AI
- Batch posting — jadwalkan 5-10 video sekaligus

Tapi masih bisa override: kalau mau polish dulu, set per-video mode ke "Inbox Upload" supaya user bisa finalize manual.

---

**Status flow sekarang**: Inbox Upload (sandbox, requires manual finalize)
**Status flow production**: akan enabled setelah TikTok app approval
