# Keyword — Manajemen Target Keyword SEO

Kelola target keyword untuk strategi SEO Jurnalis Hukum Bandung.

## Input

$ARGUMENTS — aksi spesifik (opsional): `list`, `add [keyword]`, `analyze`, `gaps`

## Konteks Proyek

- Target utama: "hukum bandung", "berita hukum bandung", "pengadilan bandung"
- Area: Bandung Raya, Kota Bandung, Kabupaten Bandung, Cimahi, Bandung Barat, Jawa Barat
- Topik: hukum pidana, perdata, tata negara, HAM, korupsi/tipikor, peradilan
- Database: tabel `TargetKeyword` di Prisma (field: keyword, isActive)

## Operasi

### list — Lihat semua keyword aktif

Baca dari `src/app/api/target-keywords/route.ts` atau query DB.
Tampilkan dalam tabel: keyword | status | volume estimasi

### add — Tambah keyword baru

Tambah keyword ke tabel `TargetKeyword` via:
```
POST /api/target-keywords
{ "keyword": "[keyword]", "isActive": true }
```

### analyze — Analisis keyword yang sudah ada

Cek artikel mana yang sudah menarget keyword tertentu:
1. Baca semua artikel published
2. Cek keyword presence di title, h2, excerpt
3. Identifikasi keyword mana yang under-represented

### gaps — Temukan content gap

Analisis topik hukum Bandung yang belum tercakup:
1. Bandingkan target keyword dengan artikel yang ada
2. Cari keyword hukum Bandung yang belum punya artikel
3. Rekomendasikan topik artikel baru

## Alur Default

1. List semua keyword aktif
2. Analisis coverage per keyword (berapa artikel yang menarget keyword ini?)
3. Rekomendasikan 5 keyword/topik yang paling perlu artikel baru
4. Tanya user: mau tambah keyword, atau langsung buat artikel? (`/content`)

## Keyword Prioritas JHB

Selalu pertimbangkan keyword-keyword ini sebagai prioritas:
- `hukum bandung` — primary target
- `pengadilan bandung` — high intent
- `sidang [kasus] bandung` — news intent
- `kasus hukum bandung` — informational
- `advokat bandung` / `pengacara bandung` — local service
- `tipikor [lembaga] bandung` — investigative