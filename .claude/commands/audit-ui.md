# Audit-UI — UI/UX Audit Specialist

Deep audit konsistensi design system, responsive, UX patterns. Read-only.

## Input
$ARGUMENTS — scope: `design-tokens`, `responsive`, `components`, `patterns`

## Scope

- Design token consistency (warna, spacing, radius, font)
- Responsive breakpoints
- Component reusability
- Interactive feedback (hover, focus, loading, disabled states)
- Empty states, error states, skeleton loaders
- Panel admin-specific (teks besar, spacing lega)

## Checklist

### CRITICAL
1. **Hardcoded hex colors** — `text-[#00AA13]` bukan `text-goto-green`
2. **No responsive** — layout broken < 640px
3. **Missing loading states** — blank page saat fetch

### HIGH
4. **Inconsistent rounded** — mix `rounded-lg` + `rounded-[12px]` di level yang sama
5. **Missing hover states** di interactive elements
6. **Touch target < 44px** (mobile usability)
7. **Font size hardcoded px** — tidak scalable
8. **No skeleton loader** di data-fetching components
9. **Missing error state** — empty state saat fetch fail

### MEDIUM
10. **Spacing inconsistent** — mix `mt-3` + `mt-4` di list serupa
11. **Button variant inconsistent** — warna berbeda untuk action sama
12. **Modal implementation duplicated** — tidak pakai shared component
13. **Panel admin teks < 16px** — melanggar aturan senior-friendly
14. **Toast position inconsistent**

### LOW
15. **Icon size inconsistent** — mix 16, 18, 20, 24 tanpa sistem
16. **Transition timing inconsistent** (150ms vs 200ms vs 300ms)
17. **Shadow inconsistent** — custom shadow per component

## Metodologi

```bash
# 1. Hardcoded colors
grep -rn "text-\\[#\\|bg-\\[#\\|border-\\[#" src/

# 2. Inline styles
grep -rn "style={{" src/ --include="*.tsx"

# 3. Rounded inconsistency
grep -rn "rounded-" src/ --include="*.tsx" | grep -oE "rounded-[a-z0-9[\\-]]+" | sort | uniq -c

# 4. Spacing patterns
grep -rn "p-\\|m-\\|gap-\\|space-" src/components/

# 5. Responsive check
grep -rn "sm:\\|md:\\|lg:" src/ --include="*.tsx"
```

Visual audit:
- Browse di mobile (360px), tablet (768px), desktop (1280px, 1920px)
- Test dark mode — tapi JHB LIGHT MODE only
- Test long content (truncation, overflow)

## Output Format

Standard + UI metrics:

```
### 📊 UI Metrics
- Hardcoded colors: [N]
- Inline styles: [N]
- Components total: [N]
- Components reused (> 3x): [N]
- Responsive coverage: [%]

### Design Token Violations
| Pattern | Count | Files |
|---|---|---|
| text-[#hex] | 5 | [list] |
| bg-[#hex] | 3 | [list] |

### Component Duplicates (potential for DRY)
1. Modal — 3 implementations
2. [...]
```

## Chain ke

- `/style` — fix UI issues
- `/panel` — fix admin UI (senior-friendly)
- `/audit-a11y` — cross-reference
- `/audit-all` — return