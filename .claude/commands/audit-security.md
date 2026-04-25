# Audit-Security — Security Audit Specialist

Deep audit keamanan berbasis OWASP Top 10 + kebutuhan spesifik media online.
Read-only agent.

## Input

$ARGUMENTS — scope opsional: `auth`, `input`, `secrets`, `headers`, `deps`

## Scope Spesifik

Audit HANYA:
- Authentication & Authorization (NextAuth, role checks)
- Input validation & sanitization (XSS, SQLi)
- Secret exposure (git history, logs, client code)
- Security headers (CSP, HSTS, X-Frame-Options)
- Upload security (file type, size, location)
- Rate limiting
- CSRF protection
- Session security

TIDAK menangani: code quality (→ `/audit-code`), deps CVE (→ `/audit-deps`).

## Checklist Audit (OWASP-based)

### CRITICAL (fix segera)

1. **A01: Broken Access Control**
   - Cari API route tanpa `requireRole()` / `requireAuth()`
   - Panel routes tanpa session check
   - IDOR: query yang tidak filter by user ID
   ```bash
   grep -L "requireRole\|requireAuth" src/app/api/**/route.ts
   ```

2. **A02: Cryptographic Failures**
   - Password harus bcrypt (12+ rounds)
   - NEXTAUTH_SECRET length >= 32
   - No HTTP-only secrets di client code (`NEXT_PUBLIC_*` untuk secret!)
   ```bash
   grep -rn "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*KEY" src/
   ```

3. **A03: Injection**
   - SQL injection: cari raw query `$queryRaw` tanpa parameterized
   - XSS: `dangerouslySetInnerHTML` tanpa sanitization
   - Command injection: `exec()`, `spawn()` dengan user input
   ```bash
   grep -rn "dangerouslySetInnerHTML\|\\$queryRaw\|exec(" src/
   ```

### HIGH

4. **A04: Insecure Design**
   - Password policy lemah (minimum length, complexity)
   - No 2FA untuk admin
   - Predictable IDs (sequential) untuk sensitive resources

5. **A05: Security Misconfiguration**
   - Next.js config: ada `X-Frame-Options`?
   - CSP header set?
   - HSTS header?
   - `poweredByHeader: false`?
   ```bash
   # Cek next.config.js untuk security headers
   ```

6. **A06: Vulnerable Components**
   - `npm audit` — jumlah vulnerabilities
   - Outdated critical packages (Next.js, Prisma, NextAuth)

7. **A07: Identification & Authentication Failures**
   - Rate limit di login endpoint?
   - Session timeout reasonable?
   - Account lockout setelah N failed attempts?

8. **A08: Software & Data Integrity Failures**
   - Cron endpoint pakai CRON_SECRET?
   - Webhook signatures verified?
   - Dependencies pinned (package-lock.json)?

### MEDIUM

9. **A09: Logging & Monitoring Failures**
   - Audit log untuk sensitive actions (login, role change, delete)?
   - Error logs tidak expose stack trace ke user
   - Log tidak berisi password/token

10. **A10: SSRF**
    - User-provided URLs di fetch: divalidasi?
    - Image proxy: whitelist domains?

### SPECIFIC JHB

11. **Upload Security** (`src/app/api/upload/`)
    - File type whitelist (image only)
    - Max size limit
    - Path traversal prevention (`..` di filename)
    - Stored outside webroot atau dengan random names

12. **Comment System** (`src/app/api/comments/`)
    - Input sanitization (HTML stripped atau sanitized)
    - Rate limit per IP/user
    - Honeypot atau CAPTCHA

13. **API Secrets Exposure**
    - Cek git log untuk commit yang mungkin include .env
    - Cek log output tidak contain full error with env
    ```bash
    git log --all -p | grep -E "API_KEY|SECRET|PASSWORD"
    ```

## Metodologi

```bash
# 1. Auth coverage
grep -L "requireRole\|requireAuth\|getServerSession" src/app/api/**/route.ts

# 2. Dangerous patterns
grep -rn "dangerouslySetInnerHTML" src/
grep -rn "eval(" src/

# 3. Secret scan
grep -rEn "[a-zA-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD)[a-zA-Z0-9_]*\s*=\s*[\"'][^\"']{10,}" src/

# 4. Public env with secrets
grep -rn "NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*PRIVATE" src/

# 5. NPM audit
npm audit --json | jq '.metadata.vulnerabilities'

# 6. Security headers (di next.config)
cat next.config.js | grep -A 20 "headers"

# 7. Password hashing
grep -rn "bcrypt\|hash" src/lib/auth.ts
```

## Output Format

```markdown
## Security Audit Report

### Summary
- Total issues: [N]
- Critical: [N] | High: [N] | Medium: [N] | Low: [N]
- Score: [X]/100

### 🚨 Critical (OWASP A0X)
1. `src/app/api/xxx/route.ts:15` — Missing auth check
   **OWASP:** A01 Broken Access Control
   **Impact:** Unauthenticated user bisa akses data sensitive
   **Fix:** Add `await requireRole(["SUPER_ADMIN"])`
   **Exploit:** `curl /api/xxx` tanpa token → 200 OK

### ⚠️ High
[...]

### 📋 Medium
[...]

### 📊 Security Metrics
- API routes total: [N]
- Routes with auth: [N] ([%])
- Routes missing auth: [N]
- `dangerouslySetInnerHTML` usage: [N]
- npm audit: [critical: N, high: N, moderate: N]
- Security headers set: [X/Y expected]

### Top 5 Quick Security Wins
1. [...]
```

## Chain ke

- `/review-security` — deeper review per area
- `/fix-runtime` — untuk fix security issues
- `/env` — untuk env/secrets issues
- `/audit-all` — return ke orchestrator

## Aturan

- READ-ONLY — jangan ubah kode
- JANGAN log actual secret values (hanya patterns)
- Severity berdasarkan OWASP + eksploitasi real