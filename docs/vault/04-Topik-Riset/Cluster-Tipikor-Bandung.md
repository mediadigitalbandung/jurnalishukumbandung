---
type: topic-cluster
pilar: Tipikor Bandung
keyword_utama: tipikor bandung
keyword_sekunder:
  - korupsi bandung
  - tipikor jawa barat
  - kasus korupsi bandung
  - tipikor pemkot bandung
  - kejaksaan tipikor bandung
status: aktif
target_artikel: 6
created: 2026-04-26
tags:
  - topic-cluster
  - tipikor
  - seo
---

# 🎯 Pilar: Tipikor Bandung

> Topic cluster strategis untuk membangun **topic authority** JHB pada topik "tipikor bandung" dan keyword-keyword turunannya.

## 🔑 Keyword Strategi

### Primary
- **`tipikor bandung`** — keyword utama (target rank 1)

### Secondary (cluster keywords)
- `korupsi bandung`
- `tipikor jawa barat`
- `kasus korupsi bandung terbaru`
- `tipikor pemkot bandung`
- `kejaksaan tipikor bandung`
- `pengadilan tipikor bandung`
- `kpk bandung`

## 📰 Artikel Pilar (Pillar Page)

> 1 artikel besar 1500-2000 kata, evergreen, target keyword utama. Artikel ini jadi "pusat" — semua cluster link kesini.

- [[07-Drafts/tipikor-bandung-overview|Tipikor Bandung — Panduan Lengkap]] — _draft_

**Target metrics**:
- Word count: 1500-2000
- Internal link OUT: 5+ (ke cluster)
- Internal link IN: 5+ (dari cluster)
- H2: 6-8 sections
- Schema: NewsArticle + FAQPage + BreadcrumbList

## 🌿 Artikel Cluster (Supporting)

Tiap cluster:
- 600-1000 kata
- Fokus 1 sub-topik dari pilar
- WAJIB link balik ke pilar
- Cross-link minimal 2 sibling

### Sudah Ada / Sedang Ditulis

```dataview
LIST
FROM "07-Drafts"
WHERE contains(file.outlinks, [[tipikor-bandung-overview]]) OR contains(string(tags), "tipikor")
SORT file.cday DESC
```

### Cluster yang Direncanakan

| # | Slug | Angle | Target Keyword | Status |
|---|---|---|---|---|
| 1 | `profil-kejaksaan-tipikor-bandung` | Profil institusi | kejaksaan tipikor bandung | [[07-Drafts/profil-kejaksaan-tipikor-bandung\|Brief]] |
| 2 | `pasal-utama-tipikor-uu-31-1999` | Legal breakdown | UU tipikor pasal | [[07-Drafts/pasal-utama-tipikor-uu-31-1999\|Brief]] |
| 3 | `tahapan-penanganan-kasus-tipikor` | Procedural guide | tahapan kasus korupsi | [[07-Drafts/tahapan-penanganan-kasus-tipikor\|Brief]] |
| 4 | `5-kasus-tipikor-besar-bandung-2026` | Listicle (high CTR) | kasus korupsi bandung | [[07-Drafts/5-kasus-tipikor-besar-bandung-2026\|Brief]] |
| 5 | `peran-kpk-tipikor-bandung` | Lembaga + Bandung | kpk bandung | [[07-Drafts/peran-kpk-tipikor-bandung\|Brief]] |

## 🔍 Riset Kompetitor

Lakukan search di Google incognito:

| Query | Top 3 Hasil | Word Count Rata² | Gap yang Bisa Diisi |
|---|---|---|---|
| `tipikor bandung` | _(isi setelah riset)_ | | |
| `kasus korupsi bandung` | | | |
| `kejaksaan tipikor bandung` | | | |

### Catatan Kompetitor
- Detik Jabar — biasanya breaking, tapi konteks dangkal
- Kompas Bandung — analisis bagus, tapi update jarang
- Tribun Jabar — heavy news, kurang explainer
- **Gap JHB**: explainer + konteks hukum dalam, evergreen content

## 🔗 Internal Linking Map

```
                    ┌────────────────────────┐
                    │  PILAR: Tipikor Overview│
                    └───────────┬────────────┘
                                │
           ┌────────┬───────────┼───────────┬────────┐
           ↓        ↓           ↓           ↓        ↓
       Profil    Pasal      Tahapan       Kasus     KPK
       Kejaksaan UU 31      Penanganan    Besar     Role
           │        │           │           │        │
           └────────┴───────────┴───────────┴────────┘
                       (saling cross-link)
```

**Aturan link**:
- Tiap cluster: 1 link ke pilar + 2 link ke sibling
- Pilar: link ke semua 5 cluster
- External: hanya untuk sumber resmi (UU, putusan online MA)

## 📊 Tracking Performa

### Baseline (sebelum publish cluster)
- Posisi `tipikor bandung`: _(cek GSC-Insight)_
- Posisi `kasus korupsi bandung`: _(cek GSC-Insight)_
- Total impressions topik: _(estimate dari GSC)_

### Target 30 Hari
- Pilar `tipikor bandung` → top 10
- 3 cluster → top 20
- Total impressions topik → +200%

### Target 90 Hari
- Pilar → **top 3**
- 5 cluster → top 10
- Featured snippet untuk 1 keyword

## 📅 Timeline Publish

| Minggu | Aksi | Status |
|---|---|---|
| **W1** | Publish pilar + cluster 1 (Profil Kejaksaan) | ⏳ |
| **W2** | Publish cluster 2 (Pasal UU 31) + cluster 3 (Tahapan) | ⏳ |
| **W3** | Publish cluster 4 (5 Kasus Besar) + cluster 5 (KPK) | ⏳ |
| **W4** | Audit internal link, submit re-index, monitor GSC | ⏳ |

## 🔄 Re-promote Strategy

- **Sosmed**: post pilar di IG + FB (carousel format)
- **Update bertahap**: tiap 30 hari, refresh pilar dengan info terkini
- **Backlink building**: outreach ke akademisi hukum untuk citation

## 🔗 Files Terkait

- [[GSC-Insight|GSC Insight (cek posisi keyword)]]
- [[Keywords|Target Keywords]]
- [[Dashboard-Editorial|Dashboard Editorial]]
- [[Rank-History|Rank History]]

---

> 💡 **Tip**: setelah publish artikel, run `/article-optimize` agent untuk audit + auto-fix metadata. Lalu `/social-ig draft` + `/social-fb draft` untuk push ke sosmed.
