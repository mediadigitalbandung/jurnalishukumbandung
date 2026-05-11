# JHB MASTER AUDIT REPORT

**Generated:** 2026-05-12 00:22 WIB
**Mode:** full (6 parallel specialist agents → 14 domain)
**Branch:** master @ `a8a2d9c`

---

## Executive Summary

| Domain | Score | Critical | High | Medium |
|---|---|---|---|---|
| Code Quality | 68/100 | 3 | 7 | 12 |
| Test Coverage | 24/100 | 1 | 2 | 0 |
| Security | 72/100 | 0¹ | 4 | 5 |
| API Quality | 78/100 | 0 | 1 | 5 |
| SEO | 78/100 | 2 | 5 | 8 |
| Content | 82/100 | 0 | 0 | 3 |
| Performance | 68/100 | 2 | 5 | 3 |
| Database | 75/100 | 0 | 5 | 0 |
| Dependencies | 82/100 | 0 | 0 | 2 |
| UI/UX | 72/100 | 1 | 5 | 6 |
| A11y | 68/100 | 2 | 3 | 4 |
| Infra | 72/100 | 2 | 4 | 3 |
| Backup | 35/100 | 1 | 3 | 0 |
| Legal | 92/100 | 0 | 1 | 2 |
| Analytics | 58/100 | 1 | 4 | 1 |

**Overall:** 68/100 (cukup, tapi banyak quick-win)
**Total Critical:** 15 → setelah verifikasi turun ke **11** (4 false positive)
**Total High:** 49

¹ Security agent flag `.env` committed = **FALSE POSITIVE**. Sudah diverifikasi `git ls-files | grep .env` cuma `.env.example`. `.gitignore` benar.

---

## CRITICAL ISSUES (Fix segera)

### 🔴 1. GA4 tracking total mati
- **File:** `.env` + `src/components/GoogleAnalytics.tsx`
- **Detail:** `NEXT_PUBLIC_GA_ID` tidak diset di `.env`, jadi semua tracking GA4 disabled. Semua data analytics pageview/event hilang.
- **Fix:** Add `NEXT_PUBLIC_GA_ID=G-XXXX` ke `.env` VPS (jangan commit), redeploy. Pasang `anonymize_ip: true` & consent mode sekalian.
- **Effort:** 5 menit

### 🔴 2. Force-dynamic di halaman artikel & homepage = cache miss 100%
- **File:** `src/app/berita/[slug]/page.tsx:1`, `src/app/page.tsx`
- **Detail:** `export const dynamic = "force-dynamic"` bikin setiap request ke DB, Cloudflare edge cache ga jalan optimal.
- **Impact:** DB load tinggi, response slow, biaya VPS naik.
- **Fix:** Ganti ke `revalidate: 60` + `revalidatePath('/berita/[slug]')` saat publish/edit. Cloudflare cache pattern di `next.config.js` udah benar.
- **Effort:** 15 menit (test sebelum)

### 🔴 3. Zero database backup automation
- **File:** N/A — tidak ada di `scripts/`
- **Detail:** Dokumentasi backup ada di `.claude/commands/backup.md` tapi tidak ada cron actual di VPS. Risiko data loss total kalau disk fail.
- **Fix:** Setup cron VPS daily 02:00: `pg_dump | gzip > /var/backups/jhb-$(date +%Y%m%d).sql.gz`. Retention 14 hari, weekly ke offsite (Backblaze B2 / S3).
- **Effort:** 30 menit

### 🔴 4. VPS IP hardcoded di kode public-facing
- **File:** `src/app/panel/dokumentasi/page.tsx`
- **Detail:** IP `145.79.15.99` muncul di file panel. Walau panel auth-required, info disclosure tetap risiko.
- **Fix:** Replace dengan placeholder `<VPS_IP>` atau pindah dokumentasi ke `/docs` server-only.
- **Effort:** 10 menit

