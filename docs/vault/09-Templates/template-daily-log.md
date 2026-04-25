---
type: daily-log
date: <% tp.date.now("YYYY-MM-DD") %>
day: <% tp.date.now("dddd") %>
tags:
  - daily-log
---

# Editorial Log — <% tp.date.now("dddd, DD MMMM YYYY") %>

## 📰 Artikel Hari Ini

### Published
- [ ] [[ ]] — 
- [ ] 

### Draft Selesai (siap review)
- [ ] [[07-Drafts/...]] — 

### Sedang Ditulis
- [ ] [[07-Drafts/...]] — 

## 🏛️ Sidang Hari Ini

```dataview
TABLE WITHOUT ID
  file.link AS "Catatan",
  pengadilan AS "Pengadilan",
  agenda AS "Agenda"
FROM "06-Sidang"
WHERE tanggal = this.date
```

## 📞 Narasumber Dihubungi

| Narasumber | Untuk | Status |
|---|---|---|
| [[02-Narasumber/...]] | | belum / on-going / done |

## 💡 Ide Artikel Besok

1. 
2. 
3. 

## 🔥 Trending / Breaking

<!-- Berita yang sedang viral di Twitter/Detik/Tribun yang relevan -->

- 
- 

## 📊 Stats Highlight

<!-- Cek di /panel/statistik -->

- Top artikel views hari ini: 
- Total views: 
- Komentar masuk: 

## 🐛 Issue / Hambatan

<!-- Issue teknis, narasumber sulit, akses sidang ditolak, dll -->

- 

## 📝 Catatan Lain

<!-- Refleksi, learnings, ide editorial -->



---

## Wrap-up

- Total publish hari ini: 
- Productive hours: 
- Mood: 😊 / 😐 / 😞

> [!quote] Quote of the day
> 

## Yesterday's Log

← [[<% tp.date.yesterday("YYYY-MM-DD") %>]]

## Tomorrow's Plan

→ [[<% tp.date.tomorrow("YYYY-MM-DD") %>]]
