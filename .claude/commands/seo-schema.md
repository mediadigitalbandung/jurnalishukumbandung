# SEO-Schema — Structured Data & JSON-LD Specialist

Specialist agent untuk semua schema.org JSON-LD: NewsArticle, FAQPage, HowTo, Person, Organization, BreadcrumbList.
Dipanggil oleh `/seo` (orchestrator) atau langsung untuk fix schema spesifik.

## Input

$ARGUMENTS — halaman atau schema type. Contoh: "artikel", "penulis", "homepage", "FAQ"

## Tugas Spesifik

Specialist ini HANYA menangani:
- JSON-LD `<script type="application/ld+json">`
- Schema types: NewsArticle, FAQPage, HowTo, QAPage, Person, Organization, BreadcrumbList, AboutPage, ProfilePage
- E-E-A-T signals: sameAs, hasCredential, alumniOf, worksFor, memberOf

TIDAK menangani: metadata HTML (→ `/seo-meta`), sitemap (→ `/seo-index`).

## Schema Types per Halaman JHB

| Halaman | Schema Types |
|---|---|
| `/berita/[slug]` | NewsArticle + BreadcrumbList + (HowTo atau FAQPage jika relevan) |
| `/penulis/[slug]` | Person + BreadcrumbList |
| `/tentang` | AboutPage + NewsMediaOrganization + BreadcrumbList |
| `/kategori/[slug]` | CollectionPage + BreadcrumbList |
| `/` (homepage) | NewsMediaOrganization + WebSite + BreadcrumbList |
| `/redaksi` | ProfilePage + BreadcrumbList |

## Checklist Audit per Schema

**NewsArticle:**
```
[ ] @type = "NewsArticle"
[ ] headline: judul artikel (maks 110 char)
[ ] datePublished: ISO 8601 dengan timezone Jakarta (+07:00)
[ ] dateModified: ada dan valid
[ ] author: { @type: "Person", name, url } — bukan hanya string
[ ] publisher: { @id: ".../#organization" } — reference ke org
[ ] image: { @type: "ImageObject", url (absolut), width, height }
[ ] articleBody: teks bersih (strip HTML, > 200 char)
[ ] keywords: array of strings
[ ] mainEntityOfPage: { @type: "WebPage", @id: article URL }
[ ] inLanguage: "id"
```

**BreadcrumbList (WAJIB di semua halaman):**
```
[ ] @type = "BreadcrumbList"
[ ] itemListElement: array ListItem dengan position, name, item (URL)
[ ] Beranda selalu position 1
[ ] URL di setiap ListItem absolut
```

**Person (penulis/E-E-A-T):**
```
[ ] @id: profile URL + "#person"
[ ] jobTitle: spesialisasi atau "Jurnalis Hukum"
[ ] worksFor: { @id: appUrl + "/#organization" }
[ ] sameAs: array URL media sosial + portofolio
[ ] alumniOf: array EducationalOrganization (dari field pendidikan)
[ ] hasCredential: EducationalOccupationalCredential (nomor kartu pers)
[ ] memberOf: Organization (organisasi pers)
[ ] knowsAbout: array topik keahlian
```

## Helper di seo-utils.ts

Sebelum implementasi, baca `src/lib/seo-utils.ts` untuk helper yang sudah ada:
- `generateInternalLinksHtml()` — internal links
- `detectHowToSchema()` — auto-detect HowTo dari konten
- `detectQAPageSchema()` — auto-detect FAQ dari judul
- `buildEntitiesFromArticleMeta()` — entity builder

Gunakan helper yang ada — jangan duplicate logic.

## Output

Setelah selesai:
- List schema yang ditambah/diperbaiki
- Paste contoh JSON-LD untuk validasi Google Rich Results Test

→ Kembalikan ke `/seo` atau sarankan: **"Validasi di: https://search.google.com/test/rich-results"**