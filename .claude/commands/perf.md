# Perf — Performance Optimizer

Analisis dan optimasi performa aplikasi.

## Input

$ARGUMENTS — area spesifik yang lambat, atau "general" untuk audit keseluruhan.

## Langkah-langkah

### 1. Identifikasi Area

Tentukan fokus:
- Halaman tertentu yang lambat?
- API endpoint yang slow?
- Build time terlalu lama?
- Bundle size terlalu besar?
- Database query lambat?

### 2. Audit Performa

**Database & Prisma:**
- Cek N+1 queries (nested include yang tidak perlu)
- Cek missing indexes di `schema.prisma`
- Cek `findMany` tanpa limit/pagination
- Cek `select` — hanya query field yang dibutuhkan, bukan semua
- Cek query di loop (harusnya batch)

**Next.js Rendering:**
- Cek rendering strategy per halaman:
  - Homepage: ISR (revalidate 60s) ✓
  - Artikel: SSR atau ISR
  - Panel: Client-side (CSR)
- Cek `dynamic = "force-dynamic"` — hanya jika benar-benar perlu
- Cek unnecessary re-renders di client components
- Cek `useEffect` dependency arrays

**Bundle & Assets:**
- Cek import besar yang bisa di-lazy load
- Cek `next/dynamic` untuk komponen berat (editor, chart)
- Cek image optimization (`next/image` dengan proper sizes)
- Cek third-party scripts yang blocking

**API Routes:**
- Cek response time (estimasi dari query complexity)
- Cek caching opportunities (revalidate, stale-while-revalidate)
- Cek payload size — jangan kirim data yang tidak dipakai client

### 3. Implementasi Optimasi

Terapkan perbaikan berdasarkan temuan. Prioritas:
1. **Database indexes** — impact besar, risiko rendah
2. **Query optimization** — select specific fields
3. **Lazy loading** — komponen berat
4. **Caching** — ISR atau API cache headers
5. **Image optimization** — sizes, priority, lazy

### 4. Verifikasi

```bash
npx next build
```

Cek build output — perhatikan:
- First Load JS per route (target: < 100kB per page)
- Static vs Dynamic routes
- Build warnings

### 5. Selesai

Laporkan:
- Bottleneck yang ditemukan
- Optimasi yang diterapkan
- Estimasi improvement

Sarankan: **"Performa dioptimasi. Jalankan `/deploy` untuk deploy."**

## Aturan

- Jangan ubah behavior/fitur — hanya optimasi
- Test build setelah optimasi — jangan break things
- Prioritaskan optimasi yang high-impact & low-risk
- Jangan premature optimize — fokus pada bottleneck yang terukur
- Jangan hapus `force-dynamic` tanpa pahami konsekuensinya
