# Social-Template — Template Designer Agent

Agent khusus untuk mendesain dan mengelola template gambar media sosial JHB.

## Input

$ARGUMENTS — aksi: `list`, `create [platform]`, `edit [templateId]`, `preview [templateId] [articleId]`, `set-default [templateId]`

## Konteks Template JHB

- Model DB: `SocialTemplate` di `prisma/schema.prisma`
- Renderer: `src/lib/social/template-renderer.ts` (sharp-based)
- Storage: `/uploads/social/` (rendered images disimpan di VPS)
- Editor UI: `/panel/social` → tab Templates
- API: `src/app/api/social/templates/`

## Struktur Template

```typescript
SocialTemplate {
  id, name, platform,  // instagram | facebook
  aspectRatio,         // "1:1" | "4:5" | "16:9"
  templateImageUrl,    // URL gambar background/overlay (.png)
  photoSlot: {         // Area foto artikel
    x, y, width, height  // dalam pixel atau persentase
  },
  textLayers: [        // Array layer teks
    {
      id, label,
      type,            // "static" | "dynamic"
      content,         // Teks tetap atau placeholder
      x, y, width, height,
      fontSize, fontWeight, fontFamily, color,
      align,           // "left" | "center" | "right"
      maxLines, lineHeight, letterSpacing
    }
  ],
  isActive, isDefault,
  createdAt, updatedAt
}
```

## Placeholder Dinamis Tersedia

| Placeholder | Konten |
|---|---|
| `{{title}}` | Judul asli artikel |
| `{{paraphrased_title}}` | Judul diparafrase AI (max 2 baris) |
| `{{short_summary}}` | Ringkasan 1-2 kalimat (AI) |
| `{{category}}` | Nama kategori (UPPERCASE) |
| `{{date}}` | Tanggal terbit (format Indonesia) |
| `{{author}}` | Nama penulis |
| `{{site_name}}` | "Jurnalis Hukum Bandung" |

## Operasi

### list — Tampilkan semua template

```
GET /api/social/templates
```

Tampilkan tabel:
| Nama | Platform | Ratio | Default | Aktif | Preview |
|---|---|---|---|---|---|

### create — Buat template baru

Tanya user:
1. Platform: instagram atau facebook?
2. Aspect ratio: 1:1 (IG square), 4:5 (IG portrait), 16:9 (FB landscape)?
3. Ada file gambar background/overlay? (user upload dulu ke panel, lalu paste URL)
4. Gambar artikel di posisi mana? (x, y, w, h dalam % dari total)
5. Layer teks apa saja?

**Default layer presets yang disarankan:**
```
Layer 1 — KATEGORI
  Position: top-left, font: bold 18px, color: #00AA13 (brand green)
  Content: {{category}}

Layer 2 — JUDUL (AI)
  Position: center/bawah foto, font: bold 28px, color: #1C1C1E
  Content: {{paraphrased_title}}
  maxLines: 3

Layer 3 — RINGKASAN
  Position: bawah judul, font: regular 16px, color: #6B7280
  Content: {{short_summary}}
  maxLines: 2

Layer 4 — TANGGAL + LOGO
  Position: bottom-right, font: regular 14px, color: #9CA3AF
  Content: {{date}} | JHB
```

Setelah user konfirmasi → create via:
```
POST /api/social/templates
{ nama, platform, aspectRatio, templateImageUrl, photoSlot, textLayers }
```

### edit — Edit template yang ada

```
GET /api/social/templates/[templateId]
```

Tampilkan struktur saat ini. Tanya layer mana yang mau diubah.
Update via:
```
PUT /api/social/templates/[templateId]
{ perubahan yang diinginkan }
```

### preview — Preview template dengan artikel nyata

```
POST /api/social/templates/preview
{ "templateId": "[id]", "articleId": "[id]" }
```

Mengembalikan URL gambar rendered. Tampilkan ke user sebagai preview.

Jika user minta render ulang dengan artikel lain, ulangi dengan articleId berbeda.

### set-default — Jadikan template sebagai default

```
PATCH /api/social/templates/[templateId]
{ "isDefault": true }
```

Otomatis set template lain di platform yang sama jadi `isDefault: false`.

## Panduan Desain Template JHB

### Warna Brand
- Primary: `#00AA13` (GoTo Green) — untuk accent, kategori badge
- Dark: `#1C1C1E` — judul, teks utama
- Secondary: `#6B7280` — subtitle, ringkasan
- White: `#FFFFFF` — teks di atas foto gelap
- Background overlay: semi-transparan (#000000 / 60%) di atas foto

### Tipografi (Font yang tersedia di VPS)
- **Judul**: Inter Bold, Playfair Display Bold, Merriweather Bold
- **Body/Ringkasan**: Inter Regular, Source Sans Pro Regular
- **Label/Kategori**: Inter SemiBold, Montserrat SemiBold

### Layout Rekomendasi per Platform

**Instagram 1:1 (1080x1080):**
- Foto artikel: full background, overlay gelap 50-60%
- Teks di atas overlay
- Logo/brand di pojok

**Instagram 4:5 (1080x1350):**
- Foto artikel: 60% atas
- White area 40% bawah untuk teks

**Facebook 16:9 (1200x628):**
- Foto artikel: 50% kiri
- Teks area: 50% kanan dengan bg putih

## Chain ke

- `/social-ig` — setelah template siap, buat post Instagram
- `/social-fb` — setelah template siap, buat post Facebook
- `/deploy` — jika perlu perubahan kode renderer
