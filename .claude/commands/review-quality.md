# Review-Quality — Code Quality Specialist

Specialist agent untuk code quality review: TypeScript, patterns, Next.js conventions, design system.
Dipanggil oleh `/review` (orchestrator) secara paralel dengan `/review-security`.

## Input

$ARGUMENTS — file atau area spesifik. Default: semua file yang berubah (git diff).

## Tugas Spesifik

Specialist ini HANYA menangani kualitas kode:
- TypeScript correctness
- Pattern consistency
- Next.js conventions
- Design system compliance
- Performance-obvious issues (N+1 query, missing pagination, dll.)

## Checklist Kualitas

### 1. TypeScript
```
[ ] Tidak ada implicit `any` yang bisa di-type
[ ] Props interface terdefinisi dengan benar
[ ] Return type function yang complex sudah explicit
[ ] Tidak ada unused imports atau variables
[ ] Tidak ada `// @ts-ignore` kecuali dengan komentar alasan
[ ] Async functions selalu di-await atau dihandle errornya
[ ] Optional chaining (?.) digunakan untuk nullable values
```

### 2. Next.js Conventions
```
[ ] Public pages: server component (no "use client") + Prisma direct
[ ] Panel pages: "use client" + fetch API routes (TIDAK Prisma langsung)
[ ] Dynamic DB pages: export const dynamic = "force-dynamic"
[ ] ISR pages: export const revalidate = [seconds]
[ ] generateMetadata() ada di semua halaman publik baru
[ ] Image: next/image digunakan (bukan <img> biasa)
[ ] Link: next/link digunakan (bukan <a> untuk internal)
```

### 3. Pattern Consistency
```
[ ] API response format konsisten: successResponse() / errorResponse() dari api-utils.ts
[ ] Error handling: try-catch di semua API routes
[ ] Auth check: requireRole() dari api-utils.ts (bukan custom)
[ ] Audit log: logAudit() untuk semua write operations penting
[ ] Ikuti naming convention: PascalCase komponen, camelCase variables, UPPER_CASE constants
[ ] Tidak ada console.log tertinggal (console.error untuk errors adalah OK)
```

### 4. Design System
```
[ ] Warna: gunakan Tailwind tokens (goto-green, surface, txt, border) — bukan hex langsung
[ ] Cards: rounded-[12px] shadow-card (bukan rounded-lg atau rounded-xl)
[ ] Buttons: rounded-full (GoTo style)
[ ] Panel: teks besar (text-base minimum), spacing lega (p-6, gap-6)
[ ] Responsive: mobile-first, cek sm: md: lg: breakpoints
[ ] Light mode only: tidak ada dark: variants
```

### 5. Database & Prisma
```
[ ] Select hanya field yang dibutuhkan (bukan findMany tanpa select)
[ ] Include relasi hanya yang diperlukan
[ ] Tidak ada query di dalam loop (N+1)
[ ] Pagination ada untuk list endpoints (take/skip)
[ ] findMany tanpa limit harus punya alasan jelas
```

### 6. Completeness
```
[ ] Loading state ada di client components
[ ] Empty state ada (jangan blank saat data kosong)
[ ] Error state ada (jangan crash saat fetch gagal)
[ ] Komponen baru ada di tempat yang benar (components/ vs app/)
```

## Output Format

```
## Quality Review

### Status: ✅ CLEAN / ⚠️ ISSUES / ❌ BLOCKING

### Issues
| Severity | File:Line | Issue | Saran |
|---|---|---|---|
| ❌ BLOCKING | ... | ... | ... |
| ⚠️ MEDIUM | ... | ... | ... |
| 💡 MINOR | ... | ... | ... |
```

→ Laporkan ke `/review` (orchestrator). Merge dengan hasil `/review-security` untuk report final.