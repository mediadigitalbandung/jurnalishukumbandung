# Iklan — Ads Management Specialist

Specialist agent untuk manage iklan banner & sidebar ads di JHB.

## Input

$ARGUMENTS — aksi: `list`, `add`, `expire-check`, `performance`, `placement`

## Tugas Spesifik

- CRUD iklan (banner, sidebar, inline)
- Expiration management
- Ad performance tracking (impressions, clicks, CTR)
- Placement optimization

Model: `Ad` di schema. API: `src/app/api/ads/`. Component: `src/components/ads/BannerAd.tsx`.

## Tipe Iklan

| Tipe | Ukuran | Posisi | Rate |
|---|---|---|---|
| **Banner atas** | 728×90 | Di bawah header | Rp [...] /hari |
| **Banner tengah** | 970×250 | Di antara section homepage | Rp [...] /hari |
| **Sidebar** | 300×250 | Sidebar artikel | Rp [...] /hari |
| **Inline article** | 728×250 | Di dalam artikel | Rp [...] /hari |

## Operasi

### list — Daftar iklan aktif
```
GET /api/ads?active=true
```
Tampilkan:
- Nama klien, posisi, tanggal mulai/akhir
- Status: aktif / expired / pending
- Impressions, clicks, CTR

### add — Tambah iklan baru

Input wajib:
```
{
  "clientName": "...",
  "imageUrl": "...",
  "targetUrl": "...",
  "placement": "banner-top" | "banner-middle" | "sidebar" | "inline",
  "startDate": "2025-04-22",
  "endDate": "2025-05-22",
  "isActive": true
}
```

Validasi:
- Image harus sesuai ukuran placement
- Target URL valid (https)
- End date > start date
- Tidak boleh bentrok slot yang sama (di posisi yang sama, di waktu yang sama)

### expire-check — Cek iklan yang hampir habis

Query iklan dengan `endDate < today + 7 days`:
```
GET /api/ads?expiringIn=7
```
Kirim notifikasi ke admin untuk kontak klien re-book.

### performance — Laporan per iklan

Agregasi dari `Ad.impressions` dan `Ad.clicks`:
```
Client: XYZ Advokat
Periode: 2025-04-01 — 2025-04-30
Impressions: 125,432
Clicks: 847
CTR: 0.67%
Top placement: sidebar (300 clicks)
Peak time: 08-10 WIB weekday
```

### placement — Optimasi posisi

Audit per-placement performance:
- CTR rata-rata per posisi
- Identifikasi slot kosong (ada opportunity cost)
- Rekomendasikan re-arrange

## Ad Tracking

API endpoint yang sudah ada: `src/app/api/ads/[id]/track/route.ts`

Event:
- Impression: saat iklan dirender (lazy load trigger)
- Click: saat user klik iklan
- Close: saat user close iklan (jika dismissible)

## Rules Kualitas Iklan

**TOLAK iklan:**
- Produk ilegal (judi online, narkoba, pornografi)
- Klaim medis tidak terverifikasi
- Skema investasi bodong / crypto spam
- Produk competitor yang relevan dengan konten (konflik kepentingan editorial)

**BOLEH dengan review:**
- Kantor advokat lokal Bandung
- Kursus/pelatihan hukum
- Produk legaltech
- Acara seminar hukum

## Chain ke

- `/panel` — jika perlu UI admin baru untuk iklan
- `/api-new` — jika perlu endpoint ad tracking baru
- `/analytics` — gabungkan ad performance dengan traffic data

## Aturan

- Iklan TIDAK BOLEH menutupi konten artikel
- Mobile: max 1 banner, tidak boleh sticky yang blocking
- Image WAJIB di-compress (< 100KB)
- Target URL harus HTTPS
- Disclosure: tulis "iklan" atau "sponsored" di atas iklan
- Tidak boleh iklan di halaman /tentang, /kode-etik, /pedoman-media