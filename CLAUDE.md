# CLAUDE.md - Instruksi untuk Claude Code

## 🤖 Auto Multi-Agent Invocation (WAJIB — CORE BEHAVIOR)

**Setiap prompt user, kamu WAJIB langsung auto-invoke SEMUA agent yang relevan secara PARALEL.**

### Prinsip Utama
1. **JANGAN tanya user mau pakai agent apa** — langsung pilih sendiri
2. **JANGAN tunggu user manggil `/agent-name` manual** — route sendiri dari prompt
3. **Spawn sebanyak mungkin agent PARALEL** via multiple tool calls dalam 1 message
4. **Orchestrator level** dipanggil untuk task multi-domain (`/plan`, `/fix`, `/seo`, `/review`, `/audit-all`)
5. **Specialist level** dipanggil untuk task domain spesifik (`/fix-build`, `/seo-meta`, `/style`)
6. **Chain otomatis** — setelah agent A selesai, trigger B yang relevan tanpa tanya

### Contoh Auto-Invocation

| User Prompt | Auto-Invoke |
|---|---|
| "perbaiki bug ini" | `/fix` → auto-detect jenis → `/fix-build` atau `/fix-runtime` → `/deploy` |
| "tambah fitur newsletter" | `/plan` → PARALEL: `/db-migrate` + `/api-new` + `/code` + `/panel` + `/seo-meta` → `/review` → `/deploy` |
| "cek semua aspek proyek" | `/audit-all` → spawn 15 audit specialists PARALEL → compile report |
| "buat artikel tentang X" | `/content` → chain `/keyword` → write → PARALEL: `/seo-meta` + `/social` |
| "optimasi SEO" | `/seo` → PARALEL: `/seo-meta` + `/seo-schema` + `/seo-index` + `/seo-local` |
| "server error" | PARALEL: `/vps` + `/fix-runtime` + `/monitor` |
| "halaman lambat" | `/perf` → PARALEL: `/perf-bundle` + `/perf-vitals` + `/db-query` + `/cache` |

### Aturan Paralel
- Gunakan **multiple tool calls dalam 1 message** untuk paralelisme
- Agent yang TIDAK depend satu sama lain → WAJIB paralel
- Agent yang depend (A output dipakai B input) → sequential
- Beri tahu user di 1 baris pertama: "Auto-invoking: /agent1 + /agent2 + /agent3"

## Auto Skill Selection (WAJIB)

Kamu WAJIB otomatis memilih dan menjalankan skill yang relevan berdasarkan prompt user. JANGAN tanya user mau pakai skill apa — langsung pilih sendiri.

### Skill Routing Table

#### Coding & Infrastruktur
| Keyword/Intent di prompt user | Skill yang dijalankan |
|---|----|
| Fitur baru kompleks (multi-file), "tambah fitur", "buat sistem" | `/plan` dulu, lalu eksekusi |
| Tulis kode, implementasi, "buat", "tambah", "ubah" (1-3 file) | `/code` langsung |
| "panel", "admin", "dashboard", "halaman panel", "tabel admin" | `/panel` |
| "API", "endpoint", "route baru" | `/api-new` |
| "database", "schema", "model baru", "field baru", "prisma" | `/db-migrate` |
| "UI", "warna", "layout", "styling", "CSS", "tampilan", "desain" | `/style` |
| "error", "bug", "gagal", "tidak bisa", "500", "crash", "fix" | `/fix` |
| "review", "cek kode", "audit", "periksa kode" | `/review` |
| "test", "build", "coba", "validasi" | `/test` |
| "git", "conflict", "stash", "branch", "reset" | `/git-clean` |
| "VPS", "server", "PM2", "restart", "deploy error" | `/vps` |
| "lambat", "performa", "optimasi", "speed", "loading" | `/perf` |
| Selesai coding, perubahan final | `/deploy` (OTOMATIS!) |

#### SEO & Konten
| Keyword/Intent di prompt user | Skill yang dijalankan |
|---|----|
| "SEO site", "meta", "sitemap", "indexing", "structured data" | `/seo` |
| "optimasi artikel", "SEO artikel", "audit artikel [judul/id]" | `/article-optimize` |
| "tulis artikel", "buat artikel", "topik berita" (detail) | `/article-writer` |
| "buat artikel" (cepat, outline saja) | `/content` |
| "keyword", "target keyword", "riset kata kunci" | `/keyword` |