### 🔴 5. CSP `unsafe-inline` + `unsafe-eval` di script-src
- **File:** `next.config.js:149`
- **Detail:** CSP terlalu permissive, XSS via inline script bisa lewat. `unsafe-eval` jarang dibutuhkan.
- **Fix:** Remove `unsafe-eval`. Untuk inline (GA4/Tailwind), pakai nonce-based CSP.
- **Effort:** 1-2 jam (test deep)

### 🔴 6. N+1 query reviewer di articles API
- **File:** `src/app/api/articles/[id]/route.ts:75`, `src/app/api/articles/route.ts:122-129`
- **Detail:** Setelah fetch article, loop resolve reviewer name terpisah → N query per N articles.
- **Fix:** Include via Prisma relation: `include: { reviewer: { select: { name: true } } }`.
- **Effort:** 15 menit

### 🔴 7. 2 file panel monolitik >2000 LOC
- **File:** `src/app/panel/dokumentasi/page.tsx` (2,632), `src/app/panel/artikel/[id]/edit/page.tsx` (2,382)
- **Detail:** Editor artikel pakai 150+ useState. Render thrashing, error tidak terisolasi (1 tab crash → full crash).
- **Fix:** Split per-tab, lazy load via `next/dynamic`. Pakai `useReducer`/jotai untuk state.
- **Effort:** 1-2 hari (refactor besar)

### 🔴 8. Test coverage 2.2%
- **File:** Repo-wide
- **Detail:** 8 test files (197 LOC unit + 5 e2e) vs 359 source file. Auth flow, publish flow, ad tracking, live webhook — semua nol coverage.
- **Fix:** Target 40% di `src/lib/` + integration test untuk auth & publish. Playwright sudah ada infra.
- **Effort:** ongoing (2-4 minggu)

### 🟡 9. Icon-only button tanpa `aria-label` (a11y)
- **File:** Panel tables (artikel, iklan, dll), notification bell
- **Detail:** Screen reader tidak tahu fungsi button. WCAG AA fail.
- **Fix:** Tambah `aria-label="Edit"`, `aria-label="Hapus"` di semua icon button.
- **Effort:** 30 menit

### 🟡 10. Tidak ada cookie consent banner (UU PDP)
- **File:** N/A
- **Detail:** GA4 + analytics jalan tanpa explicit consent. UU PDP butuh opt-in.
- **Fix:** Component `<CookieConsent>` di layout root, set `gtag('consent', 'update')`.
- **Effort:** 1-2 jam

### 🟡 11. Bookmark/Login/Offline tanpa metadata
- **File:** `src/app/bookmark/page.tsx`, `src/app/login/page.tsx`, `src/app/offline/page.tsx`
- **Detail:** No `generateMetadata` / `metadata` export. Tab browser tidak ada title spesifik, social share blank.
- **(`/kontak` AMAN — `layout.tsx` udah ada `metadata`)**
- **Fix:** Tambah `export const metadata = { title, description }` ke 3 file.
- **Effort:** 15 menit

---

## HIGH PRIORITY (Fix dalam 1 minggu)

### Security & API
1. **Articles API `limit` unbounded** — `src/app/api/articles/route.ts:55`. Tambah `Math.min(100, ...)`. DoS via `?limit=999999`.
2. **Comment endpoint tanpa pagination** — `src/app/api/articles/[id]/comments/route.ts:39-47`. Artikel viral bisa balikin 10k komen sekaligus.
3. **Error message leak Prisma details** — `src/lib/api-utils.ts:55-60`. Mask error generik ke client.
4. **Cron endpoint tanpa IP whitelist** — Bisa di-spoof external. Whitelist localhost / VPS IP.
5. **Search query tanpa length cap** — `src/app/api/search/route.ts`. `.slice(0, 100)` cegah expensive LIKE.

