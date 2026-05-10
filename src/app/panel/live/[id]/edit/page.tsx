"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { ChevronLeft, Radio, Loader2, Save } from "lucide-react";

type Category = { id: string; name: string };

export default function EditLiveSessionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [allowChat, setAllowChat] = useState(true);
  const [allowDownload, setAllowDownload] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => j.success && setCategories(j.data || []))
      .catch(() => null);

    fetch(`/api/live/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) {
          showError(j.error || "Gagal load");
          return;
        }
        const s = j.data;
        setTitle(s.title);
        setDescription(s.description || "");
        setThumbnail(s.thumbnail || "");
        setScheduledAt(s.scheduledAt ? new Date(s.scheduledAt).toISOString().slice(0, 16) : "");
        setCategoryId(s.categoryId || "");
        setIsPublic(s.isPublic);
        setAllowChat(s.allowChat);
        setAllowDownload(s.allowDownload);
        setSeoTitle(s.seoTitle || "");
        setSeoDescription(s.seoDescription || "");
        setNotes(s.notes || "");
        setStatus(s.status);
      })
      .catch((e) => showError(e instanceof Error ? e.message : "Network error"))
      .finally(() => setLoading(false));
  }, [params.id, showError]);

  async function handleSave() {
    if (!title.trim() || title.trim().length < 3) {
      showError("Judul minimal 3 karakter");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/live/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          thumbnail: thumbnail.trim() || null,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          categoryId: categoryId || null,
          isPublic,
          allowChat,
          allowDownload,
          seoTitle: seoTitle.trim() || null,
          seoDescription: seoDescription.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        showError(json.error || "Gagal save");
      } else {
        success("Tersimpan");
        router.push("/panel/live");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-goto-green" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/panel/live"
          className="inline-flex items-center gap-1 text-sm text-txt-secondary hover:text-goto-green mb-2"
        >
          <ChevronLeft className="h-4 w-4" /> Live Streaming
        </Link>
        <h1 className="text-2xl font-bold text-txt-primary flex items-center gap-2">
          <Radio className="h-6 w-6 text-red-600" /> Edit Live Session
        </h1>
        <p className="text-xs text-txt-muted mt-1">
          Status: <span className="font-mono">{status}</span>
        </p>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-txt-primary mb-1.5">Judul</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input w-full"
            maxLength={200}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-txt-primary mb-1.5">Deskripsi</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="input w-full resize-y"
            maxLength={2000}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-txt-primary mb-1.5">Jadwal</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input w-full"
              disabled={status === "LIVE" || status === "ARCHIVED"}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-txt-primary mb-1.5">Kategori</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input w-full"
            >
              <option value="">— Tanpa kategori —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-txt-primary mb-1.5">URL Thumbnail</label>
          <input
            type="url"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            className="input w-full"
          />
        </div>
        <div className="border-t pt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-goto-green"
            />
            <span>Public (tampil di /live)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowChat}
              onChange={(e) => setAllowChat(e.target.checked)}
              className="w-4 h-4 accent-goto-green"
            />
            <span>Izinkan chat</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              className="w-4 h-4 accent-goto-green"
            />
            <span>Izinkan download recording</span>
          </label>
        </div>
        <details className="border-t pt-4">
          <summary className="cursor-pointer font-semibold text-sm">SEO</summary>
          <div className="space-y-3 mt-2">
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              placeholder="SEO Title"
              className="input w-full"
              maxLength={150}
            />
            <textarea
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              rows={2}
              placeholder="SEO Description"
              className="input w-full resize-y"
              maxLength={300}
            />
          </div>
        </details>
        <div className="border-t pt-4">
          <label className="block text-sm font-semibold text-txt-primary mb-1.5">Catatan internal</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Catatan untuk admin (tidak tampil ke publik)"
            className="input w-full resize-y"
            maxLength={2000}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/panel/live" className="btn-secondary">
          Batal
        </Link>
        <button onClick={handleSave} disabled={saving} className="btn-primary inline-flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan
        </button>
      </div>
    </div>
  );
}