#### Media Sosial
| Keyword/Intent di prompt user | Skill yang dijalankan |
|---|----|
| Sosmed umum, cek dashboard sosmed, pending draft | `/social` (orchestrator) |
| "instagram", "ig", "post IG", "draft instagram" | `/social-ig` |
| "facebook", "fb", "post FB", "draft facebook" | `/social-fb` |
| "caption", "teks post", "hashtag", "edit caption" | `/social-caption` |
| "template gambar", "desain template", "template sosmed" | `/social-template` |

#### Analitik & Monitoring
| Keyword/Intent di prompt user | Skill yang dijalankan |
|---|----|
| "statistik", "analytics", "laporan", "performa konten" | `/analytics` |
| "monitor", "health check", "cek sistem", "status server" | `/monitor` |

#### Obsidian Vault
| Keyword/Intent di prompt user | Skill yang dijalankan |
|---|----|
| "obsidian", "vault", "knowledge base", "import draft", "sync sidang" | `/vault` |
| "daily log", "editorial journal" | `/vault daily-log` |
| "sync keyword vault" | `/vault pull-keywords` atau `push-keywords` |

### Hierarki Agent (Main → Sub-Agent)

```
/fix              — debugger utama
  ├── /fix-build    — TypeScript & build errors
  └── /fix-runtime  — API & runtime errors

/review           — quality checker utama
  ├── /review-quality  — code quality, patterns, DRY
  └── /review-security — security audit, OWASP

/seo              — SEO optimizer utama
  ├── /seo-meta    — metadata, Open Graph, title/description
  ├── /seo-schema  — structured data, JSON-LD
  └── /seo-index   — sitemap, robots.txt, Search Console

/perf             — performance optimizer utama
  └── /perf-bundle — bundle size, Next.js chunking

/db-migrate       — schema manager
  └── /db-query    — query optimization, indexes

/social           — orchestrator media sosial
  ├── /social-ig    — Instagram specialist (draft/publish/status)
  ├── /social-fb    — Facebook specialist (draft/publish/takedown)
  ├── /social-caption — Caption writer & hashtag optimizer
  └── /social-template — Template image designer

/article-writer   — AI article writer (detail + riset)
  ├── keyword research sub-agent (paralel)
  ├── similar articles check sub-agent (paralel)
  └── legal entity identification sub-agent (paralel)

/article-optimize — per-artikel SEO auditor
  ├── content analysis sub-agent (paralel)
  └── keyword matching sub-agent (paralel)

/analytics        — stats & performa reporter
  ├── content stats sub-agent (paralel)
  ├── social coverage sub-agent (paralel)
  └── seo health sub-agent (paralel)
```

### Chaining Rules (Skill saling memanggil)

```
Task besar    → /plan → /db-migrate → /api-new → /code → /panel → /review → /deploy
Task kecil    → /code → /deploy
Bug fix       → /fix → /deploy
UI change     → /style → /review → /deploy
New API       → /api-new → /test → /deploy
DB change     → /db-migrate → /api-new → /code → /deploy

Artikel baru  → /article-writer → /article-optimize → /social-ig + /social-fb
SEO audit     → /article-optimize → (jika konten kurang) /article-writer
Sosmed batch  → /social dashboard → /social-ig + /social-fb (paralel)
Caption edit  → /social-caption → /social-ig ATAU /social-fb
Template baru → /social-template → /social-ig ATAU /social-fb
Analytics     → /analytics → /article-optimize (artikel score rendah) + /social (artikel belum dipost)
VPS error     → /vps → /fix → /deploy
```

### Multi-Skill Task

Jika task melibatkan beberapa area sekaligus, jalankan BERURUTAN:
1. `/plan` — pecah task (jika kompleks)
2. `/db-migrate` — jika perlu perubahan schema
3. `/api-new` — jika perlu endpoint baru
4. `/code` — implementasi logic & komponen
5. `/panel` — jika ada halaman admin baru
6. `/style` — jika ada perubahan visual
7. `/seo` — jika ada halaman publik baru
8. `/review` — cek kualitas
9. `/test` — validasi build
10. `/deploy` — SELALU di akhir

### Mode: Opus + Sonnet (Claude Only)

Opus 4.6 dan Sonnet 4.6 mengerjakan semua. Tidak ada model eksternal.

```
User request → Opus: analisis, coding, apply, deploy
             → Sonnet (via Agent tool): research, plan, review paralel
```

### Prinsip Sub-Agent

Ketika menjalankan task besar, spawn sub-agent secara PARALEL untuk:
- Research yang bisa dijalankan bersamaan
- Pengecekan multi-platform (IG + FB sekaligus)
- Audit artikel batch (banyak artikel sekaligus)
- Validasi setelah perubahan (build + test paralel)

