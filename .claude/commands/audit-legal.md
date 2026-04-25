# Audit-Legal — Legal & Compliance Audit Specialist

Audit compliance jurnalistik: KEJ Dewan Pers, UU Pers, privacy, cookie, disclaimer.
Khusus media hukum — memastikan JHB legal-safe. Read-only.

## Scope

- Kode Etik Jurnalistik (KEJ) Dewan Pers compliance
- UU No. 40/1999 tentang Pers
- UU ITE compliance (pasal 28 ayat 2 — SARA, dll.)
- UU PDP (Perlindungan Data Pribadi)
- Privacy Policy & Cookie Consent
- Disclaimer & disclosure
- Right of reply policy
- Corrections policy
- Dewan Pers verifikasi media

## Checklist

### CRITICAL (risiko hukum serius)
1. **Published article dengan defamation risk** — sebut nama tersangka tanpa "terduga"
2. **Identitas korban anak/kekerasan seksual tidak disamarkan**
3. **No privacy policy** di footer — melanggar UU PDP
4. **User data di-collect tanpa consent** (analytics, cookies)
5. **No cookie consent banner** untuk EU-style audience
6. **Artikel berisi SARA** yang bisa kena UU ITE

### HIGH (editorial compliance)
7. **No verification label** di artikel investigasi (VERIFIED/UNVERIFIED)
8. **No source citation** di artikel kontroversial
9. **Praduga tak bersalah dilanggar** — sebut "pelaku" sebelum vonis
10. **No disclosure** di artikel dengan konflik kepentingan
11. **Right of reply missing** — pihak yang disebut tidak diberi kesempatan klarifikasi
12. **No corrections log** — koreksi artikel tidak transparent
13. **No T&C / Terms of Service** page

### MEDIUM
14. **No /pedoman-media page** — standard untuk media siber
15. **No /kode-etik page** — standard Dewan Pers
16. **Privacy policy outdated** — last updated > 1 tahun
17. **No author credential** — E-E-A-T lemah
18. **No editor contact info** — untuk hak jawab

### LOW
19. **No RSS feed privacy statement**
20. **Missing company registration info** di footer
21. **No accessibility statement**

## Metodologi

```bash
# 1. Cek pages yang WAJIB ada
curl -I https://jurnalishukumbandung.com/kode-etik
curl -I https://jurnalishukumbandung.com/pedoman-media
curl -I https://jurnalishukumbandung.com/tentang
curl -I https://jurnalishukumbandung.com/kontak
curl -I https://jurnalishukumbandung.com/privacy
curl -I https://jurnalishukumbandung.com/disclaimer
curl -I https://jurnalishukumbandung.com/terms

# 2. Cookie consent component
grep -rn "cookie-consent\|CookieBanner\|cookieConsent" src/

# 3. Privacy policy review
# Baca src/app/privacy/page.tsx — cek update date

# 4. Artikel non-compliance
# Query artikel dengan kata "pelaku" sebelum verdict
# Query artikel tanpa verificationLabel
```

## Output Format

```
### 📊 Legal Metrics
- Required pages present: [X/7]
- Articles with verification label: [N/total]
- Articles with sources cited: [N/total]
- Privacy policy last updated: [date]
- Cookie consent: [present/missing]

### Regulatory Compliance
| Requirement | Status | Issue |
|---|---|---|
| KEJ Dewan Pers | ✓ | - |
| UU No. 40/1999 | ✓ | - |
| UU PDP | ⚠️ | No cookie consent |
| UU ITE | ✓ | - |

### Articles at Risk
1. [id] — [title]: uses "pelaku" before verdict
2. [id] — [title]: no verification label
3. [...]
```

## Chain ke

- `/moderate` — handle flagged content
- `/fact-check` — verify questionable articles
- `/content` — update compliance pages
- `/audit-all` — return

## Aturan

- Media hukum HARUS lolos Dewan Pers — ini CORE BUSINESS
- Jangan asumsi compliance — verifikasi per artikel
- Privacy policy & cookies = compliance gateway ke EU market