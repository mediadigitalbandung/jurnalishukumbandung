---
type: topic-cluster
pilar: 
keyword_utama: 
keyword_sekunder: []
status: aktif
target_artikel: 5
created: <% tp.date.now("YYYY-MM-DD") %>
tags:
  - topic-cluster
---

# Pilar: <% tp.file.title %>

## 🎯 Pilar Topik

**Keyword utama**: 
**Keyword sekunder**:
- 
- 
- 

## 📝 Artikel Pilar (Pillar Page)

<!-- 1 artikel besar, 1500+ kata, evergreen, target keyword utama -->

- [[07-Drafts/...]] — Status: draft / published

## 🌿 Artikel Cluster (Supporting Articles)

Target: minimal 5 artikel pendukung yang link ke pilar.

### Sudah Ada

```dataview
LIST
FROM "07-Drafts"
WHERE contains(string(tags), this.keyword_utama)
SORT created DESC
```

### Gap (perlu ditulis)

- [ ] **Angle 1**: 
- [ ] **Angle 2**: 
- [ ] **Angle 3**: 
- [ ] **Angle 4**: 
- [ ] **Angle 5**: 

## 🔍 Riset Kompetitor

<!-- Apa yang Detik, Tribun, Kompas tulis tentang topik ini? Gap apa yang bisa kita isi? -->

- 
- 

## 🔗 Internal Linking Strategy

```
Pilar
  ↑↑↑
  ├─→ Cluster 1 → link back to pilar
  ├─→ Cluster 2 → link back to pilar
  ├─→ Cluster 3 → link back to pilar
  ├─→ Cluster 4 → link back to pilar
  └─→ Cluster 5 → link back to pilar

Cluster ↔ Cluster (saling link)
```

## 📊 Tracking

| Metrik | Awal | Saat Ini | Target |
|---|---|---|---|
| Pilar — Posisi GSC | - | - | top 10 |
| Pilar — Klik/30 hari | - | - | 100+ |
| Avg cluster — Posisi | - | - | top 20 |
| Total impressions | - | - | 5000+ |

## 📅 Timeline Publish

| Minggu | Artikel | Status |
|---|---|---|
| W1 | Pilar | |
| W2 | Cluster 1+2 | |
| W3 | Cluster 3+4 | |
| W4 | Cluster 5 + internal link audit | |

## 🔄 Re-promote Strategy

<!-- Kapan re-share di sosmed, update artikel pilar dengan info terbaru -->

- 
