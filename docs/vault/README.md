# 📚 JHB Editorial Vault

Knowledge base editorial Jurnalis Hukum Bandung di Obsidian. Komplemen DB Prisma — untuk yang naratif, riset, draft, dan koneksi antar entitas yang ga muat di tabel relasional.

> **Cara buka**: Obsidian → Open folder as vault → pilih folder `docs/vault/`
> **Setup awal**: lihat [SETUP.md](SETUP.md)

---

## 🗂️ Struktur Folder

| Folder | Isi | Kapan Dipakai |
|---|---|---|
| **00-Inbox/** | Catatan cepat, fleeting notes | Catatan lapangan langsung, brainstorm |
| **01-Kasus/** | 1 file = 1 kasus hukum | Per kasus yang diliput (kronologi, pihak, status) |
| **02-Narasumber/** | Profil narasumber (hakim, jaksa, advokat, ahli) | Database kontak + kepakaran |
| **03-Hukum/Pasal/** | Pasal-pasal yang sering dipakai | Referensi cepat (KUHP, UU ITE, dll) |
| **03-Hukum/Yurisprudensi/** | Putusan penting | Untuk riset analisis hukum |
| **04-Topik-Riset/** | Riset topik, keyword, gap analysis | SEO planning + ide artikel |
| **05-Editorial/Daily-Log/** | Daily editorial journal `YYYY-MM-DD.md` | Auto-create harian via Periodic Notes |
| **05-Editorial/Calendar/** | Editorial calendar | Jadwal publish, planning mingguan |
| **06-Sidang/** | Catatan sidang lapangan | Per sidang yang dipantau |
| **07-Drafts/** | Draft artikel sebelum publish | Tulis di sini → push ke `/panel/artikel` |
| **08-Sosmed-Plan/** | Plan konten IG/FB/TikTok | Mingguan — hashtag, ide caption |
| **09-Templates/** | Template Templater | Auto-fill saat new file |
| **99-Archive/** | Arsip case selesai | Pindahkan dari 01-Kasus saat case closed |

---

## 🔄 Workflow Editorial

### A. Liputan Kasus Baru
1. **Catat di lapangan** → buka 00-Inbox di mobile, ketik cepat
2. **Migrasi ke kasus** → pindahkan ke `01-Kasus/[Nama-Kasus].md` (pakai template)
3. **Link narasumber** → wikilink `[[02-Narasumber/Nama-Hakim]]`
4. **Link pasal** → wikilink `[[03-Hukum/Pasal/UU-ITE-Pasal-27]]`
5. **Buat catatan sidang** → `06-Sidang/YYYY-MM-DD-Nama-Kasus.md`

### B. Tulis Artikel
1. New file di `07-Drafts/[slug-artikel].md` (pakai template artikel)
2. Frontmatter `case: [[01-Kasus/Nama-Kasus]]` + `narasumber: [[...]]`
3. Tulis lead + body (5W+1H, jurnalistik)
4. Selesai → run `node scripts/obsidian/import-draft.ts` (push ke /api/articles sebagai DRAFT)
5. Login `/panel/artikel` → review → publish

### C. Daily Log
1. Buka via shortcut Obsidian (Cmd/Ctrl+P → "Open today's daily note")
2. Auto-create file `05-Editorial/Daily-Log/2026-04-24.md` dari template
3. Isi: artikel published, sidang dipantau, narasumber dihubungi, ide besok

### D. Topic Cluster
1. New file di `04-Topik-Riset/[Nama-Pilar].md`
2. Pakai template topic-cluster
3. Dataview query auto-fetch artikel yang sudah ada untuk pilar itu
4. Identify gap → assign ke jurnalis

### E. SEO Keyword Research
1. File `04-Topik-Riset/Keywords.md` mirror dengan TargetKeyword DB
2. Run `node scripts/obsidian/sync-keywords.ts` untuk pull/push 2 arah
3. Tambah keyword baru → tag `#aktif` → sync push ke DB

---

## 🔗 Backlink Graph — Cara Kerja

Setiap entitas (kasus, narasumber, pasal) link ke yang lain via wikilink `[[...]]`. Obsidian otomatis bangun graph:

```
[[Gibran-eFishery]]
├── narasumber: [[Hakim-Hari-Megawati]]
├── pasal: [[UU-TPPU-Pasal-3]] [[KUHP-Pasal-378]]
├── jurnalis: [[Penulis-A]]
├── artikel: [[07-Drafts/dituntut-10-tahun-gibran]]
└── sidang: [[06-Sidang/2026-04-21-Gibran-Pembelaan]]
```

Buka **Graph view** (Ctrl+G) — nampak siapa terlibat di mana.

---

## 🧩 Plugin yang Wajib

Lihat [SETUP.md](SETUP.md) untuk install detail. Singkat:

| Plugin | Fungsi |
|---|---|
| **Dataview** | SQL-like query metadata |
| **Templater** | Auto-fill template |
| **Calendar + Periodic Notes** | Daily/weekly auto-create |
| **Kanban** | Editorial board (Ide → Draft → Review → Published) |
| **Excalidraw** | Diagram alur kasus |
| **Obsidian Git** | Auto-commit + sync |
| **Linter** | Format konsisten |
| **Auto-Link Title** | Paste URL → auto-fetch judul |

---

## 🤖 Integration dengan JHB Database

Script di `scripts/obsidian/` jembatani vault ↔ Prisma DB:

| Script | Arah | Fungsi |
|---|---|---|
| `export-sidang.ts` | DB → Vault | Pull CourtSchedule → buat markdown di 06-Sidang/ |
| `import-draft.ts` | Vault → DB | Read 07-Drafts/*.md → POST /api/articles |
| `sync-keywords.ts` | Bidirectional | Sync TargetKeyword ↔ Keywords.md |
| `export-daily-digest.ts` | DB → Vault | Auto-generate 05-Editorial/Daily-Log/ harian |

Cara pakai:
```bash
cd /var/www/jhb
node scripts/obsidian/export-sidang.ts        # Sekali atau via cron
node scripts/obsidian/import-draft.ts <slug>  # Push 1 draft
node scripts/obsidian/sync-keywords.ts pull   # DB → vault
node scripts/obsidian/sync-keywords.ts push   # Vault → DB
```

Lihat [scripts/obsidian/README.md](../../scripts/obsidian/README.md) untuk detail.

---

## 📌 Konvensi

- **File naming**: kebab-case (e.g., `gibran-efishery.md`, bukan `Gibran eFishery.md`)
- **Frontmatter** wajib di tiap kasus/narasumber/pasal — supaya Dataview bisa query
- **Tag** pakai `#kebab-case` di body (e.g., `#kasus-aktif`, `#narasumber-jaksa`, `#pasal-pidana`)
- **Date** format ISO `YYYY-MM-DD` di frontmatter
- **Wikilink** ke folder explicit: `[[01-Kasus/Gibran-eFishery]]` (bukan cuma `[[Gibran-eFishery]]`) — supaya kelihatan dari folder mana
