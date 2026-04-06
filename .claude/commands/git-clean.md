# Git Clean — Git Housekeeping

Bersihkan git state, resolve conflict, atau kelola working tree.

## Input

$ARGUMENTS — apa yang perlu dilakukan (status, resolve conflict, stash, reset, dll).

Jika tidak ada argumen, tampilkan status lengkap.

## Langkah-langkah

### 1. Status Overview

Selalu mulai dengan status:
```bash
git status
git log --oneline -10
git branch -a
```

Laporkan ke user:
- Branch saat ini
- File yang modified/untracked/staged
- Commit terakhir
- Ada conflict atau tidak

### 2. Eksekusi Aksi

Berdasarkan request user:

**Lihat perubahan:**
```bash
git diff                    # unstaged changes
git diff --cached           # staged changes
git diff HEAD~3..HEAD       # last 3 commits
```

**Stash (simpan sementara):**
```bash
git stash                   # simpan perubahan
git stash list              # lihat stash list
git stash pop               # kembalikan perubahan terakhir
```

**Resolve conflict:**
- Baca file yang conflict
- Pahami kedua versi (ours vs theirs)
- Tanya user mau pilih yang mana, atau merge manual
- Setelah resolve: `git add [file]` lalu lanjut merge/rebase

**Reset file tertentu:**
```bash
git checkout -- path/to/file    # reset 1 file ke HEAD
```

**Clean untracked files:**
```bash
git clean -fd --dry-run     # preview dulu
# Tanya user sebelum actual clean
git clean -fd               # hapus untracked files & dirs
```

### 3. Verifikasi

Setelah aksi, tampilkan status lagi:
```bash
git status
```

Pastikan state bersih atau sesuai yang diinginkan user.

## Aturan

- JANGAN `git reset --hard` tanpa konfirmasi user — bisa hilang kode!
- JANGAN `git push --force` tanpa konfirmasi user
- JANGAN hapus branch tanpa konfirmasi user
- Selalu `--dry-run` dulu sebelum operasi destructive (clean, reset)
- Jangan ubah git config
- Skill ini TIDAK deploy — hanya manage git state
- Jika user mau commit + push + deploy, sarankan `/deploy` instead
