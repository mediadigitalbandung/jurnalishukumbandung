# Testing — Jurnalis Hukum Bandung

E2E + Performance testing setup using **Playwright** (browser automation) and **Lighthouse** (performance audit).

> **Sumber data**: tests run against **production** by default (`https://jurnalishukumbandung.com`). Override via env var. Read-only flows saja — tidak modify data production.

---

## 🚀 Quick Start

```bash
# Install once (sudah included di repo)
npm install

# Install Chromium browser binary (sekali setup)
npx playwright install chromium

# Run all E2E tests (~10-15s)
npm run test:e2e

# Run with visible browser (debug mode)
npm run test:e2e:headed

# Interactive UI mode (best for development)
npm run test:e2e:ui

# Show last HTML report
npm run test:e2e:report

# Run Lighthouse perf audit on 7 critical pages (~3-5 min)
npm run test:perf
```

---

## 📁 Folder Structure

```
playwright.config.ts             # Playwright config
tests/
├── e2e/                         # E2E smoke tests (Playwright)
│   ├── homepage.spec.ts        # 7 tests
│   ├── article.spec.ts         # 4 tests
│   ├── category.spec.ts        # 2 tests
│   ├── search.spec.ts          # 3 tests
│   └── sitemap.spec.ts         # 5 tests
└── perf/
    ├── lighthouse.ts            # Lighthouse runner
    └── reports/                 # Generated HTML reports (gitignored)

playwright-report/               # Playwright HTML report (gitignored)
test-results/                    # Failed test artifacts (gitignored)
```

---

## 🧪 E2E Tests (Playwright)

**Coverage saat ini: 21 tests across 5 spec files.**

### Skenario yang Di-cover

