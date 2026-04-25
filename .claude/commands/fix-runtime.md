# Fix-Runtime — Runtime & API Error Specialist

Specialist agent untuk error saat aplikasi berjalan: 500 errors, API failures, auth issues, Prisma runtime errors.
Dipanggil oleh `/fix` (orchestrator) ketika runtime error terdeteksi.

## Input

$ARGUMENTS — error message, URL yang error, atau "logs" untuk cek PM2 logs.

## Tugas Spesifik

Specialist ini HANYA menangani:
- HTTP 500 errors dari API routes
- Prisma runtime errors (query failed, constraint violation)
- NextAuth / session errors
- Hydration mismatch
- PM2 crash / restart loops
- Environment variable missing

TIDAK menangani: TypeScript/build errors (→ `/fix-build`).

## Langkah Diagnosa

### 1. Cek Error Logs

**PM2 logs (VPS):**
```bash
ssh root@145.79.15.99 "pm2 logs jhb --lines 100 --nostream 2>&1 | grep -A5 'Error\|error\|Error'"
```

**Local development:**
```bash
# Lihat terminal Next.js dev server
# Cek browser Network tab → response body untuk API calls
```

### 2. Reproduce Error

Identifikasi dari error message:
- Endpoint mana? (`/api/...`)
- Method apa? (GET/POST/PUT/DELETE)
- Data apa yang dikirim?
- User role apa? (anonymous/REPORTER/EDITOR/SUPER_ADMIN)

### 3. Common Runtime Errors & Fixes

**Prisma P2002 (Unique constraint):**
- Data duplikat — tambah pengecekan unik sebelum insert
- Cek field yang punya `@unique` di schema

**Prisma P2025 (Record not found):**
- `findUnique` return null — tambah null check
- Gunakan `findFirst` jika bisa ada multiple

**Prisma P2003 (Foreign key constraint):**
- Relasi ke record yang tidak ada — validasi ID sebelum insert

**Auth/Session errors:**
```
[ ] Cek NEXTAUTH_SECRET di environment
[ ] Cek DATABASE_URL valid dan bisa connect
[ ] Cek session callback di src/lib/auth.ts
[ ] requireRole() throw jika session invalid — pastikan try-catch menangkap
```

**Hydration mismatch:**
- Server render berbeda dengan client
- Fix: pindahkan dynamic content ke useEffect, atau gunakan suppressHydrationWarning
- Penyebab umum: Date.now(), Math.random(), localStorage di SSR

**PM2 restart loop:**
```bash
# Cek memory usage
ssh root@145.79.15.99 "pm2 show jhb | grep memory"
# Jika OOM: restart + cek memory leak
ssh root@145.79.15.99 "pm2 restart jhb && pm2 show jhb"
```

**Missing environment variable:**
- Cek `.env` di VPS: `ssh root@145.79.15.99 "cat /var/www/jhb/.env | grep -v '=.*$'"`
- Tambah variable yang missing ke `.env` VPS

### 4. Fix & Verify

Terapkan fix. Untuk VPS:
```bash
ssh root@145.79.15.99 "cd /var/www/jhb && git pull origin master && pm2 restart jhb"
```

Test endpoint setelah fix:
```bash
curl -s https://jurnalishukumbandung.com/api/[endpoint] | head -c 200
```

## Output

```
## Fix-Runtime Result

Error Type: [Prisma/Auth/Hydration/PM2/EnvVar]
Root Cause: [deskripsi]
Fix Applied: [apa yang diubah]
Status: ✅ RESOLVED / ❌ NEEDS MORE INVESTIGATION
```

→ Laporkan ke `/fix` (orchestrator).