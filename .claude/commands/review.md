# Review — Quality Checker

Review semua perubahan kode sebelum deploy. Pastikan kualitas, keamanan, dan konsistensi.

## Langkah-langkah

### 1. Lihat Semua Perubahan

Jalankan:
```bash
git diff
git diff --cached
git status
```

Identifikasi semua file yang berubah.

### 2. Review Setiap File

Untuk setiap file yang berubah, baca dan cek:

**TypeScript & Logic:**
- [ ] Tidak ada TypeScript error
- [ ] Tidak ada unused imports/variables
- [ ] Tidak ada `console.log` yang tertinggal (kecuali error logging)
- [ ] Logic benar dan handle edge cases penting
- [ ] Async/await digunakan dengan benar
- [ ] Error handling ada di tempat yang tepat

**Security (KRITIS):**
- [ ] Tidak ada SQL injection (gunakan Prisma parameterized queries)
- [ ] Tidak ada XSS (user input di-sanitize sebelum render)
- [ ] Tidak ada secrets/credentials yang hardcoded
- [ ] API routes punya auth guard sesuai role
- [ ] File `.env` TIDAK masuk git staging
- [ ] Tidak ada `dangerouslySetInnerHTML` tanpa sanitize

**Design System Compliance:**
- [ ] Warna sesuai design tokens (goto-green, surface, txt, border)
- [ ] Cards menggunakan `rounded-[12px] shadow-card`
- [ ] Buttons menggunakan `rounded-full`
- [ ] Light mode only — tidak ada dark mode styling
- [ ] Panel admin: teks besar, spacing lega (senior-friendly)
- [ ] Responsive (mobile-first)

**Next.js Convention:**
- [ ] Public pages = server components + Prisma direct
- [ ] Panel pages = client components + fetch API
- [ ] `export const dynamic = "force-dynamic"` ada jika query DB
- [ ] Metadata/SEO ada untuk halaman publik baru

**Prisma & Database:**
- [ ] Query efisien (select specific fields, bukan select all)
- [ ] Relasi di-include hanya yang dibutuhkan
- [ ] Tidak ada N+1 query

### 3. Rangkum Hasil

Output dalam format:

```
## Review Result

### Status: ✅ CLEAN / ⚠️ ADA ISSUES / ❌ BLOCKING

### Issues Ditemukan
| # | Severity | File | Issue | Saran |
|---|----------|------|-------|-------|
| 1 | 🔴 HIGH | ... | ... | ... |
| 2 | 🟡 MED | ... | ... | ... |
| 3 | 🟢 LOW | ... | ... | ... |

### Summary
- Total files reviewed: X
- Issues found: X (high: X, medium: X, low: X)
```

### 4. Rekomendasi

Berdasarkan hasil:

- **✅ CLEAN** — Sarankan: "Siap deploy. Jalankan `/deploy`."
- **⚠️ ADA ISSUES (non-blocking)** — Sarankan: "Ada beberapa issue minor. Bisa `/deploy` dulu atau `/fix` dulu."
- **❌ BLOCKING** — Sarankan: "Ada issue kritis. Jalankan `/fix` untuk perbaiki sebelum deploy."

## Aturan

- Review SEMUA file yang berubah, jangan skip
- Jangan auto-fix — hanya laporkan. Fix dilakukan oleh `/fix` atau `/code`
- Jika tidak ada perubahan (clean working tree), laporkan "Tidak ada perubahan untuk di-review"
- Prioritaskan security issues di atas segalanya
