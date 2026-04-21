# Struktur Agent — Jurnalis Hukum Bandung

Dokumentasi lengkap semua agent (slash command) yang tersedia di proyek JHB, beserta hierarki, spesialisasi, dan alur pemanggilan.

**Total Agent:** 70+ (10 orchestrator + 60+ specialist)

---

## 🎯 Tier 1 — Master Orchestrators (10)

Agent level tertinggi yang mengkoordinasikan banyak specialist secara paralel.

| Orchestrator | Domain | Spawn Specialists |
|---|---|---|
| `/plan` | Master task planner | Banyak, sesuai kebutuhan task |
| `/audit-all` | Audit komprehensif seluruh proyek | 15 audit specialists paralel |
| `/fix` | Error resolution | `/fix-build` + `/fix-runtime` |
| `/review` | Quality gate sebelum deploy | `/review-quality` + `/review-security` |
| `/seo` | SEO site-wide | `/seo-meta` + `/seo-schema` + `/seo-index` + `/seo-image` + `/seo-internal-links` + `/seo-local` |
| `/perf` | Performance optimization | `/perf-bundle` + `/perf-vitals` + `/cache` + `/db-query` |
| `/deploy` | Production deployment | build → commit → push → VPS deploy |
| `/monitor` | Health check sistem | VPS + DB + API + uptime |
| `/content` | Content creation workflow | `/article-writer` + `/keyword` + `/fact-check` + `/headline` |
| `/social` | Media sosial management | `/social-ig` + `/social-fb` + `/social-caption` + `/social-template` |

---

## 🔍 Tier 2 — Audit Specialists (16)

Dipanggil oleh `/audit-all` atau individual untuk audit domain spesifik.

| Specialist | Cek Apa |
|---|---|
| `/audit-a11y` | Aksesibilitas — WCAG compliance, ARIA, keyboard nav |
| `/audit-analytics` | GA4 tracking, event firing, conversion tracking |
| `/audit-api` | API routes — auth, validation, rate limit, error handling |
| `/audit-backup` | Backup DB & media, disaster recovery readiness |
| `/audit-code` | Code quality, DRY, patterns, complexity |
| `/audit-content` | Kualitas artikel — EYD, fakta, panjang, struktur |
| `/audit-db` | Schema, indexes, query N+1, relation integrity |
| `/audit-deps` | Outdated npm packages, security vulnerabilities |
| `/audit-infra` | VPS, PM2, Nginx, SSL, DNS, Cloudflare |
| `/audit-legal` | Compliance UU ITE, Pers, privacy policy |
| `/audit-perf` | LCP, FID, CLS, TTFB, bundle size |
| `/audit-security` | OWASP Top 10, XSS, SQLi, auth bypass |
| `/audit-seo` | Meta, schema, sitemap, robots, internal links |
| `/audit-tests` | Test coverage, unit/integration tests |
| `/audit-ui` | UI consistency, responsive, design system |
| `/audit` | Audit log analysis — activity, changes, errors |

---

## 📝 Tier 2 — Content & SEO Specialists (13)

### Content Creation
| Specialist | Spesialisasi |
|---|---|
| `/article-writer` | AI penulis artikel lengkap dengan riset 3 sub-agent paralel |
| `/article-optimize` | Audit SEO per artikel (20 poin) + auto-fix metadata |
| `/headline` | Optimasi judul berita — CTR tinggi, SEO-friendly |
| `/fact-check` | Verifikasi fakta, nama, pasal, tanggal |
| `/legal-research` | Riset hukum — pasal, yurisprudensi, definisi |
| `/keyword` | Manajemen TargetKeyword, gap analysis |

### SEO Specialists
| Specialist | Spesialisasi |
|---|---|
| `/seo-meta` | Title tag, meta description, Open Graph, Twitter card |
| `/seo-schema` | JSON-LD — NewsArticle, FAQPage, BreadcrumbList |
| `/seo-index` | Sitemap, robots.txt, Google Search Console, IndexNow |
| `/seo-image` | Image alt text, file naming, compression |
| `/seo-internal-links` | Internal linking strategy, anchor text, pillar/cluster |
| `/seo-local` | Local SEO Bandung — NAP, Google Business, geo tags |

### OG & Headlines
| Specialist | Spesialisasi |
|---|---|
| `/og-image` | Generate Open Graph image dari artikel |

---

## 📱 Tier 2 — Social Media Specialists (4)

