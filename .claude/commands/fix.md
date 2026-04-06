# Fix — Debugger & Problem Solver

Diagnosa dan perbaiki error, bug, atau issue yang ditemukan.

## Input

$ARGUMENTS — bisa berupa:
- Error message dari build/runtime
- Deskripsi bug dari user
- Issue dari hasil `/review`
- Stack trace atau log error

## Langkah-langkah

### 1. Identifikasi Error

Pahami error yang terjadi:
- Apa error message-nya?
- Di file mana?
- Kapan terjadi? (build time, runtime, atau saat aksi tertentu)

Jika error message tidak diberikan, coba reproduce:
```bash
npx next build
```

### 2. Trace Root Cause

Baca file yang error. Trace dari error message ke source code:
- Baca file yang disebut di stack trace
- Cek import/dependency chain
- Cek apakah ada perubahan terbaru yang menyebabkan error:
```bash
git diff
git log --oneline -5
```

**Jangan langsung tebak fix** — pahami dulu KENAPA error terjadi.

### 3. Terapkan Fix

Setelah root cause jelas:
- Fix dengan perubahan MINIMAL — jangan refactor code lain
- Pastikan fix tidak break hal lain
- Jika fix melibatkan banyak file, kerjakan satu per satu

**Common fixes di proyek ini:**
- Build error "can't resolve module" → cek import path (case-sensitive di Linux VPS!)
- Prisma error → cek schema.prisma, jalankan `npx prisma generate`
- Auth error → cek `src/lib/auth.ts` dan role permissions di `src/lib/roles.ts`
- API 500 error → cek try-catch dan Prisma query di API route
- Hydration mismatch → pastikan server/client render konsisten
- Type error → cek interface/type definitions

### 4. Verifikasi Fix

Jalankan build untuk pastikan fix berhasil:
```bash
npx next build
```

Jika masih error, ulangi dari langkah 2. Jika fix butuh lebih dari 3 iterasi, laporkan ke user — mungkin perlu pendekatan berbeda.

### 5. Selesai

Laporkan:
- Apa root cause-nya
- Apa yang di-fix
- File mana yang diubah

Sarankan: **"Fix sudah diterapkan. Jalankan `/deploy` untuk deploy."**

## Aturan

- SELALU cari root cause, jangan hanya suppress error
- Fix MINIMAL — jangan refactor hal yang tidak berkaitan
- Jangan tambah `// @ts-ignore` atau `any` sebagai fix (kecuali benar-benar terpaksa)
- Jangan hapus fitur yang working sebagai "fix"
- Jika error dari dependency/library, cek versi di `package.json` dulu
