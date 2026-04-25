# Audit-Deps — Dependencies Audit Specialist

Deep audit package dependencies: outdated, CVE, unused, bundle impact. Read-only.

## Input
$ARGUMENTS — scope: `outdated`, `cve`, `unused`, `size`

## Scope

- Outdated packages (major/minor/patch gap)
- Security vulnerabilities (CVE)
- Unused dependencies
- Duplicate dependencies (multiple versions)
- Bundle size impact per package
- Licenses compatibility

## Checklist

### CRITICAL
1. **Critical CVE unpatched** — npm audit severity=critical
2. **Incompatible license** — GPL di commercial project

### HIGH
3. **Major version gap** di critical packages (Next.js, Prisma, NextAuth)
4. **High/moderate CVE** — unpatched
5. **Unused dev dependencies** — bloat install time
6. **Multiple versions** same package (lockfile conflict)

### MEDIUM
7. **Minor version gap** (missing bug fixes)
8. **Heavy package** untuk simple task (moment → date-fns/native)
9. **Deprecated packages** (officially abandoned)

### LOW
10. **Patch version gap** (semver patch)
11. **Dev deps bisa jadi deps optional**

## Metodologi

```bash
# 1. Outdated check
npm outdated

# 2. Security audit
npm audit --json | jq '.metadata.vulnerabilities'
npm audit --audit-level=moderate

# 3. Unused deps
npx depcheck

# 4. Bundle size per package
npx bundle-phobia-cli [package-name]

# 5. License check
npx license-checker --summary

# 6. Duplicate detection
npm ls --all 2>&1 | grep -E "deduped|UNMET"
```

## Output Format

Standard + deps metrics:

```
### 📊 Deps Metrics
- Total dependencies: [N] (deps) + [N] (devDeps)
- Outdated: [N] (major: N, minor: N, patch: N)
- Vulnerabilities: [critical: N, high: N, moderate: N, low: N]
- Unused: [N]
- Deprecated: [N]

### Critical Updates Needed
| Package | Current | Latest | Gap | CVE |
|---|---|---|---|---|
| next | 14.1.0 | 14.2.5 | minor | CVE-2024-xxx |

### Unused Dependencies (safe to remove)
- pkg-a (1.2.3)
- pkg-b (4.5.6)

### Heaviest Packages
1. recharts — 400kB
2. [...]
```

## Chain ke

- `/fix-build` — setelah update, handle breaking changes
- `/audit-security` — cross-check vulnerabilities
- `/perf-bundle` — bundle impact analysis
- `/test` — regression test setelah update
- `/audit-all` — return

## Aturan

- Update critical packages pertama (Next.js, Prisma, NextAuth)
- Test sebelum bump major version
- Review CHANGELOG untuk breaking changes
- Pin exact version untuk production-critical packages