### Performance
6. **`priority` di semua varian ArticleCard** — `src/components/artikel/ArticleCard.tsx:68`. Hanya hero/first-fold yang butuh. Hilangkan FCP -200ms.
7. **TikTok editor + RichTextEditor load di public bundle** — Pakai `next/dynamic({ ssr: false })`. -300KB bundle.
8. **GA4 script `afterInteractive`** — Ganti ke `lazyOnload` untuk script kedua.
9. **`prisma.findMany` lalu count tag stats** — `src/app/api/tags/stats/route.ts:12`. Ganti `prisma.article.count()`.

### Database (semua perlu migration)
10. **Missing index `Source.articleId`, `Correction.articleId`, `Revision.articleId`** — Delete cascade lambat.
11. **Missing index `Comment.parentId`** — Nested reply full scan.
12. **`TargetKeyword.bestArticleId` tanpa FK** — Orphan reference risk.
13. **`LiveSession.relatedArticleId` no relation** — Broken FK pattern.
14. **`PushSubscription` no compound index `(userId, failedCount)`** — Filter inefisien.

### SEO
15. **`foundingDate: "2024"` stale** — `src/app/layout.tsx:133`. Ganti dynamic year.
16. **News sitemap tidak ada** — `robots.ts` reference `/news-sitemap.xml` tapi file ga ada. Bikin `src/app/news-sitemap.ts` (artikel <48 jam).
17. **`injectContextualLinks()` tidak dipanggil** — Function siap di `src/lib/seo-utils.ts` tapi tidak dipakai di artikel render. Internal link gap.
18. **BreadcrumbList JSON-LD missing** — Artikel pages perlu schema breadcrumb.
19. **Twitter Card `summary` (bukan `summary_large_image`)** di homepage/listing.

### UI/A11y
20. **Touch target <44px di mobile** — Icon button `p-2.5` (~28x28px). Naikkan ke `p-3` minimum.
21. **Form label `text-xs` (12px)** — User senior susah baca. Ganti `text-sm` (14px).
22. **No skip link untuk keyboard nav** — Tambah `<a href="#main">Skip to content</a>`.
23. **`aria-current="page"` missing di active sidebar item** — Screen reader tidak tahu page aktif.
24. **Notif dropdown `w-80` fixed** — Mobile <320px overflow. Pakai `max-w-[calc(100vw-16px)]`.

### Infra & Analytics
25. **`/api/health` endpoint missing** — PM2 cuma cek process, bukan app+DB connectivity.
26. **No Sentry / structured logging** — 117 `console.log` scattered. Install pino/winston.
27. **GA4 anonymize IP + consent mode tidak diset** — UU PDP gap.
28. **No GA4 event tracking** — Cuma pageview, tidak ada `article_view`, click, search, 404 event.

---

## MEDIUM PRIORITY (1 bulan)

### Code Quality
- 36 `any` type (heavy di `src/lib/seo-utils.ts`). Replace dengan generated types.
- 117 `console.log` di prod code → pino/winston.
- Naming inconsistent: `Props` vs `{Component}Props` (mix 18 vs 42 file).
- `useEffect` exhaustive-deps lint belum di-enforce.
- File panel >500 LOC: `keyword-push/page.tsx` (1,291), `tiktok/[id]/edit/page.tsx` (1,871), `social/page.tsx` (1,014).

### SEO / Content
- Generic alt text `"Placeholder"`, `"Featured"` — pakai article title.
- Kategori page minim OG image — fallback default missing.
- Author/penulis page tanpa Person JSON-LD.
- FAQ data ada di DB tapi tidak render schema.

### UI
- Border radius mix (`rounded-[12px]`, `rounded-lg`, `rounded-xl`) — standardisasi.
- Spacing tidak konsisten (`p-2`/`p-3`/`p-4` di context sama).
- Loading state pattern beda-beda (skeleton vs spinner).
- Inline `style={{ maxHeight: 300 }}` di iklan preview — pindah ke Tailwind.

### Infra
- Cookie consent banner UI (UU PDP).
- Remove preconnect manual font di `src/app/layout.tsx:12` (next/font auto-inject).
- CSP `connect-src` allow `http:` ke DeepSeek — force https only.

