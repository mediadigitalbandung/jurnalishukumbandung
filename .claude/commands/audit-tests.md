# Audit-Tests — Test Coverage Audit Specialist

Audit test coverage: unit, integration, e2e. Read-only.

## Scope

- Unit test coverage (components, utils, lib)
- Integration test coverage (API routes)
- E2E test coverage (critical user flows)
- Test quality (assertions, edge cases)
- CI/CD test execution
- Test performance (execution time)

## Checklist

### CRITICAL
1. **Zero tests** di critical modules (`src/lib/auth`, `src/app/api/`)
2. **Tests broken** — existing tests fail atau skip semua
3. **No CI runs tests** — merge tanpa test

### HIGH
4. **API routes tanpa test** — business logic kritikal untrusted
5. **Auth flow tanpa test** — login, logout, permission
6. **No integration test** untuk DB operations
7. **Test pure snapshot** tanpa semantic assertion
8. **Flaky tests** — pass/fail random

### MEDIUM
9. **Util functions tanpa test** di `src/lib/`
10. **Component tests missing** untuk shared components
11. **No test untuk edge cases** (empty, null, error)
12. **Test execution > 5 menit** — terlalu lama

### LOW
13. **Test fixtures duplicated** — tidak pakai shared factories
14. **No test documentation**
15. **Coverage report missing** di CI output

## Metodologi

```bash
# 1. Test files discovery
find src tests __tests__ -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l

# 2. Test framework setup
grep -E "jest|vitest|playwright|cypress" package.json

# 3. Run tests
npm test -- --coverage 2>&1 | tail -30

# 4. Coverage report
cat coverage/coverage-summary.json | jq '.total'

# 5. Critical modules without tests
for f in src/lib/auth.ts src/lib/prisma.ts src/lib/api-utils.ts src/lib/seo-utils.ts; do
  test_file="${f%.ts}.test.ts"
  [ -f "$test_file" ] || echo "MISSING: $test_file"
done

# 6. API routes without tests
find src/app/api -name "route.ts" | while read f; do
  test_file="${f%route.ts}route.test.ts"
  [ -f "$test_file" ] || echo "MISSING: $test_file"
done
```

## Output Format

```
### 📊 Test Metrics
- Total test files: [N]
- Unit tests: [N]
- Integration tests: [N]
- E2E tests: [N]
- Coverage: statements [X%] | branches [Y%] | functions [Z%] | lines [W%]
- Execution time: [N] seconds
- Flaky tests: [N]

### Critical Modules Coverage
| Module | Tests | Coverage |
|---|---|---|
| src/lib/auth.ts | 0 | 0% 🚨 |
| src/lib/prisma.ts | 2 | 40% |
| src/app/api/articles | 0 | 0% 🚨 |

### Missing Tests (prioritized)
1. `src/lib/auth.ts` — auth logic (critical)
2. `src/app/api/articles/route.ts` — CRUD operations
3. [...]
```

## Chain ke

- `/test` — run existing tests
- `/code` — write new tests
- `/audit-all` — return

## Aturan

- Critical modules (auth, API) WAJIB punya test
- Coverage target: > 60% statements untuk critical modules
- Fokus behavior test, bukan implementation detail
- Jangan test third-party library (Prisma, Next.js internal)