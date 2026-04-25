# SEO — SEO Orchestrator

Agent utama yang mengkoordinasikan semua optimasi SEO. Spawn specialist secara paralel.

## Input

$ARGUMENTS — area target: halaman, "audit-all", "artikel", atau keyword spesifik.

## Sub-Agents yang Dikelola

| Sub-Agent | Tugas |
|---|---|
| `/seo-meta` | Title, description, OG tags, Twitter Card, canonical |
| `/seo-schema` | JSON-LD, structured data, schema.org, E-E-A-T |
| `/seo-index` | Sitemap, robots.txt, GSC ping, indexing |

## Spawn Pattern

### Full SEO Audit (default)

**Spawn 3 sub-agent PARALEL:**
```
PARALEL:
├── /seo-meta   → audit semua halaman publik
├── /seo-schema → audit semua halaman publik
└── /seo-index  → audit sitemap + robots + indexing
```

Kumpulkan semua hasil → buat consolidated report → prioritaskan fixes.

### Target Spesifik

Jika $ARGUMENTS mengarah ke area tertentu:
- "artikel" atau "berita" → spawn `/seo-meta` + `/seo-schema` untuk artikel
- "homepage" → spawn `/seo-meta` + `/seo-schema` untuk homepage
- "sitemap" atau "index" → spawn `/seo-index` saja
- "schema" atau "JSON-LD" → spawn `/seo-schema` saja
- "meta" atau "OG" → spawn `/seo-meta` saja

### Setelah Fix

Setelah semua specialist selesai:
```
SEQUENTIAL:
→ /review-quality (cek tidak ada regression)
→ /deploy (jika ada perubahan kode)
→ /seo-index ping (submit URL baru ke GSC)
```

## Consolidated Report Format

```
## SEO Audit Report — Jurnalis Hukum Bandung

### 📊 Overview
- Halaman diaudit: X
- Issues total: X (🔴 critical: X, 🟡 medium: X, 🟢 minor: X)

### 🔴 Critical (must fix)
1. [issue] — File: [...] — Fix: [...]
...

### 🟡 Medium (should fix)
...

### 🟢 Minor (nice to have)
...

### ✅ Already Good
...
```

## Routing Cerdas

| User bilang | Spawn |
|---|---|
| "fix SEO artikel" | `/seo-meta` + `/seo-schema` untuk berita/[slug] |
| "rich results error" | `/seo-schema` (structured data) |
| "halaman tidak terindex" | `/seo-index` |
| "meta description salah" | `/seo-meta` |
| "perbaiki semua SEO" | Full audit — ketiga sub-agent paralel |

## Aturan

- JANGAN ubah URL/slug yang sudah live (hilang ranking!)
- Jika ubah URL, WAJIB buat redirect 301 dulu
- Selalu gunakan keyword bahasa Indonesia untuk meta content
- Sitename selalu: "Jurnalis Hukum Bandung"
- Domain: jurnalishukumbandung.com