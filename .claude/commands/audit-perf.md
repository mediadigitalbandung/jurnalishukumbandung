# Audit-Perf — Performance Audit Specialist

Deep audit performance: bundle, CWV, rendering, image, font, script. Read-only.

## Input
$ARGUMENTS — scope: `bundle`, `vitals`, `image`, `font`, `render` (default: all)

## Scope Spesifik

- Bundle size per route
- Core Web Vitals (LCP, CLS, INP)
- Rendering strategy (SSR/ISR/SSG)
- Image optimization (next/image, sizes, priority)
- Font loading (display, preload, subsetting)
- Third-party scripts (GA, Ads)
- Database query N+1 di server components

## Checklist

### CRITICAL
1. **Route > 250kB First Load JS** — terlalu besar, CWV rusak
2. **LCP > 4s** di mobile — major UX issue
3. **CLS > 0.25** — layout shift major
4. **Image tanpa next/image** di halaman public (bukan panel)
5. **No ISR/SSG** di halaman public yang harusnya bisa cache

### HIGH
6. **Font blocking render** — tidak pakai `display: swap`
7. **Missing `priority` di LCP image** (hero, article featured)
8. **Heavy library tanpa dynamic import** (Recharts, Tiptap, dll.)
9. **Third-party script blocking** — GA tanpa `strategy="afterInteractive"`
10. **N+1 query** di server component (loop `findMany` dalam loop)
11. **Unoptimized images** — JPG > 500kB, PNG tidak di-compress

### MEDIUM
12. **Missing image dimensions** — menyebabkan CLS
13. **No preconnect** ke critical origins (fonts, analytics)
14. **Render-blocking CSS** di `<head>`
15. **No lazy loading** untuk below-fold images
16. **Client component untuk static content** — harusnya server component

### LOW
17. **Emoji tanpa fallback font**
18. **No route prefetching** di navigation
19. **Missing service worker** (PWA offline support)

## Metodologi

```bash
# 1. Build + analyze
npx next build
# Baca output: "First Load JS" per route

# 2. Bundle analyzer (jika installed)
ANALYZE=true npx next build

# 3. Lighthouse CI
npx lighthouse https://jurnalishukumbandung.com --only-categories=performance --output=json

# 4. Find <img> (should be <Image />)
grep -rn "<img " src/app/ src/components/ | grep -v panel

# 5. Find force-dynamic that could be ISR
grep -rn "force-dynamic" src/app/

# 6. Dynamic imports
grep -rn "dynamic(" src/

# 7. Image priority check
grep -rn "priority" src/components/ | head -20
```

## Output Format

Standard (lihat `/audit-all`). Tambahkan:

```
### 📊 Performance Metrics

| Route | First Load JS | LCP | CLS | INP | Score |
|---|---|---|---|---|---|
| / | 89kB | 2.1s | 0.05 | 120ms | 92 |
| /berita/[slug] | 145kB | 3.2s | 0.12 | 180ms | 78 |
| /panel | 220kB | 4.5s | 0.08 | 240ms | 65 |

### Top 5 Heaviest Routes
1. [...]

### Top 5 Heaviest Dependencies
1. Recharts — 40kB
2. [...]

### Untapped Optimizations
- 5 routes bisa di-ISR dari force-dynamic
- 3 heavy components tidak dynamic imported
- 8 images tidak pakai next/image
```

## Chain ke

- `/perf-bundle` — fix bundle size
- `/perf-vitals` — fix CWV
- `/db-query` — fix N+1
- `/cache` — fix caching strategy
- `/audit-all` — return

## Aturan

- Run build lokal untuk ukur bundle
- Test di 3G/4G simulation untuk CWV realistic
- Fokus mobile-first (Google rank berdasarkan mobile)