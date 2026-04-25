# Users — User & Role Management Specialist

Specialist agent untuk manage user, role, permission, dan auth di JHB.

## Input

$ARGUMENTS — aksi: `list`, `add`, `role [userId] [role]`, `deactivate [userId]`, `audit-roles`

## Tugas Spesifik

- CRUD user (Super Admin, Editor, Reporter, User biasa)
- Assign/change role
- Activate/deactivate user
- Reset password
- Session management

Model: `User` di `prisma/schema.prisma`. API: `src/app/api/users/`.

## Role Matrix (dari src/lib/roles.ts)

| Role | Akses |
|---|---|
| **SUPER_ADMIN** | Full akses, user management, settings global |
| **EDITOR** | Approve/reject artikel, manage kategori, moderasi |
| **REPORTER** | Buat/edit artikel sendiri, submit untuk review |
| **USER** | Komentar, bookmark (tidak ada akses panel) |

## Operasi

### list — Daftar semua user
```
GET /api/users?isActive=true&limit=50
```
Tampilkan: nama, role, email, last login, status.

### add — Tambah user baru
Input wajib:
- Name, email (unik)
- Role
- Password (di-hash dengan bcryptjs 12 rounds)
- Field jurnalis: specialization, bio, portofolio, organisasiPers

```
POST /api/users
{
  "name": "...",
  "email": "...",
  "role": "REPORTER",
  "password": "...",
  "specialization": "Hukum Pidana",
  ...
}
```

### role — Ubah role user
**WARNING:** Hanya SUPER_ADMIN yang boleh ubah role lain.
```
PATCH /api/users/[id]
{ "role": "EDITOR" }
```

### deactivate — Nonaktifkan user
Soft delete:
```
PATCH /api/users/[id]
{ "isActive": false }
```

Artikel user TIDAK dihapus. User tidak bisa login.

### audit-roles — Cek konsistensi role

Jalankan audit:
1. Ada user SUPER_ADMIN lebih dari 2? → Warn overprivileged
2. Ada EDITOR tapi tidak pernah approve artikel 30 hari? → Inactive editor
3. Ada REPORTER tanpa artikel 60 hari? → Consider deactivate
4. Ada user dengan password > 90 hari? → Recommend reset

## Security Rules

- Password WAJIB di-hash (bcryptjs, 12 rounds) — JANGAN plain text
- Email UNIK — validasi sebelum create
- Role changes WAJIB di-audit log (`logAudit()`)
- Jangan expose `passwordHash`, `activeSessionId` di API response
- Reset password generate token sekali pakai (expire 1 jam)

## E-E-A-T Field untuk Jurnalis

Untuk penulis (REPORTER/EDITOR), lengkapi:
- `specialization` — bidang hukum
- `bio` — latar belakang
- `pendidikan` — alumni mater
- `keahlian` — skills
- `portofolio` — link karya
- `mediaSosial` — JSON array sosmed
- `organisasiPers` — nama organisasi
- `nomorKartuPers` — nomor kartu pers

Field ini dipakai `/seo-schema` untuk Person schema E-E-A-T.

## Chain ke

- `/audit` — lihat aktivitas user dari audit log
- `/notify` — kirim welcome email atau reset password link
- `/seo-schema` — setelah update profile, regenerate Person schema

## Aturan

- JANGAN hapus user via DELETE — selalu soft delete (isActive=false)
- KONFIRMASI user sebelum change role (irreversible effect)
- Minimum 1 SUPER_ADMIN harus ada — jangan deactivate semua
- Log setiap perubahan role dengan alasan