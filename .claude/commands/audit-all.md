# Audit-All — Master Audit Orchestrator

Orchestrator audit komprehensif untuk seluruh aspek proyek JHB.
Spawn 15 specialist audit agent PARALEL, kompilasi hasil menjadi satu master report.

## Input

$ARGUMENTS — scope opsional:
- kosong / `full` — audit semua domain
- `quick` — hanya 5 domain kritikal (security, seo, perf, content, infra)
- `[domain1,domain2]` — hanya domain spesifik

## Sub-Agent Audit yang Dikelola

| # | Specialist | Scope |
|---|---|---|
| 1 | `/audit-code` | Code quality, naming, complexity, dead code, duplication |
| 2 | `/audit-security` | OWASP Top 10, XSS, SQLi, auth, secrets exposure |
| 3 | `/audit-seo` | Meta, schema, internal links, sitemap, indexability |
| 4 | `/audit-perf` | Bundle, CWV, rendering, image, font, script |
| 5 | `/audit-a11y` | WCAG AA, ARIA, keyboard nav, contrast, screen reader |
| 6 | `/audit-db` | Schema, indexes, query perf, constraints, N+1 |
| 7 | `/audit-api` | REST conventions, validation, errors, rate limit, auth |
| 8 | `/audit-ui` | Design system consistency, responsive, UX patterns |
| 9 | `/audit-content` | Article quality, duplicate, non-legal, outdated, broken |
| 10 | `/audit-deps` | Outdated packages, CVE, unused, bundle impact |
| 11 | `/audit-infra` | VPS, PM2, disk, memory, logs, uptime |
| 12 | `/audit-legal` | KEJ, Dewan Pers, privacy, cookie, disclaimer |
| 13 | `/audit-analytics` | GA4, GSC, event coverage, tracking consistency |
| 14 | `/audit-backup` | DB backup freshness, media backup, restore test |
| 15 | `/audit-tests` | Test coverage, integration, e2e, regression |

## Eksekusi

### Mode: full (default)

**Spawn SEMUA 15 sub-agent PARALEL via Agent tool:**

```
PARALEL WAVE 1 (read-only, cepat):
├── /audit-code
├── /audit-security
├── /audit-seo
├── /audit-a11y
├── /audit-ui
├── /audit-content
├── /audit-deps
└── /audit-legal

PARALEL WAVE 2 (butuh build/query, lebih lama):
├── /audit-perf
├── /audit-db
├── /audit-api
├── /audit-infra
├── /audit-analytics
├── /audit-backup
└── /audit-tests
```

Setiap sub-agent return report dengan format standar (lihat di bawah).

### Mode: quick

Spawn hanya 5:
- `/audit-security`
- `/audit-seo`
- `/audit-perf`
- `/audit-content`
- `/audit-infra`

### Mode: specific

User bisa specify: `/audit-all security,seo,perf` → hanya spawn 3 agent.

## Output Format Standar (dari setiap sub-agent)

Setiap sub-agent WAJIB return format ini:

```markdown
## [Domain] Audit Report

### Summary
- Total issues: N
- Critical: N | High: N | Medium: N | Low: N
- Score: X/100

### Critical Issues
1. [File:Line] — Deskripsi masalah
   **Impact:** [dampak]
   **Fix:** [cara perbaiki]

### High Priority
[...]

### Medium Priority
[...]

### Low Priority
[...]

### Recommendations
1. [...]
2. [...]
```

## Master Report Compilation

Setelah semua sub-agent selesai, orchestrator kompilasi:

```markdown
# 🔍 JHB MASTER AUDIT REPORT
**Generated:** [timestamp]
**Mode:** full | quick | specific
**Duration:** [seconds]

## 📊 Executive Summary

| Domain | Score | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Code Quality | 82/100 | 0 | 3 | 8 | 15 |
| Security | 91/100 | 0 | 1 | 5 | 12 |
| SEO | 88/100 | 0 | 2 | 10 | 20 |
| Performance | 75/100 | 1 | 5 | 15 | 25 |
| [...] |

**Overall Score:** 84/100
**Total Critical:** N
**Total High:** N

## 🚨 CRITICAL ISSUES (fix immediately)

### 1. [Domain] — [Issue Title]
**File:** `path/to/file.ts:42`
**Impact:** [dampak bisnis/teknis]
**Fix:** [langkah perbaikan]
**Chain:** `/fix-runtime` + `/deploy`

### 2. [...]

## ⚠️ HIGH PRIORITY (fix dalam 1 minggu)
[...]

## 📋 MEDIUM PRIORITY (fix dalam 1 bulan)
[...]

## 💡 LOW PRIORITY (technical debt)
[...]

## 🎯 TOP 10 QUICK WINS

Actions dengan high impact + low effort:
1. [...]
2. [...]

## 🔗 RECOMMENDED ACTIONS

### Auto-fix bisa dijalankan sekarang:
- [ ] `/fix-build` — 3 TypeScript errors
- [ ] `/seo-meta` — 8 halaman missing description
- [ ] `/perf-bundle` — 2 route > 200kB
- [ ] `/clean` — 15 draft > 30 hari

### Manual review dibutuhkan:
- [ ] [...]

## 📈 TREND (vs last audit)

Score: 84 → 87 (+3) ↗️
Critical: 3 → 1 (-2) ↗️
High: 15 → 11 (-4) ↗️

(Auto-compare dengan `audit-reports/latest.md` jika ada)
```

## Simpan Report

Output selalu disimpan ke:
```
audit-reports/YYYY-MM-DD-HHMM.md
audit-reports/latest.md  (symlink)
```

Untuk comparison di audit berikutnya.

## Chain ke

- `/fix` — jika ada critical issues yang auto-fixable
- `/deploy` — setelah fix applied
- `/plan` — jika banyak issues butuh planning besar
- `/monitor` — lanjut health check

## Aturan

- Semua sub-agent WAJIB read-only (JANGAN ubah file)
- Fix dilakukan SEPARATE via `/fix-*` atau specialist lain
- Report disimpan ke `audit-reports/` untuk historical tracking
- Jika sub-agent fail, lanjutkan lainnya — jangan stop
- Prioritize severity: Critical > High > Medium > Low