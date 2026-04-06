# Panel — Admin Panel Page Builder

Buat atau modifikasi halaman di admin panel (/panel/*). Paham convention panel JHB.

## Input

$ARGUMENTS — deskripsi halaman panel yang ingin dibuat/diubah.

## Langkah-langkah

### 1. Analisis

Identifikasi:
- Halaman baru atau edit existing?
- Data apa yang ditampilkan?
- Aksi apa yang bisa dilakukan user? (CRUD, filter, search, dll)
- Role mana yang boleh akses?

### 2. Baca Pattern Panel yang Ada

WAJIB baca minimal 1 halaman panel yang mirip:
- `src/app/panel/artikel/page.tsx` — contoh list page dengan tabel + search + filter
- `src/app/panel/artikel/baru/page.tsx` — contoh form page
- `src/app/panel/dashboard/page.tsx` — contoh dashboard
- `src/app/panel/layout.tsx` — layout panel (sidebar, nav, auth check)

### 3. Implementasi

Buat halaman panel dengan aturan:

**Wajib:**
```tsx
"use client";
// Semua halaman panel = client component

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
```

**Fetch Data:**
```tsx
// Fetch dari API route (BUKAN Prisma langsung)
const fetchData = async () => {
  const res = await fetch("/api/resource");
  const data = await res.json();
  setData(data);
};

useEffect(() => { fetchData(); }, []);
```

**UI Pattern — SENIOR FRIENDLY (KRITIS):**
- Teks BESAR: heading `text-2xl font-bold`, body `text-base` minimum
- Spacing LEGA: `space-y-6`, `gap-6`, `p-6`
- Tombol JELAS: besar, warna kontras, icon + label
- Tabel: row height lega, font readable
- Form: label jelas, input besar, validation message visible
- Loading state: skeleton atau spinner
- Empty state: pesan informatif dengan CTA
- Konfirmasi sebelum delete (modal/dialog)

**Tabel Pattern:**
```tsx
<div className="overflow-x-auto">
  <table className="w-full text-base">
    <thead>
      <tr className="border-b border-border bg-surface-secondary">
        <th className="text-left p-4 font-semibold text-txt-secondary">Kolom</th>
      </tr>
    </thead>
    <tbody>
      {data.map((item) => (
        <tr key={item.id} className="border-b border-border-light hover:bg-surface-secondary">
          <td className="p-4">{item.field}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Search & Filter:**
- Search input di atas tabel
- Filter dropdown untuk status/kategori
- Debounce search (300ms)

**Pagination:**
- Tampilkan total items
- Prev/Next buttons
- Items per page selector

**Toast/Feedback:**
- Sukses: green toast
- Error: red toast
- Konfirmasi delete: modal dialog

### 4. Tambah ke Sidebar (jika halaman baru)

Jika ini halaman panel BARU, baca `src/app/panel/layout.tsx` dan tambahkan menu item di sidebar navigation dengan icon dan role guard yang sesuai.

### 5. Selesai

Laporkan halaman yang dibuat/diubah. Sarankan: **"Jalankan `/review` lalu `/deploy`."**

## Aturan

- SELALU `"use client"` — panel pages = client components
- SELALU fetch via API routes — JANGAN import Prisma di panel pages
- UI harus senior-friendly — teks besar, spacing lega, tombol jelas
- Cek role permissions — jangan buat halaman yang semua role bisa akses kalau seharusnya admin-only
- Loading state WAJIB ada — jangan blank page saat fetch
- Error handling WAJIB — tampilkan pesan error yang user-friendly
