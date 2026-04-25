# Review — Quality Gate Orchestrator

Gate wajib sebelum deploy. Spawn security + quality review secara paralel.

## Input

$ARGUMENTS — file spesifik (opsional). Default: semua perubahan dari git diff.

## Spawn Pattern

**Spawn 2 sub-agent PARALEL:**
```
PARALEL:
├── /review-security → audit keamanan (XSS, injection, auth, secrets)
└── /review-quality  → audit kualitas (TypeScript, patterns, design system)
```

Tunggu keduanya selesai → merge hasil → buat keputusan final.

## Decision Logic

Berdasarkan hasil gabungan kedua specialist:

```
review-security: CRITICAL issue ada?
  → YA  → Status: 🚨 BLOCKED — JANGAN DEPLOY
  → TIDAK

review-quality: BLOCKING issue ada?
  → YA  → Status: ❌ NEEDS FIX — selesaikan dulu
  → TIDAK

Semua clear?
  → ✅ APPROVED — siap deploy
```

## Consolidated Report Format

```
## Review Report

### Final Status: ✅ APPROVED / ⚠️ WARNINGS / ❌ BLOCKED

────────────────────────────────
🔒 SECURITY (by /review-security)
────────────────────────────────
[hasil dari review-security]

────────────────────────────────
📋 QUALITY (by /review-quality)
────────────────────────────────
[hasil dari review-quality]

────────────────────────────────
📊 SUMMARY
────────────────────────────────
Files reviewed: X
Security issues: X critical, X warnings
Quality issues: X blocking, X medium, X minor
```

## Rekomendasi

| Status | Aksi Selanjutnya |
|---|---|
| ✅ APPROVED | → `/deploy` langsung |
| ⚠️ WARNINGS (non-critical) | → Tanya user: deploy dulu atau fix dulu? |
| ❌ BLOCKED | → `/fix` untuk security issues, `/code` untuk quality fixes |
| 🚨 CRITICAL SECURITY | → STOP — jangan deploy sampai fix security |

## Scope per Sub-Agent

**`/review-security` checks:**
- Secrets/credentials exposed
- SQL injection (Prisma raw queries)
- XSS (dangerouslySetInnerHTML)
- Auth bypass
- Sensitive data in responses
- .env in git

**`/review-quality` checks:**
- TypeScript correctness
- Next.js conventions (server vs client components)
- Design system compliance (GoTo green, rounded-[12px])
- N+1 queries
- Missing loading/error states
- Pattern consistency

## Aturan

- Review SEMUA file yang berubah — jangan skip
- Sub-agents TIDAK melakukan fix — hanya report
- Fix dilakukan oleh `/fix` atau `/code` berdasarkan hasil review
- Security issues SELALU priority di atas quality issues