| Spec | Test | Apa yang Dicek |
|------|------|----------------|
| `homepage.spec.ts` | HTTP 200 + title | Homepage 200, title contains "Jurnalis Hukum Bandung" |
| | Header & nav visible | Logo, navigation kategori |
| | Renders ≥1 article | At least 1 link `/berita/[slug]` |
| | Footer present | `<footer>` element ada |
| | JSON-LD schema | `application/ld+json` script ada, schema.org content |
| | Search form in header | Form dengan action="/search" |
| | No critical console errors | <5 unhandled errors (excludes hydration React #418/423/425 — known) |
| `article.spec.ts` | First article click | Click homepage → /berita/slug renders |
| | NewsArticle JSON-LD | Schema valid, contains headline/datePublished/author/publisher with `+07:00` |
| | OG + Twitter meta | og:title, og:type=article, twitter:card |
| | Author + date displayed | Body contains 4-digit year |
| `category.spec.ts` | Category page loads | /kategori/hukum-pidana 200 |
| | Header nav click | Click 2nd kategori link → loads |
| `search.spec.ts` | Direct search URL | /search?q=hukum returns content |
| | Search via header form | Submit form → navigate to /search?q=... |
| | No-result query | /search?q=zzzzzz still 200 |
| `sitemap.spec.ts` | /sitemap.xml | 200, valid XML, ≥50 URLs |
| | /news-sitemap.xml | Google News namespace, Jakarta `+07:00` timezone |
| | /image-sitemap.xml | xmlns:image, image:image tags |
| | /robots.txt | Googlebot-News + Sitemap directives |
| | Security headers | HSTS, X-Frame, CSP, etc. |

### Configuration

`playwright.config.ts`:

- **Base URL**: `process.env.PLAYWRIGHT_BASE_URL || "https://jurnalishukumbandung.com"`
- **Workers**: 4 lokal, 2 CI
- **Retries**: 1 lokal, 2 CI
- **Timeouts**: 30s test, 20s navigation, 15s action
- **User-Agent**: `JHB-Playwright-Tests/1.0 (internal QA)`
- **Tracing**: only-on-first-retry
- **Screenshots/Video**: only-on-failure

### Running Against Local Dev

```bash
# Terminal 1: start dev server
npm run dev

# Terminal 2: run tests against local
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

### Adding New Tests

1. Bikin file baru di `tests/e2e/<feature>.spec.ts`
2. Pakai pattern `test.describe("Feature", () => { ... })`
3. Test names harus deskriptif (jadi kalau fail, log jelas)
4. **JANGAN** test mutating actions di production (no comment submit, no article edit)
5. Untuk auth-protected flows, simpan credentials di `.env.test` (gitignored)

---

## 🔬 Performance Audit (Lighthouse)

**Pages yang di-audit (default: 7 critical pages):**

| Page | Path |
|------|------|
| Homepage | `/` |
| Article list | `/berita` |
| Category (Hukum Pidana) | `/kategori/hukum-pidana` |
| Search | `/search?q=hukum` |
| Redaksi | `/redaksi` |
| Tentang | `/tentang` |
| Kontak | `/kontak` |

**Metrics yang di-track:**

| Score | What | Target |
|-------|------|--------|
| Performance | Load + interaction speed | ≥90 |
| Accessibility | Screen reader, keyboard, semantic HTML | ≥90 |
| Best Practices | HTTPS, no errors, image aspect ratio | ≥90 |
| SEO | Meta tags, robots, structured data | ≥95 |
| FCP | First Contentful Paint | <1.8s |
| LCP | Largest Contentful Paint | <2.5s |
| TBT | Total Blocking Time | <200ms |
| CLS | Cumulative Layout Shift | <0.1 |

### Output

- HTML reports per halaman: `tests/perf/reports/<timestamp>-<page>.html`
- Summary JSON: `tests/perf/reports/<timestamp>-summary.json`
- Console table dengan score color-coded (green ≥90, yellow 50-89, red <50)
- Exit code 1 kalau ada score <50 (regression alert)

### Sample Output

```
┌─────────────────────┬──────┬──────┬──────┬──────┬────────┬────────┬────────┬──────┐
│ Page                │ Perf │ A11y │  BP  │ SEO  │  FCP   │  LCP   │   TBT  │ CLS  │
├─────────────────────┼──────┼──────┼──────┼──────┼────────┼────────┼────────┼──────┤
│ homepage            │  64  │  91  │  92  │  100 │  1.52s │  6.98s │  470ms │ 0.000│
│ berita-list         │  78  │  91  │  92  │  100 │  1.64s │  4.95s │  186ms │ 0.041│
│ category-pidana     │  82  │  95  │  92  │   92 │  1.39s │  4.67s │  121ms │ 0.041│
│ search-hukum        │  72  │  95  │  92  │   61 │  1.39s │ 11.55s │  181ms │ 0.041│
│ redaksi             │  90  │  91  │  92  │  100 │  1.39s │  3.37s │  147ms │ 0.041│
│ tentang             │  87  │  91  │  92  │  100 │  1.55s │  3.38s │  232ms │ 0.041│
│ kontak              │  94  │  85  │  92  │  100 │  1.40s │  2.92s │  113ms │ 0.041│
└─────────────────────┴──────┴──────┴──────┴──────┴────────┴────────┴────────┴──────┘
```

### Run Against Local

```bash
PERF_BASE_URL=http://localhost:3000 npm run test:perf
```

---

## ⚠️ Known Issues (Tracked, Not Blocking Tests)

### 1. React Hydration Errors di Homepage

**Errors:** Minified React error #418, #423, #425

**Impact:** Tidak break functionality (page render OK), tapi muncul di browser console.

**Likely cause:** Server-rendered HTML mismatch dengan client. Investigate:
- Date/timezone formatting yang berbeda server vs client
- Conditional render based on `window.localStorage` di SSR
- Random values (`Math.random()`) tanpa seed

**Status:** Whitelisted di `homepage.spec.ts` (test pass). To-do separate fix.

### 2. Homepage LCP slow (~7s)

**Impact:** Homepage Performance score 64 (yellow) — terutama LCP.

**Likely cause:** Banyak banner ad components, hero slider dengan multiple images, atau heavy hydration.

**Recommendation:** Lazy-load below-fold ads + use `<Image>` priority hint untuk hero. Tracked terpisah.

### 3. Search page SEO low (61)

**Impact:** /search?q=... punya SEO score 61 — likely missing meta description / canonical.

**Recommendation:** Add `<meta name="robots" content="noindex">` di search results page (search results shouldn't be indexed).

---

## 🔄 CI Integration (Future)

Tests ready untuk dipasang di GitHub Actions:

```yaml
# .github/workflows/e2e.yml
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🆘 Troubleshooting

| Error | Fix |
|-------|-----|
| `Cannot find module 'lighthouse'` | `npm install -D lighthouse chrome-launcher` |
| `Browser executable not found` | `npx playwright install chromium` |
| Tests timeout | Site might be down — `curl -I https://jurnalishukumbandung.com/` to verify |
| EPERM cleanup error (Windows) | Non-fatal, reports already saved. Bisa di-ignore. |
| 502 from production | VPS rebuild needed. Run `/deploy` skill or `ssh root@145.79.15.99 "cd /var/www/jhb && rm -rf .next && npm run build && pm2 restart jhb"` |
