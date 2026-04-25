# SEO-Meta — Metadata & Open Graph Specialist

Specialist agent untuk semua metadata HTML: title, description, OG, Twitter Card, canonical.
Dipanggil oleh `/seo` (orchestrator) atau langsung untuk fix metadata spesifik.

## Input

$ARGUMENTS — halaman atau file target. Contoh: "berita/[slug]", "homepage", "kategori"

## Tugas Spesifik

Specialist ini HANYA menangani:
- `<title>` dan template title
- `meta description`
- Open Graph tags (og:title, og:description, og:image, og:type, og:url)
- Twitter Card tags
- Canonical URL
- `generateMetadata()` function
- `alternates.canonical`

TIDAK menangani: JSON-LD schema (→ `/seo-schema`), sitemap (→ `/seo-index`).

## Checklist Audit

Untuk setiap halaman yang ditarget:

```
[ ] Title: 50-60 char, mengandung keyword utama + "Bandung" atau "JHB"
[ ] Description: 150-155 char, informatif, mengandung keyword
[ ] og:title ≠ title (boleh sedikit berbeda, OG bisa lebih panjang)
[ ] og:description mengandung hook/CTA
[ ] og:image: absolute URL, 1200×630 recommended, alt text ada
[ ] og:type benar: "website" untuk statik, "article" untuk artikel
[ ] og:url = canonical URL
[ ] og:siteName = "Jurnalis Hukum Bandung"
[ ] og:locale = "id_ID"
[ ] twitter:card = "summary_large_image" untuk artikel, "summary" untuk lain
[ ] twitter:site = "@jurnalishukumbdg"
[ ] canonical URL benar dan absolut
[ ] Dynamic pages pakai generateMetadata() bukan export const metadata
```

## Pattern generateMetadata

```tsx
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
  // fetch data...
  return {
    title: `${data.title} — Jurnalis Hukum Bandung`,
    description: data.excerpt?.slice(0, 155) || "...",
    alternates: { canonical: `${appUrl}/path/${params.slug}` },
    openGraph: {
      title: data.title,
      description: data.excerpt?.slice(0, 200),
      type: "article",
      url: `${appUrl}/path/${params.slug}`,
      siteName: "Jurnalis Hukum Bandung",
      locale: "id_ID",
      images: [{ url: data.image || `${appUrl}/logo-jhb.png`, width: 1200, height: 630, alt: data.title }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@jurnalishukumbdg",
      title: data.title,
      description: data.excerpt?.slice(0, 200),
      images: [data.image || `${appUrl}/logo-jhb.png`],
    },
    robots: { index: true, follow: true },
  };
}
```

## Output

Setelah selesai, laporkan:
- Halaman yang diaudit
- Issue yang ditemukan + diperbaiki
- Preview metadata final

→ Kembalikan ke orchestrator `/seo` atau sarankan: **"`/seo-schema` untuk structured data."**
