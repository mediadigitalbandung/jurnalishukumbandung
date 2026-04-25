# SEO-Index — Sitemap, Indexing & Search Console Specialist

Specialist agent untuk indexing: sitemap.xml, robots.txt, Google Search Console ping, IndexNow.
Dipanggil oleh `/seo` (orchestrator) atau langsung untuk masalah indexing.

## Input

$ARGUMENTS — aksi spesifik: "sitemap", "ping", "robots", "audit-index"

## Tugas Spesifik

Specialist ini HANYA menangani:
- `sitemap.xml` (Next.js `src/app/sitemap.ts`)
- `robots.txt` (Next.js `src/app/robots.ts`)
- Google Search Console ping/submit
- IndexNow API submission
- Canonical conflicts (redirect/duplicate)
- URL yang seharusnya di-index tapi tidak

TIDAK menangani: metadata HTML (→ `/seo-meta`), JSON-LD (→ `/seo-schema`).

## Audit Sitemap

Baca `src/app/sitemap.ts`:
```
[ ] Semua halaman publik penting ada di sitemap
[ ] URL absolut dengan domain yang benar
[ ] changeFrequency benar: "always"/"hourly" untuk artikel baru, "monthly" untuk static
[ ] priority benar: 1.0 homepage, 0.9 artikel baru, 0.7 kategori, 0.5 tag
[ ] lastModified ada dan akurat (dari updatedAt/publishedAt DB)
[ ] Sitemap tidak include halaman panel/admin
[ ] Tidak include halaman 404 atau redirect
[ ] Max 50.000 URLs per sitemap (split jika perlu)
```

## Audit Robots.txt

Baca `src/app/robots.ts`:
```
[ ] /panel/* di-disallow untuk bots
[ ] /api/* di-disallow (kecuali yang memang publik)
[ ] Sitemap URL dicantumkan
[ ] User-agent: * ada
[ ] Tidak block halaman publik penting
```

## Ping Google Search Console

Jika ada artikel baru dipublish:
```
GET /api/seo/ping — trigger GSC ping untuk 1 URL
GET /api/seo/batch-index — batch ping multiple URLs
```

Atau ping manual via API route yang sudah ada di `src/app/api/seo/`.

## Cek Existing API Routes

Baca files di `src/app/api/seo/`:
- `ping/route.ts` — single URL ping
- `submit/route.ts` — submit ke GSC
- `batch-index/route.ts` — batch submission
- `status/route.ts` — cek status credentials

Gunakan yang sudah ada — jangan buat duplikasi.

## Output

Laporkan:
- URL yang berhasil/gagal di-ping
- Issue sitemap yang ditemukan
- Rekomendasi prioritas indexing

→ Kembalikan ke `/seo` atau sarankan: **"Cek hasil indexing di Google Search Console dalam 24-48 jam."**