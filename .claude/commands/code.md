# Code — Eksekutor Koding

Implementasi kode berdasarkan instruksi spesifik. Skill ini adalah "tangan" yang menulis kode.

## Input

$ARGUMENTS — instruksi apa yang harus dikoding. Bisa dari user langsung atau hasil dari `/plan`.

## Langkah-langkah

### 1. Analisis Instruksi

Pahami apa yang diminta:
- File mana yang perlu dibuat/diubah
- Behavior yang diharapkan
- Constraint teknis

Jika instruksi kurang jelas dan tidak ada plan sebelumnya, sarankan user jalankan `/plan` dulu.

### 2. Baca File yang Relevan

WAJIB baca file sebelum edit. Jangan pernah edit file yang belum dibaca.

Baca juga file-file terkait untuk memahami pattern yang sudah ada:
- Cek komponen serupa yang sudah ada untuk ikuti pattern-nya
- Cek import/export yang digunakan
- Cek type definitions yang relevan

### 3. Implementasi

Tulis kode dengan aturan proyek:

**Halaman Publik (src/app/(public)/ atau src/app/[slug]/):**
- Server components (default, tanpa "use client")
- Query langsung via Prisma (bukan fetch API)
- Tambah `export const dynamic = "force-dynamic"` jika query DB
- Gunakan `generateMetadata()` untuk SEO

**Halaman Panel Admin (src/app/panel/):**
- Client components (`"use client"`)
- Fetch data via API routes (bukan Prisma langsung)
- UI senior-friendly: teks besar, spacing lega, tombol jelas
- Toast/alert untuk feedback user action

**API Routes (src/app/api/):**
- Gunakan helper dari `src/lib/api-utils.ts`
- Auth guard sesuai role (cek `src/lib/roles.ts`)
- Try-catch dengan proper error response
- Audit log untuk operasi write (create/update/delete)

**Components (src/components/):**
- TypeScript interfaces untuk props
- Ikuti naming convention yang sudah ada (PascalCase file, camelCase vars)
- Reuse komponen UI dari `src/components/ui/` jika ada

**Styling:**
- Tailwind CSS — gunakan design tokens dari `tailwind.config.ts`
- Brand green: `bg-goto-green` (#00AA13), hover: `hover:bg-goto-green-dark`
- Cards: `rounded-[12px] bg-surface border border-border shadow-card`
- Buttons: `rounded-full` (GoTo style)
- Gunakan CSS utility classes dari `globals.css` (.container-main, .card, .btn-primary, dll)
- LIGHT MODE only — warna terang, clean, profesional

### 4. Verifikasi

Setelah menulis kode:
- Pastikan tidak ada TypeScript error yang obvious
- Pastikan import path benar
- Pastikan tidak ada hardcoded values yang seharusnya dynamic
- Pastikan tidak ada console.log yang tertinggal (kecuali error logging)
- Pastikan tidak ada secret/credential yang ter-expose

### 5. Selesai

Setelah implementasi selesai, laporkan ke user:
- File apa saja yang dibuat/diubah
- Ringkasan perubahan
- Sarankan: **"Jalankan `/review` untuk cek kualitas, lalu `/deploy` untuk deploy."**

## Aturan

- FOKUS pada implementasi — jangan over-plan, jangan over-explain
- Ikuti pattern yang sudah ada di codebase, jangan invent pattern baru
- Minimal perubahan — jangan refactor code yang tidak diminta
- Jangan tambah library baru tanpa konfirmasi user
- Password hash: `bcryptjs` (12 rounds)
- Jangan commit file `.env`
