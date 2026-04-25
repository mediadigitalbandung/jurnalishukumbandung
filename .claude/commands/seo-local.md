# SEO-Local — Local SEO Bandung Specialist

Specialist agent untuk local SEO: geo-targeting Bandung & Jawa Barat.

## Input

$ARGUMENTS — area: `audit`, `nap`, `schema-local`, `keywords-local`

## Tugas Spesifik

- Local keyword strategy (Bandung Raya)
- NAP (Name, Address, Phone) consistency
- LocalBusiness/NewsMediaOrganization schema
- Geo-targeting meta tags
- Google Business Profile alignment

## Local SEO Checklist

### 1. NAP Consistency
```
[ ] Nama: "Jurnalis Hukum Bandung" — sama di semua tempat
[ ] Alamat: konsisten di /tentang, /kontak, footer, schema
[ ] Phone: sama format (+62 atau 0) di semua tempat
[ ] Email: redaksi@jurnalishukumbandung.com
[ ] Website: https://jurnalishukumbandung.com (www atau tanpa, konsisten)
```

### 2. Geo-Tags di Metadata
```html
<meta name="geo.region" content="ID-JB" />
<meta name="geo.placename" content="Bandung" />
<meta name="geo.position" content="-6.9175;107.6191" />
<meta name="ICBM" content="-6.9175, 107.6191" />
```

### 3. NewsMediaOrganization Schema — areaServed
```json
"areaServed": [
  { "@type": "City", "name": "Bandung" },
  { "@type": "City", "name": "Cimahi" },
  { "@type": "AdministrativeArea", "name": "Kabupaten Bandung" },
  { "@type": "AdministrativeArea", "name": "Kabupaten Bandung Barat" },
  { "@type": "State", "name": "Jawa Barat" }
]
```

### 4. Local Keywords Prioritas

**Primary (high intent):**
- "berita hukum bandung"
- "hukum bandung"
- "pengadilan bandung"
- "sidang bandung"
- "kasus hukum bandung"

**Secondary (informational):**
- "advokat bandung"
- "pengacara bandung"
- "kejaksaan bandung"
- "polrestabes bandung"
- "pn bandung"

**Long-tail (specific):**
- "sidang tipikor bandung [year]"
- "putusan pn bandung kasus [topik]"
- "jadwal sidang pn bandung"
- "kantor advokat di bandung"

### 5. Lokasi di Konten

Setiap artikel harus sebut lokasi spesifik:
- Kecamatan (Coblong, Sukajadi, Bandung Kulon, dll)
- Kawasan (Dago, Setiabudhi, Cihampelas)
- Institusi lokal (PN Bandung, Kejari Kota Bandung)

Jangan generic "di Jawa Barat" kalau specifik lokasi diketahui.

## Landing Pages Local

Pertimbangkan landing pages per wilayah:
- `/hukum-bandung-kota`
- `/hukum-kabupaten-bandung`
- `/hukum-cimahi`
- `/hukum-bandung-barat`

Masing-masing dengan:
- Unique content (bukan duplicate)
- Local schema (Place, City)
- Link ke artikel-artikel terkait wilayah tersebut

## Audit Pattern

### audit — Full local SEO audit
1. Cek NAP consistency di:
   - `src/app/tentang/page.tsx`
   - `src/app/layout.tsx` (schema)
   - Footer component
   - Database `systemSetting` (alamat_redaksi, contact_email)

2. Cek geo-tags di metadata global
3. Cek areaServed di Organization schema
4. Cek penggunaan keyword lokal di artikel 30 hari terakhir

### Hasil Audit
```
## Local SEO Audit

### NAP Consistency: ✅ / ⚠️
[issues if any]

### Geo-tags: ✅ / ❌

### Schema areaServed: ✅ / ⚠️

### Local Keyword Coverage (30d)
- "hukum bandung": X artikel
- "pengadilan bandung": X artikel
- ...

### Rekomendasi
- [specific actions]
```

## Chain ke

- `/seo-meta` — update geo-tags di halaman
- `/seo-schema` — update areaServed di Organization schema
- `/content` — buat landing page wilayah

## Aturan

- JANGAN keyword stuffing "Bandung" — natural placement
- Gunakan nama resmi wilayah ("Kabupaten Bandung Barat", bukan "KBB")
- Koordinat GPS: check actual office location, jangan random
- Untuk kasus di luar Bandung, tetap sebut "Bandung" hanya jika ada keterkaitan