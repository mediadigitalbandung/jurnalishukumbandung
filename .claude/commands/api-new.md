# API New — API Route Builder

Buat API route baru dengan pattern konsisten mengikuti convention proyek.

## Input

$ARGUMENTS — deskripsi endpoint yang dibutuhkan (resource, method, behavior).

## Langkah-langkah

### 1. Analisis Kebutuhan

Identifikasi:
- Resource apa (articles, comments, users, dll)
- Method apa (GET list, GET detail, POST create, PUT update, DELETE)
- Siapa yang boleh akses (public, authenticated, role tertentu)
- Data apa yang di-return/accept

### 2. Baca Pattern yang Ada

WAJIB baca minimal 1 API route yang mirip untuk ikuti pattern:
- `src/app/api/articles/route.ts` — contoh list + create
- `src/app/api/articles/[id]/route.ts` — contoh detail + update + delete
- `src/lib/api-utils.ts` — helper functions yang tersedia
- `src/lib/roles.ts` — role & permission definitions

### 3. Buat API Route

Buat file di `src/app/api/[resource]/route.ts` dengan struktur:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - List/Read
export async function GET(request: NextRequest) {
  try {
    // Auth check jika perlu
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query data
    const data = await prisma.model.findMany({
      // select specific fields
      // include relations yang dibutuhkan saja
      // orderBy, pagination
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[API_NAME] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate input
    // Create record
    // Create audit log jika perlu

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("[API_NAME] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 4. Checklist

Pastikan API route mengikuti convention:

- [ ] Auth guard sesuai role (public, authenticated, admin-only)
- [ ] Input validation (jangan trust client data)
- [ ] Prisma query efisien (select/include hanya yang dibutuhkan)
- [ ] Pagination untuk list endpoints (`skip`, `take`, `searchParams`)
- [ ] Error handling dengan try-catch
- [ ] Console error logging dengan prefix `[RESOURCE_NAME]`
- [ ] Audit log untuk operasi write (create/update/delete) jika resource penting
- [ ] Response format konsisten: `{ data }` atau `{ error: "message" }`
- [ ] HTTP status codes benar (200, 201, 400, 401, 403, 404, 500)

### 5. Selesai

Laporkan endpoint yang dibuat:
```
Created: GET  /api/resource     — List all
Created: POST /api/resource     — Create new
Created: GET  /api/resource/[id] — Get detail
...
```

Sarankan: **"API ready. Jalankan `/test` untuk test, atau `/code` untuk buat UI-nya."**

## Aturan

- Ikuti pattern API route yang SUDAH ADA — jangan invent convention baru
- Selalu gunakan `getServerSession(authOptions)` untuk auth (bukan custom)
- Jangan expose sensitive fields (password, activeSessionId) di response
- Gunakan `NextRequest` dan `NextResponse` (App Router, bukan Pages Router)
- Jika butuh model Prisma baru, sarankan `/db-migrate` dulu