| Specialist | Spesialisasi |
|---|---|
| `/social-ig` | Instagram — draft, publish, template, status |
| `/social-fb` | Facebook — draft, publish, link_share/photo, takedown |
| `/social-caption` | AI caption 2 paragraf + hashtag optimizer |
| `/social-template` | Template gambar visual editor (sharp-based) |

---

## 🔧 Tier 2 — Dev & Infrastructure Specialists (20)

### Core Dev
| Specialist | Spesialisasi |
|---|---|
| `/code` | Eksekutor koding umum |
| `/api-new` | Buat API route baru dengan pattern konsisten |
| `/panel` | Admin panel page builder |
| `/style` | UI & styling (Tailwind, design system) |
| `/test` | Build & test validation |
| `/git-clean` | Git housekeeping — conflict, stash, branch |

### Error Handling
| Specialist | Spesialisasi |
|---|---|
| `/fix-build` | TypeScript & build errors |
| `/fix-runtime` | Runtime, API, 500 errors |
| `/review-quality` | Code patterns, DRY, naming |
| `/review-security` | Security audit sebelum merge |

### Database
| Specialist | Spesialisasi |
|---|---|
| `/db-migrate` | Schema change, Prisma migrate |
| `/db-query` | Query optimization, N+1 fix, index |

### Performance
| Specialist | Spesialisasi |
|---|---|
| `/perf-bundle` | Bundle size, Next.js chunking, tree-shake |
| `/perf-vitals` | Core Web Vitals (LCP, FID, CLS) |
| `/cache` | Caching strategy — Next.js, CDN, Redis |

### Infrastructure
| Specialist | Spesialisasi |
|---|---|
| `/vps` | VPS management — PM2, Nginx, SSH |
| `/env` | Environment variables management |
| `/cron` | Cron job management |
| `/backup` | Database & media backup |
| `/rollback` | Deployment rollback |

---

## 📊 Tier 2 — Site Features Specialists (10)

| Specialist | Spesialisasi |
|---|---|
| `/users` | User & role management |
| `/comment` | Comment system management |
| `/moderate` | Comment moderation |
| `/media` | Media upload & management |
| `/iklan` | Ads management |
| `/court-schedule` | Jadwal sidang (CourtSchedule model) |
| `/analytics` | Laporan statistik komprehensif |
| `/clean` | Clean data & media orphans |
| `/notify` | Notification system |

---

## 🗺️ Hierarki Visual Lengkap

```
┌─────────────────────────────────────────────────────────┐
│                   TIER 1 — ORCHESTRATORS                 │
└─────────────────────────────────────────────────────────┘

/plan ──── Master planner, spawn semua sesuai task

/audit-all ─┬── /audit-a11y       /audit-content
            ├── /audit-analytics  /audit-db
            ├── /audit-api        /audit-deps
            ├── /audit-backup     /audit-infra
            ├── /audit-code       /audit-legal
            ├── /audit-perf       /audit-security
            ├── /audit-seo        /audit-tests
            └── /audit-ui         /audit

/fix ──────┬── /fix-build
           └── /fix-runtime

/review ───┬── /review-quality
           └── /review-security

/seo ──────┬── /seo-meta          /seo-image
           ├── /seo-schema        /seo-internal-links
           ├── /seo-index         /seo-local
           └── /og-image

/perf ─────┬── /perf-bundle
           ├── /perf-vitals
           ├── /cache
           └── /db-query

/monitor ──┬── /vps
           ├── /cron
           └── /notify

/content ──┬── /article-writer   ──── keyword research sub-agent
           │                     ──── similar articles sub-agent
           │                     ──── legal entity sub-agent
           ├── /article-optimize ──── content analysis sub-agent
           │                     ──── keyword matching sub-agent
           ├── /keyword
           ├── /fact-check
           ├── /legal-research
           └── /headline

/social ───┬── /social-ig
           ├── /social-fb
           ├── /social-caption
           └── /social-template

/deploy ──── build → commit → push → VPS deploy (SELALU di akhir)

┌─────────────────────────────────────────────────────────┐
│           TIER 2 — INDEPENDENT SPECIALISTS               │
└─────────────────────────────────────────────────────────┘

Core Dev:    /code, /api-new, /panel, /style, /test, /git-clean
Infra:       /env, /backup, /rollback
DB:          /db-migrate, /db-query
Features:    /users, /comment, /moderate, /media, /iklan,
             /court-schedule, /analytics, /clean
```

---

