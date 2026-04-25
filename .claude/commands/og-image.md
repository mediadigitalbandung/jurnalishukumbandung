# OG-Image — Open Graph Image Generator

Specialist agent untuk generate OG image dinamis via Next.js `opengraph-image.tsx`.

## Input

$ARGUMENTS — area: `audit`, `create [route]`, `template-update`

## Tugas Spesifik

- Generate dynamic OG image per route (1200×630)
- Maintain `src/lib/og/template.tsx` — base renderer
- Create `opengraph-image.tsx` per dynamic route
- Twitter image consistency

## Template yang Ada

Baca dulu `src/lib/og/template.tsx`:
- `renderOgImage({ badge, title, subtitle, accent })`
- Outputs ImageResponse 1200×630
- Brand: goto-green accent, JHB badge

## Routes yang Sudah Punya OG Image

```
src/app/kategori/[slug]/opengraph-image.tsx
src/app/tag/[slug]/opengraph-image.tsx
src/app/penulis/[slug]/opengraph-image.tsx
src/app/lokasi/[slug]/opengraph-image.tsx
src/app/topik/opengraph-image.tsx
src/app/redaksi/opengraph-image.tsx
```

## Routes yang Perlu Ditambah

- `src/app/berita/[slug]/opengraph-image.tsx` — artikel individu
- `src/app/tentang/opengraph-image.tsx` — halaman tentang
- `src/app/search/opengraph-image.tsx` — halaman search
- `src/app/opengraph-image.tsx` — homepage default (if missing)

## Pattern Implementation

```tsx
// src/app/[route]/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { renderOgImage } from "@/lib/og/template";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Jurnalis Hukum Bandung";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: { slug: string } }) {
  const data = await prisma.someModel.findFirst({
    where: { slug: params.slug }
  });

  return renderOgImage({
    badge: "BERITA HUKUM",
    title: data?.title?.slice(0, 80) || "Artikel",
    subtitle: data?.category?.name || "Jurnalis Hukum Bandung",
    accent: "goto-green",
  });
}
```

## Template Customization

Untuk route berbeda, berikan parameter berbeda:

| Route | Badge | Title | Subtitle |
|---|---|---|---|
| `/berita/[slug]` | "BERITA HUKUM" | article.title | category.name |
| `/kategori/[slug]` | "KATEGORI" | category.name | article count |
| `/tag/[slug]` | "TOPIK" | tag.name | article count |
| `/penulis/[slug]` | "JURNALIS" | user.name | specialization |
| `/lokasi/[slug]` | "LOKASI" | lokasi.name | article count |
| `/tentang` | "TENTANG" | "Jurnalis Hukum Bandung" | "Media Hukum Terpercaya" |

## Audit

### audit — Cek semua OG image
1. List semua route dynamic yang harusnya punya OG image
2. Cek file `opengraph-image.tsx` ada atau tidak
3. Test render 1 sample per route:
   ```
   curl https://jurnalishukumbandung.com/berita/[slug]/opengraph-image
   ```
4. Cek dimensi output = 1200×630
5. Cek twitter-image.tsx (jika perlu variant)

### create [route] — Tambah OG image baru
1. Identifikasi data source untuk route
2. Buat `opengraph-image.tsx` pakai template
3. Test dengan curl setelah deploy
4. Validate di: https://www.opengraph.xyz/

### template-update — Update design
Jika user mau update brand design OG:
1. Edit `src/lib/og/template.tsx`
2. Semua OG image otomatis ter-update (karena pakai helper)
3. Note: cache OG image di socmed perlu time untuk refresh

## Performance

- `runtime = "nodejs"` untuk akses Prisma
- Jika tidak butuh DB query: `runtime = "edge"` lebih cepat
- Avoid heavy font loading (limit ke 2 weights)

## Chain ke

- `/seo-meta` — pastikan meta og:image reference ke /opengraph-image
- `/deploy` — setelah OG image baru ditambah

## Aturan

- Dimensi WAJIB 1200×630 (standar OG)
- Text size cukup besar (pikir thumbnail di WA/FB)
- Brand consistency: goto-green + JHB logo
- Test di: Facebook Debugger, Twitter Card Validator, LinkedIn Inspector
- Cache OG: bisa 24 jam di socmed — update tidak langsung reflected