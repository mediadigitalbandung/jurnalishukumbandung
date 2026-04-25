# Audit-API — API Audit Specialist

Deep audit semua API routes: conventions, validation, errors, rate limits. Read-only.

## Input
$ARGUMENTS — scope: `auth`, `validation`, `errors`, `rest`, `rate` (default: all)

## Scope

- REST conventions (method, status codes, naming)
- Input validation (Zod schemas)
- Error handling consistency
- Response format consistency
- Rate limiting
- Auth per endpoint
- API versioning

## Checklist

### CRITICAL
1. **API tanpa auth** untuk sensitive data (user, audit-log, settings)
2. **No input validation** — body langsung di-destructure
3. **SQL injection possible** — string concat di query
4. **Unhandled promise rejection** — no try/catch

### HIGH
5. **Wrong HTTP method** — GET untuk mutation, POST untuk read
6. **No status code** di error — default 200 padahal error
7. **Inconsistent response** — beberapa return `{data}`, lainnya raw
8. **Missing input limits** — no pagination, loop unlimited
9. **N+1 queries** di API handler
10. **No CORS config** untuk public APIs
11. **Rate limit missing** di public endpoints (search, comment, contact)

### MEDIUM
12. **Verbose error messages** expose internal (stack, DB error)
13. **No request ID** untuk tracing
14. **Missing OpenAPI/Swagger** documentation
15. **Inconsistent param naming** (camelCase vs snake_case)
16. **No versioning** (/api/v1/... vs /api/...)

### LOW
17. **Missing Cache-Control headers** di read-heavy endpoints
18. **No ETag** untuk conditional requests
19. **Response > 1MB** tanpa pagination/streaming

## Metodologi

```bash
# 1. All API routes
find src/app/api -name "route.ts"

# 2. Auth coverage
grep -L "requireRole\|requireAuth\|getServerSession" src/app/api/**/route.ts

# 3. Validation coverage
grep -L "z\\.\\|zod\|schema\\.parse" src/app/api/**/route.ts

# 4. Error handling
grep -L "try\|catch\|errorResponse" src/app/api/**/route.ts

# 5. Rate limit
grep -rn "rateLimit\|ratelimit" src/

# 6. Test endpoints (live)
curl -X POST https://jurnalishukumbandung.com/api/search -d '{"q":""}'
# Check response format, status codes
```

## Output Format

Standard + API metrics:

```
### 📊 API Metrics
- Total routes: [N]
- With auth: [N/N] ([%])
- With validation: [N/N] ([%])
- With try/catch: [N/N] ([%])
- Public routes: [N]
- Routes with rate limit: [N]

### Route Coverage Matrix
| Route | Auth | Valid | TryCatch | Rate |
|---|---|---|---|---|
| /api/users | ✓ | ✓ | ✓ | ✗ |

### Missing Protection
1. [route] — no auth, no rate limit
```

## Chain ke

- `/api-new` — fix/add new endpoints
- `/fix-runtime` — fix API errors
- `/review-security` — deeper security check
- `/audit-all` — return