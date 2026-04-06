# Test — Tester & Validator

Test build, API endpoints, dan halaman untuk pastikan semuanya working.

## Input

$ARGUMENTS — area spesifik yang mau ditest, atau kosong untuk full test.

## Langkah-langkah

### 1. Build Test

Pastikan build berhasil tanpa error:
```bash
npx next build
```

Jika build gagal:
- Catat error message
- Sarankan: **"Build gagal. Jalankan `/fix` untuk perbaiki."**
- STOP — jangan lanjut test lain

### 2. Type Check

Cek TypeScript errors:
```bash
npx tsc --noEmit
```

Catat semua type errors jika ada.

### 3. API Endpoint Test (jika ada perubahan API)

Untuk setiap API route yang berubah, test dengan curl:

```bash
# GET endpoint
curl -s http://localhost:3001/api/resource | head -c 500

# POST endpoint (contoh)
curl -s -X POST http://localhost:3001/api/resource \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

Cek:
- Response status code benar
- Response format sesuai (JSON valid)
- Error handling bekerja (test invalid input)

### 4. Prisma Validation (jika ada perubahan schema)

```bash
npx prisma validate
npx prisma generate
```

### 5. Rangkum Hasil

```
## Test Results

### Build: ✅ PASS / ❌ FAIL
### TypeScript: ✅ PASS / ❌ X errors
### API Tests: ✅ PASS / ❌ X endpoints failed
### Prisma: ✅ PASS / ❌ FAIL

### Detail Errors (jika ada)
1. [error description]
2. ...
```

### 6. Rekomendasi

Berdasarkan hasil:
- **Semua PASS** → Sarankan: **"Semua test passed. Jalankan `/deploy`."**
- **Ada FAIL** → Sarankan: **"Ada test gagal. Jalankan `/fix` untuk perbaiki."**

## Aturan

- Build test WAJIB dijalankan setiap kali — ini test paling penting
- Jangan auto-fix — hanya laporkan. Fix dilakukan oleh `/fix`
- Jika app sedang running di localhost:3001, bisa test API langsung
- Jika app tidak running, cukup build test + type check
- Jangan test di production URL — hanya localhost atau build
