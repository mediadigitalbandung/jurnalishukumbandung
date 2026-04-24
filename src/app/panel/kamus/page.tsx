"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { BookOpen, Search, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";

interface DictionaryEntry {
  id: string;
  word: string;
  originalWord: string | null;
  category: string | null;
  notes: string | null;
  addedByName: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  legal: { label: "Hukum", color: "bg-blue-100 text-blue-700" },
  person: { label: "Orang", color: "bg-purple-100 text-purple-700" },
  place: { label: "Tempat", color: "bg-green-100 text-green-700" },
  other: { label: "Lainnya", color: "bg-surface-tertiary text-txt-secondary" },
};

export default function KamusPage() {
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();

  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newCategory, setNewCategory] = useState<"legal" | "person" | "place" | "other">("legal");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await fetch(`/api/dictionary?${params.toString()}`);
      const json = await res.json();
      if (json.success) setEntries(json.data.entries || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [search, categoryFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const handleAdd = async () => {
    if (newWord.trim().length < 2) {
      showError("Kata minimal 2 karakter");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: newWord.trim(),
          originalWord: newWord.trim(),
          category: newCategory,
          notes: newNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        success(json.data.created ? `"${newWord}" ditambahkan ke kamus` : `"${newWord}" sudah ada di kamus`);
        setNewWord("");
        setNewNotes("");
        setShowAdd(false);
        load();
      } else {
        showError(json.error || "Gagal menambah");
      }
    } catch {
      showError("Error");
    }
    setAdding(false);
  };

  const handleDelete = async (entry: DictionaryEntry) => {
    const ok = await confirm({
      message: `Hapus "${entry.originalWord || entry.word}" dari kamus?`,
      variant: "danger",
      title: "Konfirmasi",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/dictionary/${entry.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        success("Kata dihapus");
        load();
      } else {
        showError(json.error || "Gagal hapus");
      }
    } catch {
      showError("Error");
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-txt-primary">
        <BookOpen size={24} className="text-goto-green" />
        Kamus JHB
      </h1>
      <p className="mb-6 text-sm text-txt-secondary">
        Kata-kata yang dikecualikan dari AI typo check — istilah hukum, nama tokoh, nama daerah, dll.
        Semua tim JHB berbagi kamus ini.
      </p>

      {/* Search + Filter + Add button */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input
            type="text"
            placeholder="Cari kata..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input text-sm"
        >
          <option value="">Semua kategori</option>
          <option value="legal">Hukum</option>
          <option value="person">Orang</option>
          <option value="place">Tempat</option>
          <option value="other">Lainnya</option>
        </select>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-full bg-goto-green px-4 py-2 text-sm font-semibold text-white hover:bg-goto-dark"
        >
          <Plus size={16} /> Tambah Kata
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 rounded-[12px] border border-goto-green bg-goto-light/30 p-4">
          <h3 className="mb-3 text-sm font-bold text-goto-green">Tambah Kata Baru ke Kamus</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-txt-secondary">Kata / Istilah</label>
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="Mis: tipikor, KUHP, Tipiring"
                maxLength={80}
                className="input mt-1 w-full text-sm"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-txt-secondary">Kategori</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as "legal" | "person" | "place" | "other")}
                className="input mt-1 w-full text-sm"
              >
                <option value="legal">Hukum (UU, KUHP, pasal)</option>
                <option value="person">Nama Orang</option>
                <option value="place">Nama Tempat</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs font-medium text-txt-secondary">Catatan (opsional)</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Mis: Singkatan untuk Tindak Pidana Korupsi"
              maxLength={500}
              className="input mt-1 w-full text-sm"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || newWord.trim().length < 2}
              className="flex items-center gap-1.5 rounded-full bg-goto-green px-4 py-2 text-sm font-semibold text-white hover:bg-goto-dark disabled:opacity-50"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Simpan
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewWord(""); setNewNotes(""); }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Entries list */}
      <div className="rounded-[12px] border border-border bg-surface shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-goto-green" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-txt-muted">
            <AlertCircle size={32} />
            <p className="text-sm">{search || categoryFilter ? "Tidak ada hasil" : "Belum ada kata di kamus"}</p>
          </div>
        ) : (
          <>
            <div className="border-b border-border px-4 py-2 text-xs text-txt-secondary">
              {entries.length} kata · diurutkan dari terbaru
            </div>
            <div className="divide-y divide-border">
              {entries.map((e) => {
                const cat = CATEGORY_LABELS[e.category || "other"] || CATEGORY_LABELS.other;
                return (
                  <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-surface-secondary/50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-txt-primary">{e.originalWord || e.word}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cat.color}`}>
                          {cat.label}
                        </span>
                      </div>
                      {e.notes && <p className="mt-0.5 text-xs text-txt-secondary">{e.notes}</p>}
                      <p className="mt-1 text-[10px] text-txt-muted">
                        Ditambah oleh {e.addedByName || "—"} · {new Date(e.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(e)}
                      className="rounded p-1.5 text-red-500 hover:bg-red-50"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
