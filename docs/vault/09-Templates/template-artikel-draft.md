---
type: artikel-draft
status: draft
slug: <% tp.file.title.toLowerCase().replace(/\s+/g, "-") %>
title: 
seoTitle: 
seoDescription: 
excerpt: 
category: 
tags: []
narasumber: []
case: 
author: 
created: <% tp.date.now("YYYY-MM-DD") %>
target_keyword: 
word_count_target: 600
---

# <% tp.file.title %>

> Template artikel berita hukum JHB. Bahasa Indonesia baku, EYD, jurnalistik 5W+1H.

## Lead (1-2 paragraf)
<!-- Intisari kasus dalam 2-3 kalimat. WAJIB: kapan, siapa, apa. -->



## Kronologi
<!-- Urutan kejadian, dari awal sampai status terkini -->



## Dakwaan / Tuntutan / Status Hukum
<!-- Pasal apa yang dipakai, ancaman hukuman, posisi para pihak -->



## Keterangan Narasumber

> [!quote] [[02-Narasumber/Nama-Narasumber|Nama Narasumber]] — Jabatan
> "Kutipan langsung di sini..."



## Konteks / Implikasi
<!-- Mengapa kasus ini penting, dampak hukum/sosial -->



## Agenda Selanjutnya
<!-- Sidang berikutnya, langkah hukum yang ditempuh -->



---

## Metadata SEO

**Target keyword utama**: 
**Keyword sekunder**: 
**Internal link** (artikel JHB lain yang relevan):
- [[ ]]
- [[ ]]

**Sumber referensi**:
- 

**Image idea**:
- Featured image: 
- Caption: 

---

## Checklist Pre-Publish

- [ ] Lead jelas, 5W+1H lengkap
- [ ] Asas praduga tak bersalah dijaga
- [ ] Minimal 2 narasumber/sumber independen
- [ ] Kutipan langsung diberi atribusi
- [ ] Pasal disebut dengan UU + nomor pasal
- [ ] Word count ≥ 400
- [ ] SEO title 50-60 char, mengandung keyword utama
- [ ] SEO description 150-155 char
- [ ] Tags relevan ≥ 3
- [ ] Featured image siap
- [ ] Internal link minimal 2

## Cara Push ke JHB

```bash
node scripts/obsidian/import-draft.ts <% tp.file.title.toLowerCase().replace(/\s+/g, "-") %>
```

Akan POST ke `/api/articles` sebagai status `DRAFT`. Login `/panel/artikel` untuk review + publish.
