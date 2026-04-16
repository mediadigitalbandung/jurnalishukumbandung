"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Plus, Trash2, Pencil, Gavel, Calendar, Radio, Loader2, X } from "lucide-react";

interface Schedule {
  id: string;
  title: string;
  court: string;
  courtType: string;
  caseNumber: string | null;
  defendant: string | null;
  judge: string | null;
  agenda: string | null;
  date: string;
  time: string | null;
  location: string | null;
  status: string;
  isHighlight: boolean;
  articleSlug: string | null;
}

const courtTypes = [
  { value: "umum", label: "Pidana/Perdata" },
  { value: "tipikor", label: "Tipikor" },
  { value: "militer", label: "Militer" },
  { value: "agama", label: "Agama" },
  { value: "tun", label: "TUN" },
];

const statuses = [
  { value: "scheduled", label: "Dijadwalkan" },
  { value: "live", label: "Sedang Berlangsung" },
  { value: "done", label: "Selesai" },
  { value: "postponed", label: "Ditunda" },
];

const emptyForm = {
  title: "", court: "PN Bandung", courtType: "umum", caseNumber: "", defendant: "",
  judge: "", agenda: "", date: "", time: "09:00", location: "", status: "scheduled",
  isHighlight: false, articleSlug: "",
};

export default function JadwalSidangPanel() {
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/court-schedule?from=2020-01-01T00:00:00Z&limit=100");
      const json = await res.json();
      setSchedules(json.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowForm(true);
  };

  const openEdit = (s: Schedule) => {
    setEditingId(s.id);
    setForm({
      title: s.title, court: s.court, courtType: s.courtType,
      caseNumber: s.caseNumber || "", defendant: s.defendant || "",
      judge: s.judge || "", agenda: s.agenda || "",
      date: s.date.slice(0, 10), time: s.time || "09:00",
      location: s.location || "", status: s.status,
      isHighlight: s.isHighlight, articleSlug: s.articleSlug || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.court.trim() || !form.date) {
      showError("Judul, pengadilan, dan tanggal wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        date: new Date(form.date + "T" + (form.time || "09:00") + ":00").toISOString(),
        caseNumber: form.caseNumber || undefined,
        defendant: form.defendant || undefined,
        judge: form.judge || undefined,
        agenda: form.agenda || undefined,
        location: form.location || undefined,
        articleSlug: form.articleSlug || undefined,
      };

      const res = editingId
        ? await fetch(`/api/court-schedule/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/court-schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      const json = await res.json();
      if (!json.success) { showError(json.error || "Gagal menyimpan"); setSaving(false); return; }

      success(editingId ? "Jadwal diperbarui" : "Jadwal ditambahkan");
      setShowForm(false);
      fetchData();
    } catch { showError("Terjadi kesalahan"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({ message: "Hapus jadwal sidang ini?", variant: "danger", title: "Konfirmasi" });
    if (!ok) return;
    try {
      await fetch(`/api/court-schedule/${id}`, { method: "DELETE" });
      success("Jadwal dihapus");
      fetchData();
    } catch { showError("Gagal menghapus"); }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-txt-primary sm:text-2xl">
            <Gavel size={24} className="text-goto-green" />
            Jadwal Sidang
          </h1>
          <p className="text-sm text-txt-secondary">Kelola jadwal sidang pengadilan Bandung & Jabar</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm font-semibold">
          <Plus size={16} /> Tambah Jadwal
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="mb-6 rounded-[12px] border border-border bg-surface p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-txt-primary">{editingId ? "Edit Jadwal" : "Tambah Jadwal Baru"}</h2>
            <button onClick={() => setShowForm(false)} className="text-txt-muted hover:text-txt-primary"><X size={18} /></button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-txt-primary">Judul Sidang *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input w-full" placeholder="Sidang Tipikor Dana Bansos Bandung" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">Pengadilan *</label>
              <input value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} className="input w-full" placeholder="PN Bandung" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">Jenis</label>
              <select value={form.courtType} onChange={(e) => setForm({ ...form, courtType: e.target.value })} className="input w-full">
                {courtTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">Tanggal *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">Waktu</label>
              <input type="time" value={form.time || ""} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">Terdakwa</label>
              <input value={form.defendant} onChange={(e) => setForm({ ...form, defendant: e.target.value })} className="input w-full" placeholder="Nama terdakwa" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">Hakim</label>
              <input value={form.judge} onChange={(e) => setForm({ ...form, judge: e.target.value })} className="input w-full" placeholder="Nama hakim" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">No. Perkara</label>
              <input value={form.caseNumber} onChange={(e) => setForm({ ...form, caseNumber: e.target.value })} className="input w-full" placeholder="123/Pid.Sus-TPK/2026/PN Bdg" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">Lokasi</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input w-full" placeholder="Ruang Sidang 1, Lantai 2" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-txt-primary">Agenda</label>
              <input value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} className="input w-full" placeholder="Pembacaan Tuntutan" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input w-full">
                {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-txt-primary">Slug Artikel Liputan</label>
              <input value={form.articleSlug} onChange={(e) => setForm({ ...form, articleSlug: e.target.value })} className="input w-full" placeholder="sidang-tipikor-bandung-2026" />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" id="highlight" checked={form.isHighlight} onChange={(e) => setForm({ ...form, isHighlight: e.target.checked })} className="h-4 w-4 rounded border-border text-goto-green" />
              <label htmlFor="highlight" className="text-sm text-txt-primary">Sorot / Highlight</label>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5 px-5 py-2 text-sm font-semibold disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
              {saving ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost px-4 py-2 text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center"><Loader2 size={24} className="mx-auto animate-spin text-goto-green" /></div>
      ) : schedules.length === 0 ? (
        <div className="rounded-[12px] border-2 border-dashed border-border py-16 text-center">
          <Calendar size={40} className="mx-auto text-txt-muted mb-3" />
          <p className="text-txt-muted">Belum ada jadwal sidang</p>
          <button onClick={openCreate} className="mt-3 text-sm font-medium text-goto-green hover:underline">Tambah jadwal pertama</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[12px] border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-secondary text-left text-xs uppercase tracking-wider text-txt-muted">
              <tr>
                <th className="px-4 py-3">Sidang</th>
                <th className="px-4 py-3">Pengadilan</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-surface-secondary transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-txt-primary">{s.title}</div>
                    {s.defendant && <div className="text-xs text-txt-muted mt-0.5">Terdakwa: {s.defendant}</div>}
                  </td>
                  <td className="px-4 py-3 text-txt-secondary">{s.court}</td>
                  <td className="px-4 py-3 text-txt-secondary whitespace-nowrap">
                    {new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    {s.time && <span className="ml-1 text-txt-muted">{s.time}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      s.status === "live" ? "bg-red-50 text-red-700 border-red-200" :
                      s.status === "done" ? "bg-gray-50 text-gray-600 border-gray-200" :
                      s.status === "postponed" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                      "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {s.status === "live" && <Radio size={8} className="mr-1 animate-pulse" />}
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="rounded p-1.5 text-txt-muted hover:bg-surface-tertiary hover:text-goto-green"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(s.id)} className="rounded p-1.5 text-txt-muted hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