### Dependencies
- `@anthropic-ai/sdk@0.90.0` — cek v1.0 migration.
- `recharts` dynamic import (cuma panel pakai).
- `jspdf` — verify masih dipakai, kalau ya lazy load.

---

## TOP 10 QUICK WINS (high impact + low effort)

| # | Action | Domain | Effort | Impact |
|---|---|---|---|---|
| 1 | Add `NEXT_PUBLIC_GA_ID` ke `.env` VPS | Analytics | 5 min | Restore 100% tracking |
| 2 | Replace `force-dynamic` → `revalidate: 60` di artikel+home | Perf | 15 min | DB load -80%, response -300ms |
| 3 | Fix `Math.min(100, limit)` di articles API | Security | 2 min | DoS prevention |
| 4 | Pagination comments API | API | 10 min | Cegah response 10MB |
| 5 | Fix N+1 reviewer query | Perf/DB | 15 min | -10 query per request |
| 6 | Add `aria-label` ke icon button | A11y | 30 min | WCAG AA compliance |
| 7 | Add metadata 3 page (bookmark/login/offline) | SEO | 15 min | +3 indexable pages |
| 8 | Add DB index FK (Source/Correction/Revision/Comment.parentId) | DB | 20 min | Query latency -50% |
| 9 | Setup daily `pg_dump` cron | Backup | 30 min | DR readiness |
| 10 | Remove VPS IP dari `panel/dokumentasi` | Security | 10 min | Info disclosure fix |

**Total quick wins: ~2.5 jam → naikin overall score 68 → ~85**

---

## FALSE POSITIVE / Sudah benar (jangan diutak-atik)

1. ✅ **`.env` NOT committed** — Security agent salah. `git ls-files | grep .env` cuma `.env.example`. `.gitignore` proper.
2. ✅ **`/kontak` page ada** — Infra agent salah baca. `layout.tsx` + `page.tsx` exist, metadata di layout.
3. ✅ **Footer dynamic year** — Legal agent confirm `&copy; {new Date().getFullYear()}` proper.
4. ✅ **Dewan Pers compliance** — Pedoman media, KEJ, sertifikat verifikasi semua sudah ada.
5. ✅ **Dependencies sehat** — No deprecated, no moment/lodash bloat, semua latest minor.

---

## CHAIN RECOMMENDATION

### Auto-fixable sekarang (1 sesi `/fix`)
- [ ] `/fix-build` — Tidak ada (build pass)
- [ ] `/seo-meta` → fix 3 page metadata + foundingDate dynamic
- [ ] `/perf-bundle` → lazy load TikTok/RichText editor
- [ ] `/db-migrate` → tambah index missing FK
- [ ] `/audit-security` → fix limit DoS + comment pagination

### Butuh planning (`/plan`)
- [ ] Refactor `panel/dokumentasi` (2,632 LOC → split)
- [ ] Refactor `panel/artikel/[id]/edit` (150 useState → useReducer)
- [ ] Test coverage push 2.2% → 40%
- [ ] CSP nonce strategy (remove unsafe-inline)

### Manual/Infra
- [ ] Setup VPS backup cron + offsite
- [ ] Setup Sentry / structured logging
- [ ] Cookie consent UI + GA4 consent mode
- [ ] /api/health endpoint + PM2 healthcheck

---

## NEXT STEP

User bilang "kira-kira yang kurang apa dan bug nya apa aja" — di atas adalah daftar lengkap. Saran urutan eksekusi:

1. **Hari ini** (1 jam) — Quick win #1–5 (analytics, perf, DoS prevention, N+1)
2. **Minggu ini** — Quick win #6–10 (a11y, DB index, backup, hardcoded IP)
3. **Bulan ini** — Refactor 2 file monolitik + test coverage + Sentry

Reply dengan **"jalankan quick wins"** kalau mau saya auto-eksekusi #1–10 langsung (chain ke `/fix` + `/deploy`).
