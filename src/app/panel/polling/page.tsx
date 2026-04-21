"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Vote,
  BarChart3,
  Power,
} from "lucide-react";

interface PollOption {
  id: string;
  label: string;
  votes: number;
  percentage: number;
}

interface Poll {
  id: string;
  question: string;
  image: string | null;
  isActive: boolean;
  order: number;
  totalVotes: number;
  options: PollOption[];
  category: { name: string; slug: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function PollingPanelPage() {
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formQuestion, setFormQuestion] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOrder, setFormOrder] = useState(0);
  const [formOptions, setFormOptions] = useState(["", ""]);
  const [page, setPage] = useState(1);
  const POLLS_PER_PAGE = 6; // 2-3 cols x 2 rows = ~6 per page

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resPolls, resCats] = await Promise.all([
        fetch("/api/polls"),
        fetch("/api/categories"),
      ]);
      if (resPolls.ok) {
        const json = await resPolls.json();
        setPolls(json.data || []);
      }
      if (resCats.ok) {
        const json = await resCats.json();
        setCategories(json.data || []);
      }
    } catch {
      showError("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function resetForm() {
    setFormQuestion("");
    setFormImage("");
    setFormCategoryId("");
    setFormIsActive(true);
    setFormOrder(0);
    setFormOptions(["", ""]);
    setEditingId(null);
    setShowForm(false);
  }

  function openAdd() {
    resetForm();
    setFormOrder(polls.length);
    setShowForm(true);
  }

  function openEdit(poll: Poll) {
    setEditingId(poll.id);
    setFormQuestion(poll.question);
    setFormImage(poll.image || "");
    setFormCategoryId(poll.category ? categories.find(c => c.slug === poll.category!.slug)?.id || "" : "");
    setFormIsActive(poll.isActive);
    setFormOrder(poll.order);
    setFormOptions(poll.options.map(o => o.label));
    setShowForm(true);
  }

  function addOption() {
    if (formOptions.length >= 10) return;
    setFormOptions([...formOptions, ""]);
  }

  function removeOption(idx: number) {
    if (formOptions.length <= 2) return;
    setFormOptions(formOptions.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, value: string) {
    setFormOptions(formOptions.map((o, i) => i === idx ? value : o));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validOptions = formOptions.filter(o => o.trim());
    if (!formQuestion || validOptions.length < 2) {
      showError("Pertanyaan dan minimal 2 opsi wajib diisi");
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        // Update poll (question, image, category, active, order only — options can't be changed after votes)
        const res = await fetch(`/api/polls/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: formQuestion,
            image: formImage || null,
            categoryId: formCategoryId || null,
            isActive: formIsActive,
            order: formOrder,
          }),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Gagal menyimpan"); }
        success("Polling berhasil diperbarui");
      } else {
        // Create new poll
        const res = await fetch("/api/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: formQuestion,
            image: formImage || null,
            categoryId: formCategoryId || null,
            isActive: formIsActive,
            order: formOrder,
            options: validOptions,
          }),
        });
        if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Gagal membuat polling"); }
        success("Polling berhasil dibuat");
      }

      resetForm();
      fetchData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, question: string) {
    const ok = await confirm({ message: `Hapus polling "${question}"?`, variant: "danger", title: "Konfirmasi" });
    if (!ok) return;
    try {
      const res = await fetch(`/api/polls/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Polling berhasil dihapus");
      fetchData();
    } catch {
      showError("Gagal menghapus polling");
    }
  }

  async function toggleActive(poll: Poll) {
    try {
      await fetch(`/api/polls/${poll.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !poll.isActive }),
      });
      success(poll.isActive ? "Polling dinonaktifkan" : "Polling diaktifkan");
      fetchData();
    } catch {
      showError("Gagal mengubah status");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-txt-primary">Polling</h1>
          <p className="text-base text-txt-secondary">Kelola polling untuk pembaca (1 vote per IP)</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm font-semibold">
          <Plus size={16} /> Buat Polling Baru
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Form */}
          <div className="lg:col-span-3 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-txt-primary">{editingId ? "Edit Polling" : "Buat Polling Baru"}</h2>
              <button onClick={resetForm} className="p-1 hover:bg-surface-secondary rounded-lg"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-txt-secondary">Pertanyaan *</label>
                <textarea placeholder="Contoh: Apakah Anda setuju dengan revisi UU ITE?" value={formQuestion} onChange={(e) => setFormQuestion(e.target.value)} required rows={2} className="input w-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-txt-secondary">Kategori (opsional)</label>
                  <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} className="input w-full">
                    <option value="">— Semua (Homepage) —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-txt-secondary">URL Gambar (opsional)</label>
                  <input type="url" placeholder="https://..." value={formImage} onChange={(e) => setFormImage(e.target.value)} className="input w-full" />
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-txt-secondary">Opsi Jawaban * (min. 2, maks. 10)</label>
                <div className="space-y-2">
                  {formOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-txt-muted w-5 text-center shrink-0">{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder={`Opsi ${idx + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        className="input flex-1"
                        disabled={!!editingId}
                      />
                      {!editingId && formOptions.length > 2 && (
                        <button type="button" onClick={() => removeOption(idx)} className="p-1 text-red-400 hover:text-red-600"><X size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
                {!editingId && formOptions.length < 10 && (
                  <button type="button" onClick={addOption} className="mt-2 text-sm font-medium text-goto-green hover:text-goto-dark flex items-center gap-1">
                    <Plus size={14} /> Tambah Opsi
                  </button>
                )}
                {editingId && (
                  <p className="mt-1 text-xs text-txt-muted">Opsi tidak bisa diubah setelah polling dibuat (sudah ada vote)</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-txt-secondary">Urutan</label>
                  <input type="number" min={0} value={formOrder} onChange={(e) => setFormOrder(Number(e.target.value))} className="input w-full" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-txt-secondary">Status</label>
                  <select value={formIsActive ? "true" : "false"} onChange={(e) => setFormIsActive(e.target.value === "true")} className="input w-full">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetForm} className="btn-secondary px-5 py-2.5 text-sm">Batal</button>
                <button type="submit" disabled={submitting} className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
                  <Save size={14} className="mr-1.5" />
                  {submitting ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Buat Polling"}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Preview */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-20 rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-card">
              <h3 className="text-sm font-bold text-txt-primary mb-4">Preview</h3>
              <div className="rounded-xl border border-border bg-surface-secondary overflow-hidden">
                {formImage && (
                  <div className="w-full aspect-[2/1] bg-surface-tertiary overflow-hidden">
                    <img src={formImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <p className="text-sm font-semibold text-txt-primary mb-4 leading-snug">
                    {formQuestion || "Pertanyaan polling..."}
                  </p>
                  <div className="space-y-2">
                    {formOptions.filter(o => o.trim()).map((opt, idx) => (
                      <div key={idx} className="w-full text-left rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-txt-primary">
                        {opt}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-txt-muted mt-3">0 suara</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Polls List */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
              <div className="h-4 w-3/4 rounded bg-surface-tertiary mb-3" />
              <div className="h-3 w-1/2 rounded bg-surface-tertiary" />
            </div>
          ))}
        </div>
      ) : polls.length === 0 && !showForm ? (
        <div className="rounded-[12px] border-2 border-dashed border-border py-16 text-center">
          <Vote size={40} className="mx-auto text-txt-muted mb-3" />
          <p className="text-txt-muted text-base">Belum ada polling.</p>
          <button onClick={openAdd} className="mt-3 btn-primary px-4 py-2 text-sm"><Plus size={14} className="mr-1" /> Buat Polling Pertama</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {polls.slice((page - 1) * POLLS_PER_PAGE, page * POLLS_PER_PAGE).map((poll) => (
              <div key={poll.id} className={`rounded-[12px] border bg-surface shadow-card transition-all overflow-hidden flex flex-col ${editingId === poll.id ? "border-goto-green bg-goto-light/10" : "border-border"}`}>
                {/* Image */}
                {poll.image ? (
                  <div className="w-full h-28 bg-surface-tertiary overflow-hidden">
                    <img src={poll.image} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-10 bg-gradient-to-r from-goto-green/10 to-goto-green/5 flex items-center justify-center">
                    <span className="text-xs text-goto-green/50">Tanpa gambar</span>
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${poll.isActive ? "bg-goto-light text-goto-green" : "bg-red-50 text-red-600"}`}>
                      <Power size={8} /> {poll.isActive ? "Aktif" : "Off"}
                    </span>
                    {poll.category && (
                      <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-xs text-txt-secondary">{poll.category.name}</span>
                    )}
                  </div>
                  <p className="font-bold text-txt-primary text-sm leading-snug line-clamp-2 mb-3">{poll.question}</p>
                  <div className="space-y-1 flex-1">
                    {poll.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                          <div className="h-full rounded-full bg-goto-green/50" style={{ width: `${opt.percentage}%` }} />
                        </div>
                        <span className="text-xs text-txt-secondary w-16 truncate">{opt.label}</span>
                        <span className="text-xs font-bold text-txt-primary w-8 text-right">{opt.percentage}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-txt-muted">
                      <BarChart3 size={10} className="inline mr-0.5" />
                      {poll.totalVotes.toLocaleString("id-ID")} suara
                    </p>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => toggleActive(poll)} className={`btn-ghost rounded p-1.5 ${poll.isActive ? "hover:text-red-500" : "hover:text-goto-green"}`} title={poll.isActive ? "Nonaktifkan" : "Aktifkan"}>
                        <Power size={14} />
                      </button>
                      <button onClick={() => openEdit(poll)} className="btn-ghost rounded p-1.5" title="Edit"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(poll.id, poll.question)} className="btn-ghost rounded p-1.5 hover:text-red-500" title="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {polls.length > POLLS_PER_PAGE && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-txt-secondary">Halaman {page} dari {Math.ceil(polls.length / POLLS_PER_PAGE)}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Sebelumnya</button>
                <button onClick={() => setPage(p => Math.min(Math.ceil(polls.length / POLLS_PER_PAGE), p + 1))} disabled={page >= Math.ceil(polls.length / POLLS_PER_PAGE)} className="btn-secondary px-4 py-2 text-sm disabled:opacity-40">Selanjutnya</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
