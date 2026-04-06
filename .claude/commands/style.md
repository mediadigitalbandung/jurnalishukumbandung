# Style — UI & Styling Specialist

Semua perubahan visual, UI, layout, dan CSS. Skill ini paham design system JHB.

## Input

$ARGUMENTS — deskripsi perubahan visual yang diminta.

## Design System Reference

Sebelum mulai, SELALU ingat design system proyek ini:

**Warna (GoTo-inspired Light Mode):**
- Brand: `bg-goto-green` (#00AA13) — tombol utama, link, aksen
- Brand hover: `hover:bg-goto-green-dark` (#008C10)
- Brand light: `bg-goto-green-light` (#E6F9E8) — badge background
- Surface: `bg-surface` (#FFFFFF), `bg-surface-secondary` (#F7F7F8), `bg-surface-tertiary` (#F0F1F3)
- Text: `text-txt` (#1C1C1E), `text-txt-secondary` (#6B7280), `text-txt-muted` (#9CA3AF)
- Border: `border-border` (#E5E7EB), `border-border-light` (#F3F4F6)

**Layout:**
- Container: `.container-main` (max-w-6xl, centered)
- Section headers: judul kiri + "Lihat Semua" kanan (green link)
- Horizontal scroll carousels untuk konten homepage
- Full-width hero banner

**Komponen:**
- Cards: `rounded-[12px] bg-surface border border-border shadow-card hover:shadow-card-hover`
- Buttons primary: `rounded-full bg-goto-green text-white hover:bg-goto-green-dark`
- Buttons secondary: `rounded-full border border-goto-green text-goto-green`
- Buttons ghost: `rounded-full text-txt-secondary hover:bg-surface-secondary`
- Badge: `rounded-full px-3 py-1 text-sm bg-goto-green-light text-goto-green`
- Input: `rounded-lg border border-border px-4 py-2 focus:ring-2 focus:ring-goto-green`

**Font:**
- Sans: "Source Sans 3" — body text, UI
- Serif: "Lora" — headline artikel (opsional)

**Panel Admin (PENTING):**
- Teks BESAR, spacing LEGA — untuk pengguna berumur
- Tombol dan link harus jelas dan mudah diklik
- Gunakan icon + label (jangan icon saja)

## Langkah-langkah

### 1. Pahami Perubahan

Baca request user. Identifikasi:
- Komponen/halaman mana yang berubah
- Perubahan warna, layout, spacing, font, atau animasi

### 2. Baca File Terkait

Baca file yang akan diubah + file referensi:
- `tailwind.config.ts` — design tokens
- `src/app/globals.css` — CSS utilities
- File komponen yang akan diubah

### 3. Implementasi

Terapkan perubahan visual. Aturan:
- Gunakan Tailwind classes (jangan custom CSS kecuali terpaksa)
- Gunakan design tokens dari config (jangan hardcode warna)
- Mobile-first responsive (`sm:`, `md:`, `lg:` breakpoints)
- Pastikan hover states dan transitions smooth
- LIGHT MODE ONLY — tidak ada dark mode

### 4. Cek Konsistensi

Pastikan perubahan konsisten dengan halaman/komponen lain:
- Spacing sama dengan komponen serupa
- Warna dari design system
- Font size konsisten

### 5. Selesai

Laporkan perubahan visual yang dilakukan. Sarankan: **"Jalankan `/review` lalu `/deploy`."**

## Aturan

- HANYA ubah styling/visual — jangan ubah logic/behavior
- Gunakan design tokens, jangan hardcode warna (#hex langsung di class)
- Jangan hapus existing CSS utility classes yang mungkin dipakai tempat lain
- Jika perlu animasi, gunakan yang sudah ada di tailwind config (fade-in, fade-up, scroll-x)
- Test responsive: pastikan bagus di mobile (360px), tablet (768px), dan desktop (1280px)