Sub-agent TIDAK spawn untuk task sequential yang bergantung satu sama lain.

## Project
- **Nama:** Jurnalis Hukum Bandung
- **Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma, PostgreSQL, NextAuth
- **Deploy:** VPS (Ubuntu 24.04)
- **Repo:** github.com/bonelade/Jurnalis-Hukum-Bandung
- **URL:** https://jurnalishukumbandung.com

## Workflow: Auto Commit, Push & Deploy

**PENTING:** Setiap kali selesai melakukan perubahan kode, WAJIB langsung jalankan `/deploy`.

Atau manual:
1. **Build** — `npx next build` untuk pastikan tidak ada error
2. **Stage** — `git add` file yang berubah (jangan pakai `git add -A` jika ada `.env`)
3. **Commit** — dengan pesan deskriptif dalam bahasa Inggris, format:
   - `feat:` untuk fitur baru
   - `fix:` untuk bug fix
   - `style:` untuk perubahan UI/styling
   - `refactor:` untuk refactoring
   - `docs:` untuk dokumentasi
   - Akhiri dengan `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
4. **Push** — `git push origin master`
5. **Deploy VPS** — `ssh root@145.79.15.99 "cd /var/www/jhb && git pull origin master && npm install && npm run build && pm2 restart jhb"`

Jangan tunggu user minta commit/push — **langsung lakukan** setelah perubahan selesai dan build sukses.

## VPS Deploy Info (JANGAN UBAH)
- **VPS IP:** 145.79.15.99
- **SSH:** `ssh root@145.79.15.99`
- **App dir:** `/var/www/jhb` (BUKAN `/var/www/kartawarta`)
- **PM2 process:** `jhb` (BUKAN `kartawarta`)
- **Port:** 3001
- **Domain:** jurnalishukumbandung.com
- **Repo:** `origin` → `github.com/mediadigitalbandung/jurnalishukumbandung.git`

## Design System

### Warna (Light Mode — GoTo-inspired)
- **Brand (GoTo Green):** `#00AA13` — tombol, badge, link, aksen utama
- **Brand Dark:** `#008C10` — hover state
- **Brand Light:** `#E6F9E8` — badge background, highlight
- **Surface:** `#FFFFFF` (primary), `#F7F7F8` (secondary), `#F0F1F3` (tertiary), `#1C1C1E` (dark)
- **Text:** `#1C1C1E` (primary), `#6B7280` (secondary), `#9CA3AF` (muted), `#FFFFFF` (inverse)
- **Border:** `#E5E7EB` (default), `#F3F4F6` (light)
- **LIGHT MODE** — warna terang, clean, profesional

### Layout Style
- Horizontal scroll carousels untuk konten di homepage
- Full-width hero banner + headline slider
- Section headers: judul kiri + "Lihat Semua" kanan (green)
- Clean white cards dengan rounded-[12px], subtle shadow-card
- GoTo-style rounded buttons (rounded-full)
- Content-centric, minimal chrome

### Komponen CSS Utility
- `.container-main` — max-w-6xl centered (px-5 sm:px-8)
- `.section-header` / `.section-title` / `.section-link`
- `.card` — rounded-[12px], bg-surface, border, shadow-card, hover elevation
- `.btn-primary` — rounded-full, bg-goto-green
- `.btn-secondary` / `.btn-ghost`
- `.badge` / `.badge-green` / `.badge-live` / `.badge-verified`
- `.input`

## Database

- **Provider:** PostgreSQL
- **Schema:** `prisma/schema.prisma`
- **Migrate:** `npx prisma db push`
- **Env:** `DATABASE_URL` dan `DIRECT_URL`

## File Penting

```
prisma/schema.prisma    — Database schema
src/app/page.tsx        — Homepage
src/app/layout.tsx      — Root layout
src/app/globals.css     — Global styles + utilities
tailwind.config.ts      — Tailwind color system
src/lib/auth.ts         — NextAuth config
src/lib/prisma.ts       — Prisma client singleton
src/lib/api-utils.ts    — API helpers (auth, error handling)
src/components/layout/  — Header, Footer, Sidebar, NewsTicker
src/components/artikel/ — ArticleCard, CopyProtection
src/app/api/            — All API routes
src/app/panel/          — Admin panel pages
```

## Aturan Kode

- Semua halaman publik query langsung via Prisma (server components)
- Panel admin pakai client components + fetch API routes
- Gunakan `export const dynamic = "force-dynamic"` untuk halaman yang query database
- Jangan commit file `.env` — sudah di `.gitignore`
- Password di-hash dengan `bcryptjs` (12 rounds)
