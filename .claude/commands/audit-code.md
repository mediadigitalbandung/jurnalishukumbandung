# Audit-Code — Code Quality Audit Specialist

Audit detail untuk kualitas kode: naming, complexity, duplication, dead code, patterns.
Read-only agent — TIDAK mengubah file.

## Input

$ARGUMENTS — folder scope (opsional), default: seluruh `src/`

## Scope Spesifik

HANYA audit:
- Naming conventions (camelCase, PascalCase, kebab-case)
- Function complexity (cyclomatic complexity, length)
- Code duplication (copy-paste detection)
- Dead code (unused exports, functions, files)
- TypeScript strictness (any, unknown, type assertions)
- Import hygiene (unused imports, circular deps)
- Console.log / debug statements tertinggal
- TODO / FIXME / HACK comments

TIDAK menangani: security (→ `/audit-security`), perf (→ `/audit-perf`).

## Checklist Audit

### CRITICAL
1. **`any` type usage** — scan semua `: any` atau `as any` di `src/**/*.ts(x)`
2. **Circular dependencies** — run `npx madge --circular src/`
3. **Hardcoded secrets** — scan regex pattern untuk API keys, tokens di kode

### HIGH
4. **Long functions** — function > 50 lines, cyclomatic complexity > 10
5. **Long files** — file > 500 lines (kecuali schema)
6. **Duplicate code blocks** — blocks > 15 lines diulang
7. **Unused exports** — export yang tidak pernah diimport
8. **console.log tertinggal** — di production code (bukan debug route)

### MEDIUM
9. **Inconsistent naming** — mixing camelCase + snake_case di 1 file
10. **Magic numbers** — number literal > 1 tanpa named constant
11. **Deep nesting** — indentation level > 4
12. **Missing return types** — explicit return type hilang di exported functions
13. **TODO/FIXME tertinggal** — comment dengan TODO/FIXME/HACK/XXX

### LOW
14. **Unused imports** — import yang tidak dipakai
15. **Inconsistent file naming** — mixing kebab-case + PascalCase di 1 folder
16. **Missing JSDoc** — exported function tanpa dokumentasi (hanya yang public API)

## Metodologi

```bash
# 1. Count any usage
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | wc -l

# 2. Find circular deps
npx madge --circular --extensions ts,tsx src/

# 3. Find unused exports
npx ts-prune

# 4. Find dead code
npx knip

# 5. Long files
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -20

# 6. console.log scan
grep -rn "console\\.log" src/ --include="*.ts" --include="*.tsx"

# 7. TODO scan
grep -rn "TODO\\|FIXME\\|HACK\\|XXX" src/
```

## Output Format

```markdown
## Code Quality Audit Report

### Summary
- Total issues: [N]
- Critical: [N] | High: [N] | Medium: [N] | Low: [N]
- Score: [X]/100

**Formula skor:**
- Critical × 10 = deduction
- High × 3 = deduction
- Medium × 1 = deduction
- Low × 0.5 = deduction
- Score = max(0, 100 - deductions)

### 🚨 Critical
1. `src/lib/xxx.ts:42` — `any` type pada return function
   **Impact:** Type safety bypass, runtime error risk
   **Fix:** Ganti dengan specific type atau `unknown` + type guard

### ⚠️ High
[...]

### 📋 Medium
[...]

### 💡 Low
[...]

### 📊 Metrics
- Files total: [N]
- Lines of code: [N]
- Functions: [N]
- Average function length: [N] lines
- Max file size: [file] ([N] lines)
- `any` usage: [N]
- Circular deps: [N]
- Dead exports: [N]
- console.log: [N]
- TODO comments: [N]

### Top 5 Refactoring Priorities
1. [File] — [reason]
2. [...]
```

## Chain ke

- `/review-quality` — deeper code review
- `/fix-build` — jika ada TypeScript errors
- `/code` — refactoring aktual
- `/audit-all` — return ke orchestrator

## Aturan

- READ-ONLY — jangan edit file
- Fokus kualitas struktural, bukan logika bisnis
- Scoring deterministic (bisa di-compare antar audit)