# Court-Schedule — Jadwal Sidang Specialist

Specialist agent untuk manage jadwal sidang pengadilan di database JHB.

## Input

$ARGUMENTS — aksi: `list`, `add`, `today`, `week`, `overdue`, `link-article [id]`

## Tugas Spesifik

- Manage data jadwal sidang di `CourtSchedule` model
- Sync dengan website SIPP PN Bandung (jika API tersedia)
- Link jadwal sidang ke artikel liputan
- Reminder sidang yang akan datang

API yang tersedia: `src/app/api/court-schedule/`

## Operasi

### list — Tampilkan semua jadwal
```
GET /api/court-schedule?upcoming=true&limit=20
```
Tampilkan: tanggal, nomor perkara, pengadilan, nama para pihak, status.

### today — Sidang hari ini
```
GET /api/court-schedule?date=[today]
```
Prioritas liputan: sidang yang belum ada artikel-nya.

### week — Sidang minggu ini
```
GET /api/court-schedule?from=[today]&to=[today+7]
```

### add — Tambah jadwal baru
Format input:
```
{
  "caseNumber": "123/Pid.B/2025/PN.Bdg",
  "court": "PN Bandung",
  "scheduleDate": "2025-04-22T09:00:00+07:00",
  "agenda": "Pembacaan dakwaan",
  "parties": "Jaksa vs. [nama terdakwa]",
  "judge": "nama hakim ketua",
  "room": "Ruang 1",
  "notes": "..."
}
```

### overdue — Sidang yang sudah lewat tapi belum ada liputan
Cek jadwal yang:
- `scheduleDate < now()`
- Tidak punya `articleId` terkait
- Status belum diupdate

Rekomendasikan ke user: buat artikel atau update status.

### link-article — Kaitkan sidang dengan artikel
```
PATCH /api/court-schedule/[id]
{ "articleId": "[articleId]" }
```

## Integrasi dengan Content Pipeline

Ketika user buat artikel sidang:
```
/content sidang [case] → spawn /court-schedule link-article
```

Ketika user buat jadwal sidang:
```
/court-schedule add → suggest: "Siapkan draft artikel liputan? /content"
```

## Pengadilan di Bandung Raya

Daftar pengadilan untuk autocomplete:
- **PN Bandung** — Jl. R.E. Martadinata
- **PN Bale Bandung** — Soreang
- **PT Bandung** — banding dari PN
- **PA Bandung** — perkara agama
- **PTUN Bandung** — Tata Usaha Negara
- **Pengadilan Militer II-09 Bandung**
- **Pengadilan Niaga Bandung** (di PN Bandung)
- **Pengadilan Tipikor Bandung** (di PN Bandung)

## Tipe Agenda Sidang

Standar istilah:
- **Pembacaan dakwaan** (awal)
- **Eksepsi / keberatan**
- **Pemeriksaan saksi**
- **Pemeriksaan terdakwa**
- **Pembuktian**
- **Pembacaan tuntutan** (requisitoir)
- **Pledoi** (pembelaan)
- **Replik / Duplik**
- **Pembacaan putusan** (vonis)

## Chain ke

- `/content` — setelah liputan sidang
- `/notify` — reminder H-1 sidang penting
- `/analytics` — laporan coverage sidang per bulan

## Aturan

- Verifikasi nomor perkara ke SIPP/PN sebelum simpan
- Jangan publish jadwal sidang anak di bawah umur
- Untuk kasus sensitif (kekerasan seksual), agenda saja — jangan detail