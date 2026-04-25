# Fix — Error Orchestrator

Diagnosa error dan delegasikan ke specialist agent yang tepat.

## Input

$ARGUMENTS — error message, deskripsi bug, atau "logs" untuk cek server.

## Routing Logic

**Langkah 1: Klasifikasi error**

| Tipe Error | Delegate ke |
|---|---|
| TypeScript error, build gagal, "Module not found" | `/fix-build` |
| Runtime 500, Prisma runtime, auth error, PM2 crash | `/fix-runtime` |
| Query lambat, N+1, timeout DB | `/db-query` |
| Error tidak jelas | Jalankan build dulu untuk klasifikasi |

**Langkah 2: Spawn specialist**

Jika error jelas → langsung spawn specialist yang tepat.

Jika tidak jelas, jalankan diagnosis awal:
```bash
npx next build 2>&1 | tail -30
```

Jika build gagal → delegate ke `/fix-build`.
Jika build sukses tapi runtime error → delegate ke `/fix-runtime`.

**Langkah 3: Verifikasi fix**

Setelah specialist selesai:
- Build error: konfirmasi `npx next build` sukses
- Runtime error: konfirmasi endpoint/halaman tidak error
- Jika masih gagal: ulangi diagnosis, kemungkinan root cause berbeda

**Langkah 4: Chain ke deploy**

Setelah fix berhasil:
→ Sarankan: **"`/deploy` untuk deploy fix ke production."**

## Multi-Error Handling

Jika ada beberapa error berbeda jenis:
1. Fix build errors dulu (blocking semua yang lain)
2. Kemudian fix runtime errors
3. Kemudian fix performance issues

## Spawn Pattern

```
/fix
 ├── build error? → /fix-build (sequential, blocking)
 │    └── setelah sukses → /deploy
 │
 ├── runtime error? → /fix-runtime (sequential)
 │    └── setelah sukses → /deploy
 │
 └── db slow? → /db-query (bisa paralel dengan code fixes)
      └── setelah sukses → /deploy
```

## Aturan

- SELALU cari root cause — jangan suppress error
- Fix MINIMAL — jangan refactor hal yang tidak berkaitan
- Jangan tambah `@ts-ignore` sebagai fix
- Jika butuh > 3 iterasi dan masih gagal, laporkan ke user — mungkin butuh `/plan`