## 🔄 Chaining Rules — Alur Pemanggilan

### Task Coding
```
Task besar    → /plan → /db-migrate → /api-new → /code → /panel
             → /review → /test → /deploy

Task kecil    → /code → /deploy
Bug fix       → /fix → /deploy
UI change     → /style → /review → /deploy
New API       → /api-new → /test → /deploy
DB change     → /db-migrate → /api-new → /code → /deploy
```

### Task Konten
```
Artikel baru  → /article-writer → /article-optimize
             → /seo-meta + /seo-schema + /og-image (PARALEL)
             → /social-ig + /social-fb (PARALEL)

SEO audit     → /audit-seo → /article-optimize
             → (jika konten kurang) /article-writer

Content gap   → /keyword gaps → /article-writer per topic
```

### Task Media Sosial
```
Sosmed batch    → /social dashboard → /social-ig + /social-fb (PARALEL)
Caption edit    → /social-caption → /social-ig ATAU /social-fb
Template baru   → /social-template → /social-ig ATAU /social-fb
```

### Task Audit
```
Full audit      → /audit-all → 15 specialist PARALEL → report konsolidasi
SEO-only        → /audit-seo → /seo (jika ada issue)
Security-only   → /audit-security → /review-security
Pre-deploy      → /review + /test + /audit-security → /deploy
```

### Task Infrastruktur
```
VPS error       → /vps → /fix → /deploy
Server down     → /monitor → /vps → /rollback (jika perlu)
Slow page       → /perf → /perf-bundle + /perf-vitals + /cache (PARALEL)
DB lambat       → /db-query → /audit-db
```

---

## 🎯 Quick Reference — Pilih Agent berdasarkan Intent

### "Saya mau..."

| Intent | Agent |
|---|---|
| Tulis artikel baru | `/article-writer` |
| Optimasi artikel lama | `/article-optimize` |
| Audit SEO semua artikel | `/audit-seo` |
| Post ke Instagram | `/social-ig` |
| Post ke Facebook | `/social-fb` |
| Buat template gambar sosmed | `/social-template` |
| Cek health sistem | `/monitor` |
| Lihat statistik website | `/analytics` |
| Audit lengkap proyek | `/audit-all` |
| Fix error/bug | `/fix` |
| Deploy perubahan | `/deploy` |
| Optimasi keyword | `/keyword` |
| Riset hukum untuk artikel | `/legal-research` |
| Verifikasi fakta artikel | `/fact-check` |
| Cek performa halaman | `/perf` |

---

## 💡 Prinsip Auto-Invocation

1. **User tidak perlu manggil `/agent` manual** — sistem auto-route dari prompt
2. **Paralel sebanyak mungkin** — agent independen wajib spawn bersamaan
3. **Orchestrator untuk multi-domain task** — jangan langsung ke specialist
4. **Specialist untuk domain spesifik** — lebih cepat & fokus
5. **Chain otomatis** — setelah A selesai, trigger B yang relevan
6. **`/deploy` SELALU di akhir** — tiap perubahan kode wajib auto-deploy

---

## 📁 Lokasi File Agent

Setiap agent adalah file markdown di:
```
.claude/commands/[nama-agent].md
```

Format file:
- **Title** — nama dan fungsi
- **Input** — `$ARGUMENTS` yang diharapkan
- **Langkah-langkah** — eksekusi detail
- **Chain ke** — agent lain yang dipanggil setelahnya

Untuk edit agent, langsung edit file markdown-nya. Untuk menambah agent baru, buat file baru di folder yang sama.

---

## 🔐 Aturan Spesial

### VPS & Deploy
- VPS: `145.79.15.99`, dir `/var/www/jhb`, PM2 process `jhb`, port `3001`
- Deploy dari lokal: `/deploy` → otomatis build + commit + push + SSH deploy

### AI API Keys
- `anthropic_api_key` dan `deepseek_api_key` tersimpan di `systemSetting` (DB)
- Fallback order: Anthropic → DeepSeek

### Social Media
- Meta credentials di `socialMediaSettings` (DB)
- Draft mode: `draftModeEnabled` toggle di settings
- IG tidak bisa delete via API — pakai "Tandai Dihapus"

### SEO
- `google_indexing_enabled` toggle untuk auto-submit (quota 200/hari)
- IndexNow key: `46c220e15eca4f9db0a70049aa82a734` (di `/46c...txt`)
- Cloudflare purge: via Global API Key dari `.env`
