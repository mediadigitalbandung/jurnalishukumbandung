# Plan — Master Orchestrator & Arsitek Task

Entry point untuk semua task kompleks. Analisis, pecah jadi sub-tasks, tentukan agent chain.

## Input

$ARGUMENTS — deskripsi task dari user.

## Agent Ecosystem Map

```
MASTER ORCHESTRATORS
├── /plan       ← kamu ada di sini
├── /deploy     ← gate akhir semua task
├── /monitor    ← health check & diagnosis
└── /review     ← quality gate (spawn security + quality paralel)

DOMAIN ORCHESTRATORS
├── /fix        → /fix-build | /fix-runtime
├── /seo        → /seo-meta | /seo-schema | /seo-index (paralel)
├── /perf       → /db-query | /perf-bundle (paralel)
├── /social     → /social-ig | /social-fb | /social-caption (paralel)
└── /content    → /keyword → /seo-meta → /social

SPECIALISTS (tidak punya sub-agent)
├── DB Layer:    /db-migrate  /db-query
├── API Layer:   /api-new
├── Frontend:    /code  /panel  /style
├── SEO:         /seo-meta  /seo-schema  /seo-index
├── Quality:     /review-security  /review-quality
├── Fix:         /fix-build  /fix-runtime
├── Perf:        /perf-bundle
├── Infra:       /vps  /git-clean
├── Content:     /keyword  /clean
└── Social:      /social-ig  /social-fb  /social-caption  /social-template
```

## Chain Templates

### New Feature (kompleks)
```
/plan → /db-migrate (jika perlu schema baru)
      → /api-new (jika perlu endpoint baru)
      → PARALEL: /code + /panel (jika ada UI publik + admin)
      → /style (jika ada perubahan visual)
      → /seo (jika ada halaman publik baru — paralel: meta+schema+index)
      → /review (paralel: security + quality)
      → /test
      → /deploy
```

### Bug Fix
```
/fix → /fix-build ATAU /fix-runtime (berdasarkan error type)
     → /test
     → /deploy
```

### SEO Improvement
```
/seo → PARALEL: /seo-meta + /seo-schema + /seo-index
     → /review-quality
     → /deploy
     → /seo-index ping (submit ke GSC)
```

### Performance Optimization
```
/perf → PARALEL: /db-query + /perf-bundle
      → /test (build + bundle size check)
      → /review-quality
      → /deploy
```

### Content Creation
```
/content → /keyword (cek coverage gap)
         → tulis artikel
         → /seo-meta (generate metadata)
         → /social (draft post untuk semua platform)
```

### UI/Styling Change
```
/style → /review-quality (design system compliance)
       → /deploy
```

## Langkah-langkah Plan

### 1. Pahami Task

Baca $ARGUMENTS. Identifikasi:
- **Type**: fitur baru / bug fix / optimasi / konten / infra
- **Scope**: berapa file terdampak? (kecil: 1-3, sedang: 4-10, besar: 10+)
- **Urgency**: blocking production? atau improvement?

Jika kurang jelas → TANYA user sebelum lanjut.

### 2. Scan Codebase

Baca file-file yang relevan berdasarkan task. Jangan asumsikan isi file — baca dulu:
```
prisma/schema.prisma        — untuk task yang involve data
src/app/layout.tsx          — untuk global changes
src/lib/api-utils.ts        — untuk API patterns
src/lib/seo-utils.ts        — untuk SEO tasks
src/app/api/[area]/         — untuk API changes
src/app/panel/[page]/       — untuk panel changes
```

### 3. Pilih Chain Template

Pilih chain template dari daftar di atas, atau buat custom chain.

Tentukan agent mana yang:
- Bisa dijalankan **PARALEL** (tidak saling bergantung)
- Harus **SEQUENTIAL** (A harus selesai sebelum B)

### 4. Output Plan

```
## Plan: [Judul Task]

### Ringkasan
[1-2 kalimat]

### Agent Chain
[chain diagram dengan PARALEL/SEQUENTIAL notation]

### File Terdampak
| # | File | Aksi | Agent |
|---|------|------|-------|
| 1 | ... | CREATE/EDIT | /code |

### Risiko
- [hal yang perlu diwaspadai]

### Estimasi
- Scope: kecil/sedang/besar
- Agent hops: X
```

### 5. Konfirmasi

Setelah plan selesai:
> **Plan siap. Eksekusi sekarang atau ada yang perlu diubah?**

Jika user approve → jalankan agent pertama di chain.

## Aturan

- JANGAN langsung coding di skill ini — hanya planning
- SELALU baca file sebelum include di plan
- Untuk task kecil (1-2 file): plan boleh singkat, langsung ke `/code`
- Untuk task besar: pecah jadi fase yang bisa di-deploy incremental
- Pertimbangkan apakah bisa parallel — hemat waktu