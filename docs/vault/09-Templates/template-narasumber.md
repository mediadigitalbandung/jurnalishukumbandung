---
type: narasumber
nama: 
peran: 
institusi: 
jabatan: 
kepakaran: []
kontak_phone: 
kontak_email: 
kontak_lain: 
alamat_kantor: 
public_figure: false
trust_level: 
created: <% tp.date.now("YYYY-MM-DD") %>
tags:
  - narasumber
---

# <% tp.file.title %>

## Profil Singkat

<!-- 2-3 kalimat: siapa, latar belakang, kepakaran -->



## Kontak

- **Telepon**: 
- **Email**: 
- **WhatsApp**: 
- **Kantor**: 
- **Asisten / sekretaris**: 

> ⚠️ **Privasi**: kontak narasumber sensitif. Jangan share ke orang lain tanpa izin. Vault ini privat.

## Kepakaran

- 
- 
- 

## Riwayat Wawancara

| Tanggal | Topik | Untuk Artikel | Catatan |
|---|---|---|---|
| YYYY-MM-DD | | [[07-Drafts/...]] | |

## Kasus yang Pernah Ditangani

```dataview
LIST
FROM "01-Kasus"
WHERE contains(string(hakim), this.file.name) OR contains(string(jaksa), this.file.name) OR contains(string(penasihat_hukum), this.file.name)
SORT mulai_sidang DESC
```

## Catatan Karakter / Pendekatan

<!-- Bagaimana karakter narasumber ini, gaya bicara, hal yang harus dihindari, hal yang membuka -->



## Trust Level

- [ ] **A — Highly reliable**: konsisten, on-record, fakta selalu accurate
- [ ] **B — Reliable**: umumnya akurat, hati-hati di topik sensitif
- [ ] **C — Mixed**: kadang akurat, perlu cross-check
- [ ] **D — Caution**: punya bias kuat, perlu konfirmasi sumber lain
- [ ] **E — Hostile**: sumber buat balance only

## Tags Kontekstual

#narasumber #hakim #jaksa #advokat #ahli #aktivis #pejabat
