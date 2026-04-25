# Audit-A11y — Accessibility Audit Specialist

Deep audit WCAG 2.1 AA compliance untuk JHB. Read-only.

## Input
$ARGUMENTS — scope: `semantic`, `contrast`, `keyboard`, `aria`, `form` (default: all)

## Scope

- Semantic HTML (landmark, heading hierarchy)
- Color contrast (WCAG AA: 4.5:1 text, 3:1 UI)
- Keyboard navigation (tab order, focus trap, skip link)
- ARIA attributes (proper usage, no misuse)
- Form accessibility (labels, error messages, required)
- Screen reader (alt text, aria-label)
- Focus indicators

## Checklist

### CRITICAL (blocking)
1. **Images tanpa alt** di content/UI (kecuali `alt=""` untuk decorative)
2. **Form input tanpa `<label>`** — screen reader tidak bisa identify
3. **Button/link tanpa accessible name** (icon-only tanpa `aria-label`)
4. **Keyboard trap** — user stuck, tidak bisa Tab keluar modal
5. **No skip-to-content link** di halaman publik (sudah ada di JHB ✓)

### HIGH
6. **Contrast < 4.5:1** untuk body text
7. **Heading skip** (H1 → H3 tanpa H2)
8. **`<div>` as button** tanpa `role="button"` + keyboard handler
9. **Form error** hanya color (no icon/text) — color blind issue
10. **Auto-play video/audio** tanpa control
11. **Fixed font size** (px bukan rem) — user tidak bisa zoom

### MEDIUM
12. **Missing `lang` attribute** di `<html>` — JHB pakai `lang="id"` ✓
13. **Link "baca selengkapnya"** tanpa context untuk screen reader
14. **Modal tanpa `role="dialog"` + focus trap**
15. **Missing focus indicator** (outline dihilangkan tanpa replacement)
16. **Table tanpa `<th>`** atau `scope` attribute

### LOW
17. **Decorative icon** tanpa `aria-hidden="true"`
18. **Nested interactive elements** (button dalam button)
19. **Missing `role="navigation"` di `<nav>`** (biasanya implicit)

## Metodologi

```bash
# 1. Image alt scan
grep -rn "<img\|<Image" src/ | grep -v "alt="

# 2. Button without accessible name
grep -rn "<button" src/ | grep -v "aria-label\|children\|{.*}"

# 3. Form inputs
grep -rn "<input\|<textarea\|<select" src/ --include="*.tsx"
# Cross-ref with <label htmlFor=...>

# 4. Contrast check — automated
# Install: npm i -D pa11y
npx pa11y https://jurnalishukumbandung.com

# 5. Lighthouse accessibility
npx lighthouse https://jurnalishukumbandung.com --only-categories=accessibility
```

Manual tests:
- Tab through seluruh halaman tanpa mouse
- Test dengan VoiceOver (Mac) atau NVDA (Windows)
- Zoom 200% — masih readable?
- Test dengan contrast checker (Chrome DevTools)

## Output Format

Standard + a11y metrics:

```
### 📊 A11y Metrics
- Lighthouse a11y score: [X/100]
- Images total: [N] | Tanpa alt: [N]
- Form inputs total: [N] | Tanpa label: [N]
- Buttons total: [N] | Tanpa accessible name: [N]
- Contrast issues: [N]
- Keyboard traps: [N]

### WCAG Violations by Level
- Level A (critical): [N]
- Level AA (required): [N]
- Level AAA (ideal): [N]
```

## Chain ke

- `/style` — fix styling/contrast
- `/code` — fix component accessibility
- `/panel` — fix admin panel a11y (penting untuk senior users!)
- `/audit-all` — return

## Aturan

- Fokus WCAG AA (JHB target: full compliance)
- Panel admin WAJIB lolos a11y (user berumur — font besar, kontras tinggi)
- Test dengan screen reader, jangan asumsi