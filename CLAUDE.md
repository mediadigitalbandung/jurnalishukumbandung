# CLAUDE.md - Instruksi untuk Claude Code

## Auto Skill Selection (WAJIB)

Kamu WAJIB otomatis memilih dan menjalankan skill yang relevan berdasarkan prompt user. JANGAN tanya user mau pakai skill apa — langsung pilih sendiri.

### Skill Routing Table

| Keyword/Intent di prompt user | Skill yang dijalankan |
|---|----|
| Fitur baru yang kompleks (multi-file), "tambah fitur", "buat sistem" | `/plan` dulu, lalu eksekusi |
| Tulis kode, implementasi, "buat", "tambah", "ubah" (scope jelas, 1-3 file) | `/code` langsung |
| "panel", "admin", "dashboard", "halaman panel", "tabel admin" | `/panel` |
| "API", "endpoint", "route baru" | `/api-new` |
| "database", "schema", "model baru", "field baru", "prisma" | `/db-migrate` |
| "UI", "warna", "layout", "styling", "CSS", "tampilan", "desain" | `/style` |
| "SEO", "meta", "sitemap", "indexing", "structured data" | `/seo` |
| "lambat", "performa", "optimasi", "speed", "loading" | `/perf` |
| "error", "bug", "gagal", "tidak bisa", "500", "crash", "fix" | `/fix` |
| "review", "cek kode", "audit", "periksa" | `/review` |
| "test", "build", "coba", "validasi" | `/test` |
| "git", "conflict", "stash", "branch", "reset" | `/git-clean` |
| Selesai coding, perubahan final | `/deploy` (OTOMATIS setelah setiap perubahan!) |

### Chaining Rules (Skill saling memanggil)

Skill WAJIB saling recommend/chain sesuai alur:

```
Task besar  → /plan → /db-migrate → /api-new → /code → /panel → /review → /deploy
Task kecil  → /code → /deploy
Bug fix     → /fix → /deploy
UI change   → /style → /review → /deploy
New API     → /api-new → /test → /deploy
DB change   → /db-migrate → /api-new → /code → /deploy
```

### Multi-Skill Task

Jika task user melibatkan beberapa area sekaligus, jalankan skill secara BERURUTAN:
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

### Multi-Agent Architecture

Kamu (Opus 4.6) adalah **orchestrator utama**. Delegate pekerjaan ke Sonnet 4.6 (built-in Agent) atau Qwen 3.6 (OpenRouter MCP) sesuai kompleksitas task.

#### Agent Roles — 3 Tier

| Role | Model | Cara Panggil | Kapan Digunakan |
|---|---|---|---|
| **Orchestrator** | Opus 4.6 | — (kamu sendiri) | Selalu — koordinasi semua task |
| **Planner** | Opus 4.6 | — (kamu sendiri) | Task kompleks, arsitektur, breakdown |
| **Researcher** | Opus 4.6 | — (kamu sendiri) | Cari info, analisis codebase, debugging rumit |
| **Reviewer** | Sonnet 4.6 | `Agent(model:"sonnet")` | Review kode, cek quality, validasi logic |
| **Executor (All)** | Qwen 3.6 | `qwen_code` | General coding, refactor, implementasi |
| **Frontend Specialist** | Qwen 3.6 | `qwen_frontend` | React/Next.js components, Tailwind, UI |
| **Backend Specialist** | Qwen 3.6 | `qwen_backend` | API routes, server logic, auth |
| **Database Specialist** | Qwen 3.6 | `qwen_database` | Prisma schema, queries, migrations |
| **Tester** | Qwen 3.6 | `qwen_test` | Tulis test, validasi, edge cases |
| **Quick Chat** | Qwen 3.6 | `qwen_chat` | Pertanyaan teknis ringan |

#### Task Routing

```
Task masuk → Opus analisis & plan:

SEMUA CODING (sederhana maupun kompleks):
  → Qwen 3.6 via MCP tool yang sesuai
  → Sonnet 4.6 review hasil Qwen
  → Opus: apply ke file jika approved

PLANNING & RESEARCH:
  → Opus 4.6 kerjakan sendiri

REVIEW:
  → Sonnet 4.6 via Agent(model:"sonnet")
```

#### Contoh Routing

| Task | Executor | Reviewer |
|---|---|---|
| Ganti warna tombol | Qwen (`qwen_frontend`) | Sonnet |
| Tambah field di schema | Qwen (`qwen_database`) | Sonnet |
| Buat CRUD lengkap + API | Qwen (`qwen_code`) | Sonnet |
| Refactor auth middleware | Qwen (`qwen_code`) | Sonnet |
| Arsitektur baru | Opus (plan) → Qwen (code) | Sonnet |

#### Workflow Rules

1. **Planning & Research** — SELALU Opus 4.6
2. **Semua Coding** — Qwen 3.6 via MCP (executor utama)
3. **Review** — Sonnet 4.6 via Agent tool (reviewer utama)
4. **Apply ke file** — Opus (orchestrator, setelah Sonnet approve)
5. **Fallback** — Jika MCP/Agent tidak tersedia, Opus kerjakan sendiri

#### Delegation Flow

```
User request
  → Opus: analisis & plan
  → Opus: baca file context yang diperlukan
  → Qwen via qwen_* MCP tool (generate kode)
  → Sonnet via Agent(model:"sonnet") (review kode Qwen)
  → IF approved: Opus apply ke file
  → IF rejected: Qwen regenerate dengan feedback Sonnet
  → IF kompleks:
      → Opus: kerjakan sendiri → apply
  → Opus: /deploy
```

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
