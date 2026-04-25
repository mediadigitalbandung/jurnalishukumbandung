# SEO-Internal-Links — Internal Linking Specialist

Specialist agent untuk optimasi internal linking: topic clusters, contextual links, pillar pages.

## Input

$ARGUMENTS — artikel ID atau area: `audit`, `article [id]`, `topic-cluster [topic]`

## Tugas Spesifik

- Audit internal linking existing
- Add contextual links entity-based
- Build topic cluster (pillar + cluster articles)
- Anchor text optimization
- Detect orphan articles (no incoming links)

Helper yang tersedia di `src/lib/seo-utils.ts`:
- `generateInternalLinksHtml()`
- `injectContextualLinks()`
- `buildEntitiesFromArticleMeta()`

## Prinsip Internal Linking JHB

### 1. Topic Cluster Model
```
PILLAR (broad topic)
  ├── Cluster 1 (specific subtopic)
  ├── Cluster 2
  └── Cluster 3

Contoh:
Pillar: "Panduan Lengkap Hukum Pidana di Bandung"
  ├── Cluster: "Pasal 378 KUHP: Penipuan"
  ├── Cluster: "Kasus Korupsi PNS di Bandung"
  └── Cluster: "Hukuman Bagi Koruptor di Jawa Barat"

Pillar link ke semua cluster.
Cluster link balik ke pillar + siblings.
```

### 2. Contextual Links (Entity-Based)

Auto-link berdasarkan tags/kategori:
```typescript
const entities = buildEntitiesFromArticleMeta(tags, category);
const linkedContent = injectContextualLinks(content, entities, 6);
```

Rules:
- Max 6 contextual links per artikel
- Link anchor = nama entity (natural)
- Skip jika sudah ada `<a>` di konteks
- Link ke `/tag/[slug]` atau `/kategori/[slug]`

### 3. "Baca Juga" Blocks

Dua block per artikel panjang (> 600 kata):
```
Setelah paragraf 3:
[BACA JUGA block — 3 artikel terkait]

Mid-article (paragraf 6-7):
[ARTIKEL TERKAIT block — 3 artikel berbeda]
```

### 4. Anchor Text Variation

Jangan selalu pakai anchor yang sama untuk 1 target:
```
❌ Semua link ke /berita/korupsi-kadis-pupr pakai anchor "korupsi"
✅ Variasi:
- "kasus korupsi Kadis PUPR Bandung"
- "skandal proyek jalan Bandung"
- "dakwaan Jaksa terhadap eks-Kadis PUPR"
```

## Audit Workflow

### Full audit
1. Query semua artikel published
2. Untuk setiap artikel, hitung:
   - Outgoing internal links (berapa link ke artikel JHB lain)
   - Incoming internal links (berapa artikel lain link ke dia)
3. Identifikasi:
   - Orphan articles (0 incoming links)
   - Under-linked pillars (< 5 incoming links)
   - Over-linked (> 20 outgoing links — bisa dilusi)

### Output Audit
```
## Internal Linking Audit

### Overview
- Total artikel: X
- Orphan articles: X (0 incoming links)
- Well-linked (≥5 incoming): X
- Pillar candidates: X

### Orphan Articles (prioritas fix)
1. [judul] — URL: ...
   → Suggested incoming links from: [artikel A, B, C]

### Pillar Opportunities
- Topic "hukum pidana bandung" punya X artikel — belum ada pillar
  → Rekomendasikan buat pillar: /hukum-pidana-bandung

### Over-linked Articles
- [judul] punya X outgoing links — pertimbangkan kurangi
```

## Implementation per Artikel

### article [id] — Optimasi 1 artikel
1. Baca artikel + metadata (tags, category)
2. Cari artikel related berdasarkan tags/category
3. Inject contextual links via `injectContextualLinks()`
4. Add 2 "Baca Juga" blocks (awal + mid)
5. Update konten artikel

### topic-cluster [topic]
1. Identifikasi pillar article untuk topic
2. List semua cluster articles
3. Add bidirectional links:
   - Pillar → all clusters (di bagian "Artikel Terkait")
   - Each cluster → pillar (di intro/mid) + 2 sibling clusters

## Chain ke

- `/seo` — setelah optimasi internal links, submit re-index
- `/seo-index` — ping GSC untuk artikel yang diupdate
- `/content` — jika perlu buat pillar article baru

## Aturan

- Max 6 contextual links per artikel (jangan over-link)
- Anchor text natural — jangan exact match berlebihan
- Link hanya ke artikel YANG RELEVAN (bukan asal topik mirip)
- Prioritaskan link ke artikel high-authority (banyak views/backlinks)
- Hindari link ke halaman thin content