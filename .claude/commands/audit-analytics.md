# Audit-Analytics — Analytics Tracking Audit Specialist

Deep audit GA4, Search Console, Cloudflare tracking consistency, event coverage. Read-only.

## Scope

- Google Analytics 4 (GA4) integration
- Google Search Console data access
- Cloudflare Analytics API
- Event tracking coverage (scroll, click, search, article read)
- Conversion tracking
- Data consistency antar platform
- Tracking di server components vs client

## Checklist

### CRITICAL
1. **GA tracking missing** di halaman publik utama
2. **Service account expired** untuk GSC/GA4 API
3. **Tracking user data tanpa consent** — GDPR/UU PDP issue

### HIGH
4. **No pageview tracking** di route change (Next.js SPA)
5. **Event tracking tidak standard** — inconsistent event names
6. **No conversion goals** defined (newsletter, subscribe)
7. **GA ID missing** di environment
8. **Duplicate tracking** — GA loaded 2x (GTM + direct)

### MEDIUM
9. **No scroll depth tracking** — kritis untuk artikel panjang
10. **No search tracking** — internal search tidak di-track
11. **No outbound link tracking** — exit behavior hilang
12. **No error tracking** (Sentry/rollbar absent)

### LOW
13. **Custom dimensions missing** (article_author, article_category)
14. **No user properties** set (role, session_count)
15. **IP anonymization** tidak aktif (privacy concern)

## Metodologi

```bash
# 1. GA setup di layout
grep -rn "gtag\|GoogleAnalytics" src/app/layout.tsx src/components/

# 2. GA ID env
echo $NEXT_PUBLIC_GA_ID
grep NEXT_PUBLIC_GA_ID .env.example

# 3. Event tracking coverage
grep -rn "gtag.*event\|trackEvent\|logEvent" src/

# 4. Test GA4 API
curl -X POST "/api/stats/google-analytics?period=7"

# 5. Test GSC API
curl -X POST "/api/stats/google-search?period=7"

# 6. Test Cloudflare API
curl -X POST "/api/stats/cloudflare?period=7"
```

Verify di live site:
- Open DevTools > Network > `collect?v=2` calls (GA4)
- GA Realtime: https://analytics.google.com/analytics/web/#/realtime
- GSC Coverage Report

## Output Format

```
### 📊 Analytics Coverage
- GA4 loaded: [yes/no]
- Pages with tracking: [N/total]
- Events tracked: [N unique]
- Conversions defined: [N]
- Service account status: [active/expired]

### Event Catalog
| Event | Coverage | Frequency (24h) |
|---|---|---|
| page_view | 100% | 12,450 |
| article_read | 60% | 3,200 |
| search | 40% | 450 |
| scroll_depth | 0% | - |

### API Health
| Source | Status | Last Success |
|---|---|---|
| GA4 | ✓ | 2 menit lalu |
| GSC | ⚠️ | 3 jam lalu (quota) |
| Cloudflare | ✓ | 5 menit lalu |
```

## Chain ke

- `/analytics` — deep dive stats
- `/env` — fix service account credentials
- `/code` — add missing tracking events
- `/audit-all` — return