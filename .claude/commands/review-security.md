# Review-Security — Security Audit Specialist

Specialist agent untuk security review. Fokus pada OWASP Top 10 dan kerentanan spesifik Next.js.
Dipanggil oleh `/review` (orchestrator) secara paralel dengan `/review-quality`.

## Input

$ARGUMENTS — file atau area spesifik. Default: semua file yang berubah (git diff).

## Tugas Spesifik

Specialist ini HANYA menangani aspek keamanan:
- Injection (SQL, command, XSS)
- Auth & authorization
- Sensitive data exposure
- Broken access control
- Security misconfiguration

## Checklist Keamanan

### 1. Secrets & Credentials
```
[ ] Tidak ada API key/password hardcoded di kode
[ ] Tidak ada .env content yang ter-expose
[ ] File .env tidak masuk git staging (cek git status)
[ ] process.env.* hanya diakses server-side (bukan NEXT_PUBLIC_ untuk secret)
[ ] JWT secret, database URL, auth secret aman
```

### 2. SQL / Prisma Injection
```
[ ] Semua query Prisma menggunakan parameterized queries (bukan raw string concat)
[ ] $queryRaw hanya digunakan jika benar-benar perlu, dengan $queryRawUnsafe DILARANG
[ ] Input user tidak langsung di-interpolasi ke query
```

### 3. XSS (Cross-Site Scripting)
```
[ ] dangerouslySetInnerHTML hanya untuk konten sanitized (DOMPurify atau server-side)
[ ] User-generated content di-escape sebelum render
[ ] innerHTML assignment tidak ada di client code
[ ] Artikel content dari DB di-sanitize (cek CopyProtection component)
```

### 4. Authentication & Authorization
```
[ ] Semua panel routes cek session (requireRole atau getServerSession)
[ ] API routes yang butuh auth punya guard yang benar
[ ] Role check benar: SUPER_ADMIN, EDITOR, REPORTER (baca src/lib/roles.ts)
[ ] Tidak ada endpoint admin yang bisa diakses tanpa auth
[ ] CRON_SECRET dicek untuk cron endpoints
```

### 5. Input Validation
```
[ ] Body request di-parse dan divalidasi sebelum diproses
[ ] File upload: validasi tipe dan ukuran (cek src/app/api/upload/route.ts)
[ ] Numeric inputs di-parse dengan parseInt/parseFloat + validasi range
[ ] String inputs ada max length check untuk field DB
```

### 6. Sensitive Data Exposure
```
[ ] Password hash tidak di-return di API response
[ ] Field sensitif (activeSessionId, passwordHash) tidak di-select Prisma
[ ] Error messages tidak expose stack trace ke client
[ ] Response tidak include data user lain yang tidak relevan
```

### 7. Next.js Specific
```
[ ] Server Actions (jika ada) punya auth check
[ ] API route tidak accessible dari browser tanpa proper headers
[ ] Redirect URL tidak open-redirect (validate domain sebelum redirect)
[ ] CORS headers tidak wildcard untuk endpoints sensitif
```

## Output Format

```
## Security Review

### Status: ✅ SECURE / ⚠️ WARNINGS / 🚨 CRITICAL

### Issues
| Severity | File:Line | Issue | Rekomendasi |
|---|---|---|---|
| 🚨 CRITICAL | ... | ... | ... |
| ⚠️ WARNING | ... | ... | ... |
| ℹ️ INFO | ... | ... | ... |
```

→ Laporkan ke `/review` (orchestrator). Jika CRITICAL ditemukan, `/review` akan block deploy.