# Cache — Caching Strategy Specialist

Specialist agent untuk caching: ISR, API cache, Cloudflare CDN, browser cache.

## Input

$ARGUMENTS — area: `audit`, `isr`, `api`, `cdn`, `invalidate [path]`

## Tugas Spesifik

- Configure ISR revalidation per halaman
- API response caching headers
- Cloudflare CDN rules
- Browser cache headers (Cache-Control)
- Cache invalidation strategy

TIDAK menangani: database query optimization (→ `/db-query`).

## Layer Caching JHB

```
Browser Cache
    ↓
Cloudflare CDN (edge)
    ↓
Next.js ISR (server)
    ↓
Next.js Data Cache
    ↓
Database
```

## ISR Configuration per Route

| Route | Strategy | Revalidate |
|---|---|---|
| `/` (homepage) | ISR | 60s |
| `/berita/[slug]` | ISR | 300s (5 min) |
| `/kategori/[slug]` | ISR | 120s (2 min) |
| `/tag/[slug]` | ISR | 300s |
| `/penulis/[slug]` | ISR | 120s |
| `/tentang` | Static | manual deploy |
| `/redaksi` | ISR | 3600s (1 jam) |
| `/search` | Dynamic | no cache |
| `/panel/*` | Dynamic | no cache |
| `/api/trending` | ISR | 60s |
| `/api/search/suggest` | Dynamic | no cache |

## Implementation

**ISR di halaman:**
```tsx
// src/app/berita/[slug]/page.tsx
export const revalidate = 300;
```

**On-demand revalidation:**
```tsx
// setelah artikel di-edit:
import { revalidatePath } from "next/cache";
revalidatePath(`/berita/${slug}`);
revalidatePath("/"); // homepage
revalidatePath(`/kategori/${category.slug}`);
```

**API cache headers:**
```typescript
return NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  },
});
```

**Static assets (images, css, js):**
Next.js auto-set Cache-Control: `public, max-age=31536000, immutable`

## Cloudflare Page Rules

Recommended rules (set di dashboard Cloudflare):

```
1. /api/* → Cache Level: Bypass (API tidak boleh cached di edge)
2. /panel/* → Cache Level: Bypass (private content)
3. /_next/static/* → Cache Level: Cache Everything, Edge TTL: 1 year
4. /public/* → Cache Level: Cache Everything, Edge TTL: 1 month
5. / → Cache Everything, Edge TTL: 2 min, Browser TTL: 30s
6. /berita/* → Cache Everything, Edge TTL: 5 min
```

## Cache Invalidation

### On-demand (via API)

Endpoint: `/api/revalidate?path=[path]&secret=[SECRET]`

```typescript
// src/app/api/revalidate/route.ts
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  const secret = searchParams.get("secret");

  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Invalid secret" }, { status: 401 });
  }

  revalidatePath(path || "/");
  return Response.json({ revalidated: true });
}
```

### Trigger revalidation

Setelah operation tertentu, invalidate cache:

| Event | Invalidate |
|---|---|
| Artikel baru published | `/`, `/berita/[slug]`, `/kategori/[cat]` |
| Artikel di-edit | `/berita/[slug]` |
| Artikel di-unpublish | `/`, `/berita/[slug]` |
| Kategori baru | `/`, `/kategori` |
| Tag baru | `/tag/[slug]` |

## Cloudflare Purge

Untuk global purge:
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/[ZONE_ID]/purge_cache" \
  -H "Authorization: Bearer [CF_API_TOKEN]" \
  -H "Content-Type: application/json" \
  --data '{"files":["https://jurnalishukumbandung.com/berita/xxx"]}'
```

Atau purge all (gunakan sparingly):
```json
{"purge_everything": true}
```

## Audit Cache

### audit — Full cache audit

1. Scan semua halaman untuk `export const revalidate` dan `export const dynamic`
2. Cek API routes untuk Cache-Control headers
3. Cek Cloudflare page rules (via dashboard atau API)
4. Test cache hit rate via Cloudflare analytics

Output:
```
## Cache Audit

### ISR Coverage
✅ 15/18 halaman punya ISR
⚠️ /search — perlu di-dynamic (benar)
⚠️ /tentang — static OK (benar)

### API Cache Headers
✅ 8 endpoints cached
❌ 3 endpoints tanpa header (tambahkan)

### Cloudflare Cache Hit Rate
Last 24h: 78% (target: > 80%)
```

## Chain ke

- `/perf-bundle` — bundle performance
- `/seo-index` — ping GSC setelah cache invalidation
- `/vps` — monitoring setelah cache changes

## Aturan

- JANGAN cache halaman user-specific (panel, profile)
- JANGAN cache API yang return sensitive data
- ISR stale-while-revalidate OK untuk public content
- Invalidate cache setelah write operation
- Test cache behavior di Incognito (avoid browser cache lie)