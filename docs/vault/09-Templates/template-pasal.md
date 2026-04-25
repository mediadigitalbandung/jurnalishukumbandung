---
type: pasal
nomor: 
uu: 
tahun_uu: 
bidang: 
ancaman: 
unsur: []
created: <% tp.date.now("YYYY-MM-DD") %>
tags:
  - pasal
---

# <% tp.file.title %>

## Bunyi Pasal

> 

## Penjelasan Pasal

<!-- Penjelasan resmi dari Bagian Penjelasan UU -->



## Unsur-Unsur

1. **Unsur 1**: 
2. **Unsur 2**: 
3. **Unsur 3**: 

> Semua unsur HARUS terpenuhi untuk dakwaan terbukti.

## Ancaman Hukuman

- **Pidana penjara**: 
- **Pidana denda**: 
- **Subsidair**: 

## Yurisprudensi Penting

- [[03-Hukum/Yurisprudensi/Putusan-X]]

## Kasus JHB yang Memakai Pasal Ini

```dataview
LIST
FROM "01-Kasus"
WHERE contains(string(pasal), this.file.name)
SORT mulai_sidang DESC
```

## Tafsir & Diskusi

<!-- Tafsir akademisi, perbedaan tafsir antar putusan, kontroversi -->



## Sumber

- UU: 
- Penjelasan: 
- Buku/jurnal: 

## Tags Kontekstual

#pasal #pidana #perdata #tipikor #tata-negara #ham
