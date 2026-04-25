# Fix-Build — Build & TypeScript Error Specialist

Specialist agent untuk error saat `npx next build` atau `npx tsc --noEmit`.
Dipanggil oleh `/fix` (orchestrator) ketika build atau type error terdeteksi.

## Input

$ARGUMENTS — error message dari build output, atau kosong untuk jalankan build sendiri.

## Tugas Spesifik

Specialist ini HANYA menangani:
- TypeScript compile errors
- Next.js build errors
- Import/module resolution errors
- Prisma type errors
- Missing type definitions

TIDAK menangani: runtime errors (→ `/fix-runtime`), DB errors (→ `/fix`).

## Langkah Diagnosa

### 1. Reproduce Error
```bash
npx next build 2>&1 | head -100
```
Atau jika hanya type check:
```bash
npx tsc --noEmit 2>&1 | head -100
```

### 2. Parse Error Output

Dari error output, identifikasi:
- File path yang error (biasanya `src/...`)
- Baris yang error
- Error type: Type error? Module not found? Missing prop?

### 3. Common Build Errors & Fixes

**"Module not found":**
- Cek import path case-sensitivity (Linux VPS case-sensitive!)
- Cek apakah file benar-benar ada
- Cek tsconfig paths (`@/` alias)

**TypeScript type errors:**
- Cek apakah field Prisma model sesuai schema (`npx prisma generate` dulu)
- Cek `null | undefined` vs non-nullable
- Fix dengan optional chaining (`?.`) atau null coalescing (`??`)
- Hindari `any` — gunakan proper type atau `unknown`

**Prisma type errors:**
- Jalankan `npx prisma generate` untuk update client
- Cek field name sesuai schema.prisma
- Status enum: gunakan `"PUBLISHED" as const` atau import dari `@prisma/client`

**"Page without React Component":**
- File di `src/app/` harus export default React component
- Cek apakah ada file non-page yang tidak sengaja ada di app/ directory

**"params/searchParams possibly null":**
- Next.js 14: type params dengan `Promise<{slug: string}>` atau gunakan optional chaining
- `const { slug } = await params` untuk async params

**Build stale cache:**
```bash
rm -f tsconfig.tsbuildinfo
rm -rf .next
npx next build
```

### 4. Fix & Verify

Terapkan fix minimal. Setelah fix:
```bash
npx next build
```
Pastikan build berhasil tanpa error baru.

## Output

```
## Fix-Build Result

Root Cause: [deskripsi singkat]
File: [path:line]
Fix Applied: [apa yang diubah]
Build Status: ✅ SUCCESS / ❌ STILL FAILING
```

→ Laporkan ke `/fix` (orchestrator). Jika berhasil: `/fix` akan sarankan `/deploy`.