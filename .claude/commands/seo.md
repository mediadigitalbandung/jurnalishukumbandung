# SEO — SEO Optimizer

Analisis dan optimasi SEO untuk halaman, artikel, atau fitur.

## Input

$ARGUMENTS — halaman atau area yang perlu dioptimasi SEO-nya.

## Langkah-langkah

### 1. Identifikasi Target

Apa yang perlu dioptimasi:
- Halaman publik tertentu?
- Semua halaman artikel?
- Homepage?
- Sitemap?
- Structured data?

### 2. Baca File Terkait

Baca file yang relevan:
- `src/lib/seo-utils.ts` — SEO helper functions
- `src/app/layout.tsx` — root metadata
- Halaman target yang akan dioptimasi
- `src/app/sitemap.ts` atau `src/app/feed.xml/` — sitemap config
- `next.config.js` — headers, redirects

### 3. Audit SEO

Cek item-item berikut pada halaman target:

**Metadata:**
- [ ] Title tag unik dan deskriptif (50-60 karakter)
- [ ] Meta description informatif (150-160 karakter)
- [ ] Open Graph tags (og:title, og:description, og:image, og:type)
- [ ] Twitter Card tags
- [ ] Canonical URL
- [ ] `generateMetadata()` digunakan untuk dynamic pages

**Structured Data:**
- [ ] JSON-LD sesuai tipe (NewsArticle, WebPage, Organization)
- [ ] Schema.org markup valid
- [ ] BreadcrumbList untuk navigasi

**Konten:**
- [ ] Heading hierarchy benar (H1 → H2 → H3, hanya 1 H1)
- [ ] Image alt text ada dan deskriptif
- [ ] Internal linking antar artikel terkait
- [ ] URL slug clean dan deskriptif

**Technical:**
- [ ] `next/image` digunakan (bukan `<img>`)
- [ ] Loading performance (lazy load images, prioritize LCP)
- [ ] Sitemap include halaman ini
- [ ] robots.txt tidak block halaman publik

### 4. Implementasi Perbaikan

Terapkan perbaikan SEO yang ditemukan. Gunakan helper dari `src/lib/seo-utils.ts` jika tersedia.

Untuk metadata halaman:
```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: "Judul | Jurnalis Hukum Bandung",
    description: "Deskripsi 150-160 chars",
    openGraph: {
      title: "...",
      description: "...",
      images: ["..."],
      type: "article",
      siteName: "Jurnalis Hukum Bandung",
    },
  };
}
```

### 5. Selesai

Laporkan:
- Issue SEO yang ditemukan
- Perbaikan yang diterapkan
- Skor/status per halaman

Sarankan: **"SEO optimized. Jalankan `/deploy` untuk deploy."**

## Aturan

- Jangan ubah URL/slug yang sudah live (bisa hilang ranking!)
- Jika ubah URL, WAJIB buat redirect 301
- Metadata harus akurat — jangan keyword stuffing
- Gunakan bahasa Indonesia untuk content metadata
- Sitename selalu: "Jurnalis Hukum Bandung"
- Domain: jurnalishukumbandung.com
