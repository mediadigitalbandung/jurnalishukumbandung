# SEO-Image — Image SEO Specialist

Specialist agent untuk image SEO: alt text, filename, compression, next/image config.

## Input

$ARGUMENTS — area: `audit`, `alt-text`, `compress`, `article [id]`

## Tugas Spesifik

- Alt text quality audit & generation
- Filename SEO (descriptive, keyword)
- Image compression & format (WebP)
- next/image proper usage
- Lazy loading & priority

## Image SEO Checklist

### 1. Alt Text (WAJIB)

```
[ ] Setiap <Image> atau <img> punya alt
[ ] Alt deskriptif (bukan "image" atau nama file)
[ ] Alt mengandung konteks (siapa, apa, dimana)
[ ] Keyword relevan di alt (natural, bukan stuffing)
[ ] Alt maks 125 karakter
[ ] Bukan duplicate dengan caption
```

**❌ Bad:**
```jsx
<Image src="/img.jpg" alt="foto" />
<Image src="/img.jpg" alt="sidang" />
```

**✅ Good:**
```jsx
<Image src="/sidang-korupsi-pn-bandung.jpg" alt="Sidang kasus korupsi Kadis PUPR Bandung di PN Bandung dengan jaksa membacakan dakwaan" />
```

### 2. Filename SEO

Format yang benar:
```
❌ IMG_20250422_123456.jpg
❌ foto-1.jpg
❌ upload.png

✅ sidang-korupsi-kadis-pupr-bandung.jpg
✅ putusan-pn-bandung-kasus-penipuan.webp
✅ kantor-advokat-bandung-2025.jpg
```

Aturan:
- Kebab-case (dash separator)
- Keyword di awal filename
- Maks 5-7 kata
- Ekstensi: .webp (primary), .jpg (fallback)

### 3. Format & Compression

```
[ ] Gunakan WebP sebagai primary format
[ ] Fallback JPG untuk older browsers (next/image handles auto)
[ ] PNG hanya untuk logo/icon dengan transparency
[ ] Quality: 75-85 (sweet spot)
[ ] Ukuran file: < 200KB untuk featured image
[ ] Ukuran file: < 100KB untuk inline images
```

Tool compress (di server):
```bash
# Gunakan sharp di API upload route
# Sudah ada di src/app/api/upload/route.ts
```

### 4. next/image Proper Usage

```tsx
// ✅ Dengan sizes (responsive)
<Image
  src={article.featuredImage}
  alt={generateAltText(article)}
  width={1200}
  height={630}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
  priority={isAboveTheFold}
  quality={80}
  className="..."
/>

// ❌ Tanpa sizes (layout shift risk)
<Image src={...} alt={...} fill />  // tanpa sizes
```

Priority flag:
- `priority={true}` — LCP image (above-the-fold, max 1 per halaman)
- Default (lazy) — semua image lain

### 5. OG Image (1200×630)

Per halaman (via `opengraph-image.tsx`):
- `/kategori/[slug]/opengraph-image.tsx` ✓
- `/tag/[slug]/opengraph-image.tsx` ✓
- `/penulis/[slug]/opengraph-image.tsx` ✓
- `/lokasi/[slug]/opengraph-image.tsx` ✓
- Dll.

Baca `src/lib/og/template.tsx` untuk template.

## Audit Workflow

### audit — Full image SEO audit

```
1. Scan codebase untuk <img> dan <Image>
2. Untuk tiap tag:
   - Alt text ada? Deskriptif?
   - Filename SEO-friendly?
   - Format optimal?
   - Sizes prop ada?
3. Hitung statistik:
   - Total images: X
   - Missing alt: X
   - Generic alt ("image", "foto"): X
   - Bad filename: X
```

### alt-text — Generate alt for missing

Jika artikel punya image tanpa alt:
1. Baca konteks artikel (judul, excerpt, nearby paragraph)
2. Generate alt text natural:
   ```
   [Deskripsi visual] pada [konteks artikel] di [lokasi/waktu]
   ```
3. Update artikel content

### article [id]

Optimasi semua image di 1 artikel:
- Update alt text
- Rename file jika perlu (dengan redirect dari old URL)
- Add sizes prop
- Set priority untuk featured image

## Chain ke

- `/seo-meta` — OG image update
- `/perf-bundle` — image optimization for performance
- `/media` — upload new optimized images

## Aturan

- JANGAN rename image yang sudah ter-index tanpa redirect
- Alt text bahasa Indonesia (audience lokal)
- Jangan keyword stuffing di alt (natural reading)
- Untuk decorative images, pakai `alt=""` (bukan dihapus)