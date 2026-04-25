# 🛠️ Setup Vault Obsidian — JHB

Panduan instalasi dari nol sampai siap dipakai. Total waktu: ~10 menit.

## 1. Buka Vault di Obsidian

1. **Download Obsidian** (kalau belum): https://obsidian.md/download
2. Buka Obsidian → **Open folder as vault**
3. Browse ke: `<repo-jhb>/docs/vault/`
4. Klik **Open** → Obsidian load vault

> ⚠️ Pertama buka, Obsidian akan minta enable plugins. Klik "Trust author and enable plugins".

## 2. Install Community Plugins (PILIH SALAH SATU)

### 🚀 Cara Cepat (Otomatis, Direkomendasi) — 1 Menit

Jalankan script downloader, semua 9 plugin auto-install + pre-config:

```bash
cd "<repo-jhb>"
node scripts/obsidian/setup-plugins.js
```

Hasil: 9 plugin di-download dari GitHub releases ke `docs/vault/.obsidian/plugins/`, dan di-pre-config (Templater folder, Periodic Notes, Obsidian Git auto-pull). Buka Obsidian setelah ini → semua plugin otomatis aktif.

### 🐢 Cara Manual (Via UI Obsidian)

Obsidian → **Settings (Ctrl+,)** → **Community plugins** → **Turn on community plugins**.

Klik **Browse** dan install plugin berikut:

| # | Plugin | Author | Fungsi |
|---|---|---|---|
| 1 | **Dataview** | blacksmithgu | Query metadata (paling penting) |
| 2 | **Templater** | SilentVoid | Auto-fill template (replace built-in Templates) |
| 3 | **Calendar** | liamcain | Visual calendar di sidebar |
| 4 | **Periodic Notes** | liamcain | Daily/weekly notes auto-create |
| 5 | **Kanban** | mgmeyers | Editorial board |
| 6 | **Excalidraw** | zsviczian | Diagram drawing |
| 7 | **Obsidian Git** | denolehov | Auto-commit + sync |
| 8 | **Linter** | platers | Auto-format markdown |
| 9 | **Auto Link Title** | zolrath | Paste URL → fetch judul |

Setelah install semua, **enable** masing-masing plugin di list.

> ⚠️ Catatan: plugin binaries TIDAK di-commit ke Git (~14MB). Setiap kali clone repo baru atau pakai komputer lain, jalankan ulang `node scripts/obsidian/setup-plugins.js`.

## 3. Konfigurasi Plugin

### Dataview
Settings → Dataview:
- **Enable JavaScript Queries**: ON
- **Enable Inline JavaScript Queries**: ON

### Templater
Settings → Templater:
- **Template folder location**: `09-Templates`
- **Trigger Templater on new file creation**: ON
- **Folder Templates** (advanced):
  - `01-Kasus/` → `09-Templates/template-kasus`
  - `02-Narasumber/` → `09-Templates/template-narasumber`
  - `03-Hukum/Pasal/` → `09-Templates/template-pasal`
  - `06-Sidang/` → `09-Templates/template-sidang-note`
  - `07-Drafts/` → `09-Templates/template-artikel-draft`
  - `04-Topik-Riset/` → `09-Templates/template-topic-cluster`

### Periodic Notes
Settings → Periodic Notes:
- **Daily Notes**:
  - Format: `YYYY-MM-DD`
  - Folder: `05-Editorial/Daily-Log`
  - Template: `09-Templates/template-daily-log`
- **Weekly Notes** (opsional):
  - Format: `gggg-[W]ww` (e.g., 2026-W17)
  - Folder: `05-Editorial/Calendar`

### Calendar
Settings → Calendar:
- **Start week on**: Senin
- Auto-link ke Periodic Notes daily

### Obsidian Git
Settings → Obsidian Git:
- **Vault backup interval (in minutes)**: 30 (auto-commit setiap 30 menit)
- **Auto pull interval (in minutes)**: 60
- **Pull on startup**: ON
- **Push on backup**: ON

> ⚠️ Vault sudah di-Git-track sebagai bagian repo JHB. Plugin Obsidian Git akan auto-commit `docs/vault/` saja.

### Kanban
Tidak butuh config khusus. Edit board langsung dari file `.md` Kanban.

## 4. Setup Hotkeys (Opsional)

Settings → Hotkeys, set:
- `Ctrl+T` → "Templater: Open insert template modal"
- `Ctrl+Shift+T` → "Open today's daily note"
- `Ctrl+G` → "Open Graph view"
- `Ctrl+Shift+B` → "Open Backlinks pane"

## 5. Test Setup

1. Tekan **Ctrl+P** → ketik "Daily" → pilih "Open today's daily note"
2. File baru dibuat di `05-Editorial/Daily-Log/2026-MM-DD.md` dengan template auto-applied ✅
3. Tekan **Ctrl+G** → Graph view muncul (kosong dulu, akan ramai setelah ada konten)
4. Tekan **Ctrl+P** → "Templater: Insert template" → pilih `template-kasus` → konten template muncul ✅

## 6. Sync ke Multi-Device (Opsional)

Karena vault sudah di-Git, sync otomatis via push/pull repo JHB.

**Mobile (Obsidian iOS/Android):**
1. Install Obsidian Mobile
2. Setup vault path → kalau pakai iCloud/Google Drive, simpan repo di sana
3. Edit di mobile → commit pakai plugin Obsidian Git → sync

**Alternative (lebih cepat di mobile):**
- Pakai vault terpisah di iCloud/Dropbox khusus mobile
- Sync periodic dengan rsync ke folder repo

## 7. Pakai Integration Scripts

Lihat `scripts/obsidian/README.md` untuk detail. Quick example:

```bash
# Pull jadwal sidang dari DB ke vault
ssh root@145.79.15.99
cd /var/www/jhb
node scripts/obsidian/export-sidang.ts

# File baru muncul di docs/vault/06-Sidang/
# Pull (commit) dari mobile/desktop, lihat di Obsidian
```

## ⚠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| Plugin tidak muncul setelah install | Restart Obsidian, periksa "Restricted mode" off |
| Templater error "no template folder" | Buat folder `09-Templates/` dulu, set di Templater settings |
| Daily note tidak auto-create | Periodic Notes plugin not enabled, atau folder path salah |
| Graph view kosong | Belum ada wikilink antar file. Buat 1-2 wikilink dulu |
| Obsidian Git error "remote not configured" | Run `git remote -v` di repo. Plugin pakai remote default repo |
| Mobile sync lambat | Pakai vault separate di iCloud, rsync ke desktop berkala |
