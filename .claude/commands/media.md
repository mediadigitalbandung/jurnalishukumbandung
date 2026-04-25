# Media — Media Upload & Management Specialist

Specialist agent untuk upload, organize, compress, dan manage media files JHB.

## Input

$ARGUMENTS — aksi: `list`, `upload`, `orphan`, `compress [path]`, `rename [path]`

## Tugas Spesifik

- Upload file via API
- List & organize media
- Deteksi orphan files (tidak dipakai artikel)
- Compress images
- Rename untuk SEO

Model: `Media`. API: `src/app/api/upload/`, `src/app/api/media/`.

## Struktur Direktori

```
public/
└── uploads/
    ├── articles/           — featured images
    │   └── 2025/
    │       └── 04/
    ├── inline/             — gambar inline artikel
    ├── avatars/            — profile pictures
    ├── ads/                — banner iklan
    └── logos/              — logo partner
```

Convention: `YYYY/MM/[slug]-[random].webp`

## Operasi

### list — Daftar media
```
GET /api/media?type=image&limit=50&orderBy=createdAt
```
Info: URL, ukuran, dimensi, usage count, upload date.

### upload — Upload file baru

API: `POST /api/upload` (multipart/form-data)

Validasi:
```
[ ] Max size: 5MB untuk image, 50MB untuk video
[ ] Allowed types: jpg, jpeg, png, webp, gif (image); mp4, webm (video); pdf (document)
[ ] Auto-compress: WebP conversion untuk JPG/PNG
[ ] Auto-resize: max 1920x1080 untuk artikel
[ ] Filename sanitize: kebab-case, no spaces
```

Pakai `sharp` untuk image processing (sudah ada di package.json).

### orphan — Temukan media yang tidak dipakai

Proses:
1. Query semua media di `Media` table
2. Untuk setiap file, cek apakah URL-nya ada di:
   - `Article.featuredImage`
   - `Article.content` (regex `<img src="...">`)
   - `User.avatar`
   - `Ad.imageUrl`
3. File yang tidak ditemukan = orphan

**JANGAN hapus otomatis** — tampilkan daftar untuk konfirmasi user.

### compress [path] — Compress existing image

Gunakan sharp untuk re-compress:
- Target size: < 200KB untuk featured, < 100KB untuk inline
- Quality: 80 (sweet spot)
- Format: WebP
- Keep original as .backup

```typescript
import sharp from "sharp";
await sharp(inputPath)
  .webp({ quality: 80 })
  .resize({ width: 1920, withoutEnlargement: true })
  .toFile(outputPath);
```

### rename [path] — Rename untuk SEO

Jika filename lama non-SEO (`IMG_1234.jpg`):
1. Generate SEO filename dari konteks artikel
2. Rename file
3. Update semua referensi di DB (article.content dan featuredImage)
4. Update `Media.url`
5. Add redirect 301 dari old URL (untuk SEO preservation)

## Batch Operations

### Bulk compress
```bash
# Compress semua image > 300KB
find public/uploads -name "*.jpg" -size +300k -exec [...]
```

### Bulk rename
Untuk naming convention migration:
- Dry-run dulu, tampilkan before/after
- User konfirmasi
- Eksekusi + update DB + create redirects

## Storage Optimization

**Disk space check:**
```bash
ssh root@145.79.15.99 "du -sh /var/www/jhb/public/uploads/*"
```

**Cleanup strategy:**
1. Orphan files > 90 hari → offer delete
2. Old backups di /public/uploads → remove
3. Duplicate detection via file hash
4. Convert semua JPG/PNG lama ke WebP

## CDN Offload (Future)

Pertimbangkan pindah ke object storage:
- Cloudflare R2 (murah, S3-compatible)
- Backblaze B2
- AWS S3

Benefits:
- Disk VPS lega
- CDN edge delivery (lebih cepat)
- Scalability

## Security

**File upload security:**
```
[ ] MIME type validation (bukan hanya extension)
[ ] File signature check (magic bytes)
[ ] Rename uploaded file (jangan pakai user-provided name)
[ ] Scan untuk malicious payload (basic)
[ ] Rate limit upload per user
[ ] Store outside web root (atau pakai signed URLs)
```

## Chain ke

- `/seo-image` — optimasi alt text, filename SEO
- `/clean` — cleanup orphan media
- `/perf-bundle` — compress untuk performance
- `/backup` — backup media regular

## Aturan

- SELALU compress image sebelum save (auto via sharp)
- JANGAN hapus media yang masih dipakai (check usage dulu)
- Rename file = update semua referensi + create redirect
- Untuk rename bulk, dry-run dulu sebelum eksekusi
- Backup media regular (mingguan)