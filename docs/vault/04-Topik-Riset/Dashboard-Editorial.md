---
type: dashboard
tags:
  - dashboard
---

# 📊 Dashboard Editorial JHB

> Dashboard pakai Dataview. Aktifkan plugin Dataview supaya tabel-tabel ini muncul.

---

## 🔥 Kasus Aktif

```dataview
TABLE WITHOUT ID
  file.link AS "Kasus",
  pengadilan AS "Pengadilan",
  sidang_berikutnya AS "Sidang Berikutnya",
  status AS "Status"
FROM "01-Kasus"
WHERE status = "aktif"
SORT sidang_berikutnya ASC
```

## 📅 Sidang Mendatang (7 hari)

```dataview
TABLE WITHOUT ID
  file.link AS "Sidang",
  kasus AS "Kasus",
  tanggal AS "Tanggal",
  agenda AS "Agenda",
  pengadilan AS "Pengadilan"
FROM "06-Sidang"
WHERE date(tanggal) >= date(today) AND date(tanggal) <= date(today) + dur(7 days)
SORT tanggal ASC
```

## ✍️ Draft Artikel — Belum Selesai

```dataview
TABLE WITHOUT ID
  file.link AS "Draft",
  category AS "Kategori",
  word_count_target AS "Target Kata",
  created AS "Dibuat"
FROM "07-Drafts"
WHERE status = "draft"
SORT created DESC
LIMIT 20
```

## 🎯 Topic Cluster Aktif

```dataview
TABLE WITHOUT ID
  file.link AS "Pilar",
  keyword_utama AS "Keyword Utama",
  target_artikel AS "Target Artikel",
  status AS "Status"
FROM "04-Topik-Riset"
WHERE type = "topic-cluster" AND status = "aktif"
```

## 👥 Narasumber by Kepakaran

```dataview
TABLE WITHOUT ID
  file.link AS "Narasumber",
  peran AS "Peran",
  institusi AS "Institusi",
  trust_level AS "Trust"
FROM "02-Narasumber"
SORT peran ASC, file.name ASC
```

## ⚖️ Pasal Sering Dipakai

```dataview
TABLE WITHOUT ID
  file.link AS "Pasal",
  uu AS "UU",
  bidang AS "Bidang",
  ancaman AS "Ancaman"
FROM "03-Hukum/Pasal"
SORT uu ASC
```

## 📰 Artikel Published — Bulan Ini

```dataview
LIST
FROM "07-Drafts"
WHERE status = "published" AND date(created).month = date(today).month
SORT created DESC
```

## 💡 Inbox — Catatan Belum Diproses

```dataview
LIST
FROM "00-Inbox"
WHERE !contains(file.name, "Excalidraw")
SORT file.cday DESC
LIMIT 10
```

## 🗓️ Daily Log Terbaru

```dataview
LIST
FROM "05-Editorial/Daily-Log"
SORT file.cday DESC
LIMIT 7
```

---

## 📈 Statistik Vault

```dataview
TABLE WITHOUT ID
  length(rows) AS "Total"
FROM ""
GROUP BY type
SORT length(rows) DESC
```

## 🏷️ Tag Cloud

```dataview
LIST length(rows) AS "count"
FROM ""
FLATTEN file.tags AS tag
GROUP BY tag
SORT length(rows) DESC
LIMIT 20
```
