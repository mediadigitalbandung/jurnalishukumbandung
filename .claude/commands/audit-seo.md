# Audit-SEO — SEO Audit Specialist

Deep audit SEO technical + on-page. Read-only.

## Input
$ARGUMENTS — scope: `meta`, `schema`, `links`, `index`, `content` (default: all)

## Scope Spesifik

- Meta tags (title, description, canonical, OG, Twitter)
- Structured data (JSON-LD) — NewsArticle, Organization, BreadcrumbList, FAQ, HowTo
- Internal linking density & coverage
- Sitemap & robots.txt
- Heading hierarchy (H1-H6)
- URL structure & slugs
- Pagination (rel=prev/next)
- Hreflang (jika multi-language)

## Checklist

### CRITICAL
1. **Halaman tanpa `<title>`** — scan semua `page.tsx` di `src/app/`
2. **Multiple H1 per halaman** — semantic error
3. **Missing canonical** di halaman public
4. **robots.txt block halaman kritis** — cek `/public/robots.txt`
5. **Sitemap tidak include published articles**
6. **Schema.org error** — validate di Rich Results Test

### HIGH
7. **Meta description kosong atau > 160 char** di halaman public
8. **OG image missing** (tidak ada `opengraph-image.tsx` atau `og.image` di metadata)
9. **Internal links < 3** per artikel (topic cluster lemah)
10. **Alt text kosong** di artikel images
11. **Breadcrumb schema missing**
12. **NewsArticle schema incomplete** (missing `datePublished`, `author`, `image`)

### MEDIUM
13. **URL slug > 75 char** — terlalu panjang
14. **Title > 60 char** — truncated di SERP
15. **Heading skip level** (H2 → H4 tanpa H3)
16. **Duplicate title** di multiple pages
17. **Thin content** (< 300 words) di published articles
18. **No rel=nofollow** di external/sponsor links

### LOW
19. **Missing hreflang** (jika ada multi-lang content)
20. **No rel=prev/next** di pagination
21. **Broken internal links** (404)

## Metodologi

```bash
# 1. Title/description scan
grep -rn "export const metadata" src/app/

# 2. H1 count per page
grep -rn "<h1" src/app/ --include="*.tsx"

# 3. JSON-LD presence
grep -rn "application/ld+json" src/app/

# 4. robots.txt check
cat public/robots.txt

# 5. Sitemap
curl https://jurnalishukumbandung.com/sitemap.xml | head -50

# 6. OG image files
find src/app -name "opengraph-image*"

# 7. Alt text check (for articles)
# (DB query needed — via API)
```

Test live:
- https://search.google.com/test/rich-results
- https://www.google.com/webmasters/tools/mobile-friendly
- https://validator.schema.org/

## Output Format

Standard format (lihat `/audit-all`). Tambahkan metric khusus SEO:

```
### 📊 SEO Metrics
- Halaman total: [N]
- Halaman dengan metadata: [N] ([%])
- OG image coverage: [N/N]
- JSON-LD coverage: [N/N]
- Average internal links per artikel: [N]
- Articles < 300 words: [N]
- Duplicate titles: [N]
- Sitemap URLs: [N]
```

## Chain ke

- `/seo-meta` — fix metadata issues
- `/seo-schema` — fix structured data
- `/seo-internal-links` — improve linking
- `/seo-index` — sitemap/indexing fixes
- `/audit-all` — return ke orchestrator

## Aturan

- Read-only — jangan edit metadata
- Validate schema via Rich Results Test jika live
- Check di mobile + desktop (responsive SEO)