# Perf-Vitals — Core Web Vitals Specialist

Specialist agent untuk Core Web Vitals: LCP, CLS, INP, FCP, TTFB.

## Input

$ARGUMENTS — area: `audit`, `lcp`, `cls`, `inp`, `lab-test`

## Tugas Spesifik

- Measure & optimize Core Web Vitals
- Field data (CrUX) vs Lab data (Lighthouse)
- Specific optimization per metric
- Monitor regression

TIDAK menangani: bundle optimization umum (→ `/perf-bundle`), DB queries (→ `/db-query`).

## Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5 – 4s | > 4s |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1 – 0.25 | > 0.25 |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200 – 500ms | > 500ms |
| **FCP** (First Contentful Paint) | ≤ 1.8s | 1.8 – 3s | > 3s |
| **TTFB** (Time to First Byte) | ≤ 0.8s | 0.8 – 1.8s | > 1.8s |

## LCP Optimization

**Identifikasi LCP element:**
- Homepage: hero image banner
- Artikel: featured image atau judul
- Kategori: first article card

**Fixes:**
```tsx
// 1. priority={true} untuk LCP image
<Image
  src={heroImage}
  priority
  fetchPriority="high"
  alt="..."
  width={1200}
  height={630}
/>

// 2. Preload LCP resource di <head>
<link rel="preload" as="image" href="/hero.webp" fetchPriority="high" />

// 3. Preconnect ke image CDN
<link rel="preconnect" href="https://images.domain.com" crossOrigin="anonymous" />

// 4. Server-side: optimize ISR revalidate + TTFB
// 5. Hindari client-side rendering untuk LCP content
```

## CLS Optimization

**Penyebab CLS umum:**
- Image tanpa dimensi → reserved space shift
- Font swap → text reflow
- Dynamic content insertion (ads, embeds)
- CSS animations pada layout properties

**Fixes:**
```tsx
// 1. Image dengan dimensi pasti
<Image src={...} width={800} height={450} />

// 2. Font dengan swap + fallback metrics
import { Source_Sans_3 } from "next/font/google";
const font = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,  // prevents shift on load
});

// 3. Aspect ratio container untuk dynamic content
<div style={{ aspectRatio: "16/9" }}>
  <iframe src={videoEmbed} />
</div>

// 4. Reserve space untuk ads
<div className="min-h-[250px]"> {/* reserved */}
  <BannerAd />
</div>
```

## INP Optimization

**Penyebab INP poor:**
- Event handler yang blocking (> 50ms long task)
- Heavy computation di main thread
- Large hydration
- Too many components re-render

**Fixes:**
```tsx
// 1. Debounce input handlers
const debouncedSearch = useDebouncedCallback(handleSearch, 300);

// 2. Offload heavy work ke Web Worker
const worker = new Worker(new URL("./worker.ts", import.meta.url));

// 3. useTransition untuk non-urgent updates
const [isPending, startTransition] = useTransition();
startTransition(() => setState(newValue));

// 4. Lazy load below-the-fold components
const HeavyComponent = dynamic(() => import("./Heavy"), {
  ssr: false,
  loading: () => <Skeleton />
});

// 5. React.memo untuk prevent unnecessary re-render
const Card = memo(function Card({ data }) { ... });
```

## Measurement Tools

### Field Data (Real User Monitoring)

1. **Google Search Console** → Core Web Vitals report
2. **PageSpeed Insights** → field data dari CrUX
3. **Web Vitals JS lib** — collect data sendiri:

```tsx
// src/components/WebVitalsTracker.tsx
import { onCLS, onINP, onLCP } from "web-vitals";

useEffect(() => {
  onCLS(({ value }) => { trackMetric("CLS", value); });
  onINP(({ value }) => { trackMetric("INP", value); });
  onLCP(({ value }) => { trackMetric("LCP", value); });
}, []);
```

Simpan ke GA4 atau custom endpoint untuk analisis.

### Lab Data

1. **Lighthouse** (Chrome DevTools) — quick check
2. **PageSpeed Insights** — standardized lab + field
3. **WebPageTest** — detailed waterfall

## Audit Workflow

### audit — Full Core Web Vitals audit

1. Check halaman penting:
   - Homepage
   - Artikel (sample 3: long, short, dengan banyak image)
   - Kategori (most visited)
   - Search

2. Untuk tiap halaman, run:
   ```bash
   # Local Lighthouse via Chrome DevTools atau CLI
   npx lighthouse https://jurnalishukumbandung.com/ \
     --only-categories=performance \
     --output=json
   ```

3. Identifikasi metric yang poor/needs improvement

4. Apply fixes sesuai section di atas

### Output
```
## Core Web Vitals Audit

### Homepage
- LCP: 2.1s ✅
- CLS: 0.08 ✅
- INP: 180ms ✅

### Artikel (sample)
- LCP: 3.2s ⚠️ Needs Improvement
  Root cause: featured image tanpa priority
  Fix: add priority={true}, preload
- CLS: 0.05 ✅
- INP: 220ms ⚠️
  Root cause: comment section hydration
  Fix: dynamic import
```

## Chain ke

- `/perf-bundle` — bundle-level optimization
- `/seo-image` — image optimization
- `/cache` — ISR/CDN setup
- `/deploy` — setelah fix, verify field data

## Aturan

- Optimasi LCP dulu (impact terbesar ke UX)
- Measure setelah setiap fix — jangan optimize blind
- Field data > lab data (real user experience matters)
- JANGAN sacrifice SEO untuk vitals (keep server render)
- Core Web Vitals = faktor ranking Google — prioritaskan