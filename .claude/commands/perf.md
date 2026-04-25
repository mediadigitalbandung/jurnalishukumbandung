# Perf — Performance Orchestrator

Audit dan optimasi performa. Delegasikan ke specialist berdasarkan area bottleneck.

## Input

$ARGUMENTS — area spesifik: "db", "bundle", "homepage", "api", atau "general" untuk full audit.

## Sub-Agents yang Dikelola

| Sub-Agent | Tugas |
|---|---|
| `/db-query` | N+1 queries, missing indexes, pagination, Promise.all |
| `/perf-bundle` | Bundle size, lazy loading, rendering strategy, Core Web Vitals |

## Routing Logic

**Identifikasi bottleneck dulu:**

| Gejala | Delegate ke |
|---|---|
| Halaman/API lambat respond | `/db-query` |
| First Load JS besar (> 100kB) | `/perf-bundle` |
| Build output warning bundle besar | `/perf-bundle` |
| Gambar lambat load | `/perf-bundle` |
| Homepage lambat di mobile | Keduanya — paralel |
| "General" atau tidak tahu | Keduanya — paralel |

## Spawn Pattern

### Full Performance Audit

**Spawn 2 sub-agent PARALEL:**
```
PARALEL:
├── /db-query    → audit semua query, indexes, N+1
└── /perf-bundle → audit bundle size, images, rendering strategy
```

Kumpulkan hasil → buat performance report gabungan → prioritaskan fixes.

### Targeted

- `perf db` → spawn `/db-query` saja
- `perf bundle` atau `perf frontend` → spawn `/perf-bundle` saja
- `perf homepage` → spawn keduanya tapi fokus ke homepage

## Consolidated Report Format

```
## Performance Report

### 🗄️ Database (by /db-query)
- N+1 queries ditemukan: X
- Missing indexes: X
- Queries dioptimasi: X
- Est. improvement: X ms

### 📦 Bundle (by /perf-bundle)
- Routes > 100kB: X
- Dynamic imports ditambah: X
- Images dioptimasi: X
- Rendering strategy diubah: X

### 🎯 Core Web Vitals (estimasi)
- LCP: sebelum X → sesudah X
- CLS: sebelum X → sesudah X
```

## Setelah Optimasi

```
SEQUENTIAL:
→ npx next build (verifikasi tidak ada error baru + lihat bundle size)
→ /review-quality (cek tidak ada regression)
→ /deploy
```

## Aturan

- Jangan ubah behavior/fitur — hanya optimasi
- Test build setelah setiap optimasi
- Prioritaskan high-impact & low-risk
- Jangan premature optimize — ukur dulu sebelum optimasi
- Jangan hapus `force-dynamic` tanpa pahami konsekuensinya