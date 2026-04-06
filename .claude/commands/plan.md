# Plan — Arsitek & Perencana Task

Analisis task dari user, pecah jadi langkah-langkah spesifik, identifikasi semua file yang terdampak, dan tentukan skill mana yang dibutuhkan.

## Input

User akan memberikan deskripsi task. Bisa berupa:
- Fitur baru ("tambah fitur bookmark")
- Bug fix ("halaman artikel error 500")
- Perubahan UI ("ubah warna header")
- Refactor ("pisahkan komponen X")
- Atau task lainnya

Jika user memberikan argumen: $ARGUMENTS — gunakan itu sebagai task description.

## Langkah-langkah

### 1. Pahami Task

Baca ulang permintaan user. Identifikasi:
- **Apa** yang diminta (fitur/fix/style/refactor)
- **Kenapa** (konteks bisnis jika ada)
- **Scope** — apakah ini perubahan kecil (1-2 file) atau besar (multi-file)

Jika task tidak jelas, TANYA user untuk klarifikasi sebelum lanjut.

### 2. Scan Codebase

Berdasarkan task, scan file-file yang relevan. Referensi struktur proyek:

```
prisma/schema.prisma        — Database schema (cek jika task melibatkan data baru)
src/app/page.tsx             — Homepage
src/app/layout.tsx           — Root layout
src/app/globals.css          — Global styles & CSS utilities
tailwind.config.ts           — Tailwind color system & design tokens
src/lib/auth.ts              — NextAuth config & role helpers
src/lib/prisma.ts            — Prisma client singleton
src/lib/api-utils.ts         — API helpers (auth guard, error handling)
src/lib/roles.ts             — Role definitions & permission matrix
src/lib/utils.ts             — Utility functions (slugify, date format, dll)
src/lib/seo-utils.ts         — SEO helpers
src/lib/notifications.ts     — Notification helpers
src/components/layout/       — Header, Footer, Sidebar, NewsTicker, PublicNav
src/components/artikel/      — ArticleCard, CopyProtection, CommentSection
src/components/ui/           — Reusable UI components
src/components/ads/          — Ad components (BannerAd, SidebarAd)
src/app/api/                 — Semua API routes
src/app/panel/               — Semua halaman admin panel
src/app/(public)/            — Halaman publik (berita, kategori, dll)
```

Untuk setiap area yang terdampak:
- **Baca file** yang relevan (jangan tebak — baca dulu!)
- Catat **line numbers** yang perlu diubah
- Catat **dependencies** antar file

### 3. Identifikasi Dampak

Analisis ripple effect dari perubahan:

- **Database**: Apakah perlu model/field baru di `prisma/schema.prisma`?
- **API**: Apakah perlu endpoint baru atau modifikasi di `src/app/api/`?
- **UI Public**: Apakah ada perubahan di halaman publik?
- **UI Panel**: Apakah ada perubahan di admin panel?
- **Auth/Role**: Apakah ada implikasi permission?
- **SEO**: Apakah perubahan ini mempengaruhi SEO?
- **Styling**: Apakah perlu perubahan CSS/Tailwind?

### 4. Buat Plan Terstruktur

Output plan dalam format berikut:

```
## Plan: [Judul Task]

### Ringkasan
[1-2 kalimat apa yang akan dilakukan dan kenapa]

### File yang Terdampak
| # | File | Aksi | Detail |
|---|------|------|--------|
| 1 | path/to/file.ts | EDIT/CREATE/DELETE | Apa yang diubah |
| 2 | ... | ... | ... |

### Langkah Implementasi
1. **[Langkah 1]** — Deskripsi spesifik
   - File: `path/to/file`
   - Apa yang dilakukan: ...
   - Skill: `/db-migrate` atau `/code` atau `/api-new` dll

2. **[Langkah 2]** — ...

### Urutan Skill
[Skill mana yang dipanggil dan urutannya]
Contoh: `/db-migrate` → `/api-new` → `/code` → `/review` → `/deploy`

### Risiko & Catatan
- [Hal yang perlu diwaspadai]
- [Breaking changes jika ada]
- [Migrasi data jika perlu]
```

### 5. Konfirmasi dengan User

Setelah plan selesai, tanya user:

> **Plan sudah siap. Mau langsung eksekusi atau ada yang perlu diubah?**

Jangan langsung eksekusi — tunggu konfirmasi user. Setelah user approve, sarankan skill pertama yang harus dijalankan.

## Aturan

- JANGAN langsung coding. Skill ini HANYA untuk planning.
- SELALU baca file sebelum memasukkan ke plan — jangan asumsikan isi file.
- Jika task kecil (1-2 file, perubahan minor), plan boleh singkat. Jangan over-engineer planning untuk task sederhana.
- Jika task besar, pecah jadi fase-fase yang bisa di-deploy incremental.
- Pertimbangkan design system: GoTo green (#00AA13), rounded-[12px], shadow-card, light mode.
- Panel admin harus senior-friendly: teks besar, spacing lega.
- Public pages pakai server components + Prisma direct query.
- Panel pages pakai client components + fetch API routes.

## Contoh Output

```
## Plan: Fitur Bookmark Artikel

### Ringkasan
Tambah fitur bookmark agar pembaca bisa menyimpan artikel favorit.
Menggunakan localStorage (tanpa login) untuk MVP.

### File yang Terdampak
| # | File | Aksi | Detail |
|---|------|------|--------|
| 1 | src/components/artikel/BookmarkButton.tsx | CREATE | Komponen tombol bookmark |
| 2 | src/app/berita/[slug]/page.tsx | EDIT | Tambah BookmarkButton di artikel |
| 3 | src/app/bookmark/page.tsx | CREATE | Halaman list bookmark user |
| 4 | src/components/layout/PublicNav.tsx | EDIT | Tambah link ke halaman bookmark |

### Langkah Implementasi
1. **Buat BookmarkButton component** — Toggle bookmark via localStorage
   - File: `src/components/artikel/BookmarkButton.tsx`
   - Skill: `/code`

2. **Integrasikan di halaman artikel** — Taruh di bawah judul
   - File: `src/app/berita/[slug]/page.tsx`
   - Skill: `/code`

3. **Buat halaman bookmark** — List semua artikel yang di-bookmark
   - File: `src/app/bookmark/page.tsx`
   - Skill: `/code`

4. **Tambah navigasi** — Link "Bookmark" di navbar
   - File: `src/components/layout/PublicNav.tsx`
   - Skill: `/code`

### Urutan Skill
`/code` (step 1-4) → `/review` → `/deploy`

### Risiko & Catatan
- localStorage tidak sync antar device
- Jika nanti mau sync, perlu model DB + API (fase 2)
```
