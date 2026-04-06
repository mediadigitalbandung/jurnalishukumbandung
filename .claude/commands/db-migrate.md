# DB Migrate — Database Schema Manager

Modifikasi Prisma schema dan jalankan migrasi database.

## Input

$ARGUMENTS — deskripsi perubahan database yang dibutuhkan (model baru, field baru, relasi, dll).

## Langkah-langkah

### 1. Baca Schema Saat Ini

WAJIB baca schema sebelum modifikasi:
```
prisma/schema.prisma
```

Pahami model yang sudah ada dan relasinya.

### 2. Rencanakan Perubahan

Identifikasi:
- Model baru atau modifikasi existing?
- Field baru apa saja? (nama, tipe, default, nullable)
- Relasi dengan model lain?
- Index yang diperlukan?
- Enum baru?

**Pertimbangkan:**
- Apakah field baru harus nullable? (agar existing data tidak break)
- Apakah ada default value yang masuk akal?
- Apakah perlu `@unique` constraint?
- Apakah perlu index untuk query performance?

### 3. Edit Schema

Edit `prisma/schema.prisma`. Ikuti convention yang sudah ada:

```prisma
model NamaModel {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // fields...
  namaField  String
  status     StatusEnum @default(ACTIVE)

  // relations
  userId String
  user   User   @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("nama_model")
}
```

**Convention proyek ini:**
- ID: `String @id @default(cuid())`
- Timestamps: `createdAt` + `updatedAt` pada semua model
- Enum naming: PascalCase (e.g., `ArticleStatus`, `UserRole`)
- Map: snake_case untuk nama tabel (`@@map`)
- Index: field yang sering di-query atau foreign keys

### 4. Jalankan Migrasi

```bash
npx prisma db push
```

Ini akan sync schema ke database tanpa migration files (sesuai convention proyek).

Jika error, baca error message dan fix schema.

### 5. Generate Client

```bash
npx prisma generate
```

Pastikan Prisma client ter-update dengan model baru.

### 6. Selesai

Laporkan:
- Model/field apa yang ditambah/diubah
- Relasi baru
- Index baru

Sarankan langkah selanjutnya:
- **"Schema ready. Jalankan `/api-new` untuk buat API route-nya."**
- Atau: **"Schema ready. Jalankan `/code` untuk implementasi."**

## Aturan

- SELALU baca schema dulu sebelum edit
- JANGAN hapus model/field tanpa konfirmasi user (bisa hilang data!)
- Field baru di model existing HARUS nullable atau punya default (agar existing data aman)
- Gunakan `npx prisma db push` (BUKAN `prisma migrate dev` — proyek ini pakai push)
- Jangan ubah model User tanpa sangat hati-hati (bisa break auth)
- BACKUP WARNING: jika diminta hapus field/model yang ada datanya, WARN user dulu
