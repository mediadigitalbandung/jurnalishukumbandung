# Perf-Bundle — Bundle & Next.js Performance Specialist

Specialist agent untuk optimasi bundle size, lazy loading, rendering strategy, dan Core Web Vitals.
Dipanggil oleh `/perf` (orchestrator) atau langsung untuk frontend performance issues.

## Input

$ARGUMENTS — area spesifik: "homepage", "artikel", "bundle", "images", atau "vitals"

## Tugas Spesifik

Specialist ini HANYA menangani:
- Bundle size (First Load JS)
- Dynamic imports / lazy loading
- Next.js rendering strategy (SSR vs ISR vs SSG)
- Image optimization
- Font loading
- Third-party script loading
- Core Web Vitals (LCP, CLS, FID/INP)

TIDAK menangani: database queries (→ `/db-query`).

## Audit Checklist

### 1. Bundle Size (Target: < 100kB First Load JS per route)

```bash
npx next build
# Cek output: route sizes, First Load JS
```

Identifikasi:
- Route mana yang > 100kB?
- Library apa yang paling besar? (`npx next build --debug`)

**Common fixes:**
```typescript
// ❌ Import seluruh library
import { Chart } from "recharts";

// ✅ Dynamic import untuk komponen berat
const Chart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false });
```

### 2. Dynamic Imports

Library yang WAJIB di-dynamic import:
- Recharts (semua chart components)
- Rich text editor (Tiptap, Quill)
- PDF viewer
- Map components
- Heavy UI libraries

```typescript
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(() => import("@/components/HeavyComponent"), {
  loading: () => <div className="animate-pulse h-64 bg-surface-secondary rounded-[12px]" />,
  ssr: false,  // untuk komponen yang tidak perlu SSR
});
```

### 3. Rendering Strategy

| Halaman | Strategy | Config |
|---|---|---|
| Homepage | ISR | `export const revalidate = 60` |
| Artikel detail | ISR | `export const revalidate = 300` |
| Kategori/tag | ISR | `export const revalidate = 120` |
| Search | SSR | `export const dynamic = "force-dynamic"` |
| Panel admin | CSR | `"use client"` |

Cek halaman yang pakai `force-dynamic` tapi tidak perlu — bisa di-ISR untuk cache hit.

### 4. Image Optimization

```typescript
// ✅ next/image dengan proper configuration
<Image
  src={src}
  alt={alt}
  width={800}
  height={450}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isAboveTheFold}  // hanya untuk LCP image
  loading={isAboveTheFold ? "eager" : "lazy"}
  className="..."
/>
```

Cari `<img>` biasa (bukan next/image) — ganti semua yang bisa.

### 5. Font Loading

Cek `src/app/layout.tsx`:
- Google Fonts menggunakan `next/font/google` ✓
- `display: "swap"` ✓
- `variable` mode untuk CSS variables ✓
- Preload critical font: `<link rel="preload">` ✓

### 6. Third-Party Scripts

Cek scripts di layout.tsx:
- Google Analytics: gunakan `strategy="afterInteractive"` atau component lazy
- Tidak ada render-blocking scripts di `<head>`

### 7. Core Web Vitals Check

**LCP (Largest Contentful Paint) — target < 2.5s:**
- Hero image harus `priority={true}`
- Preload logo: `<link rel="preload" as="image" fetchPriority="high">`
- Font preconnect ada

**CLS (Cumulative Layout Shift) — target < 0.1:**
- Image selalu punya `width` dan `height`
- Font loading tidak menyebabkan shift (swap OK dengan reserved space)
- Ad placeholders punya ukuran tetap

**INP (Interaction to Next Paint) — target < 200ms:**
- Event handlers tidak blocking
- Heavy computation di Web Worker atau debounced

## Output

```
## Bundle Optimization Report

### Bundle Size
| Route | Before | After | Saving |
|---|---|---|---|
| / | 145kB | 89kB | -39% |

### Changes Applied
- Dynamic import: Recharts (saved ~40kB)
- ISR strategy: 3 halaman dari force-dynamic
- Image optimization: 5 <img> → next/image
```

→ Laporkan ke `/perf` (orchestrator) atau sarankan: **"`/deploy` untuk apply optimasi."**