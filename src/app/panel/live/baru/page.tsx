"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { ChevronLeft, Radio, Loader2, Save } from "lucide-react";

type Category = { id: string; name: string };

export default function NewLiveSessionPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [startNow, setStartNow] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setCategories(j.data || []);
      })
      .catch(() => null);
  }, []);

  async function handleSubmit() {
    if (!title.trim() || title.trim().length < 3) {
      showError("Judul minimal 3 karakter");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/live", {
        method: "POST",
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
        }),
      });
      const json = await res.json();
      if (!json.success) {
        showError(json.error || "Gagal buat session");
        setSaving(false);
        return;
      }
      success("Live session dibuat!");
      const id = json.data.id;
      if (startNow) {
        router.push(`/panel/live/broadcast/${id}`);
      } else {
        router.push("/panel/live");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
      setSaving(false);
    }
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
          <Radio className="h-6 w-6 text-red-600" /> Buat Live Session Baru
        </h1>
      </div>

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-txt-primary mb-1.5">
            Judul Live <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="contoh: Live Sidang Tipikor Bandung — Kasus Korupsi Dana Bansos"
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
            placeholder="Konteks live ini, apa yang akan dibahas, lokasi, dll. (opsional)"
            className="input w-full resize-y"
            maxLength={2000}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-txt-primary mb-1.5">
              Jadwal Mulai (opsional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input w-full"
            />
            <p className="text-xs text-txt-muted mt-1">
              Kosongkan kalau mau langsung mulai sekarang.
            </p>
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
          <label className="block text-sm font-semibold text-txt-primary mb-1.5">
            URL Thumbnail (opsional)
          </label>
          <input
            type="url"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            placeholder="https://..."
            className="input w-full"
          />
        </div>

        <div className="border-t pt-4 space-y-3">
          <h3 className="font-semibold text-sm text-txt-primary">Pengaturan</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-goto-green"
            />
            <span>Public (tampil di /live & homepage). Uncheck = private (cuma yang punya link)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowChat}
              onChange={(e) => setAllowChat(e.target.checked)}
              className="w-4 h-4 accent-goto-green"
            />
            <span>Izinkan komentar/chat (TODO: belum diimplementasi)</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              className="w-4 h-4 accent-goto-green"
            />
            <span>Izinkan viewer download recording MP4</span>
          </label>
        </div>

        <details className="border-t pt-4">
          <summary className="cursor-pointer font-semibold text-sm text-txt-primary mb-2">
            SEO (opsional)
          </summary>
          <div className="space-y-3 mt-2">
            <div>
              <label className="block text-xs text-txt-secondary mb-1">SEO Title (max 150)</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="input w-full"
                maxLength={150}
              />
            </div>
            <div>
              <label className="block text-xs text-txt-secondary mb-1">SEO Description (max 300)</label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={2}
                className="input w-full resize-y"
                maxLength={300}
              />
            </div>
          </div>
        </details>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 sticky bottom-0 bg-surface-primary p-3 border-t shadow">
        <Link href="/panel/live" className="btn-secondary">
          Batal
        </Link>
        <button
          onClick={() => {
            setStartNow(false);
            handleSubmit();
          }}
          disabled={saving}
          className="btn-secondary inline-flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan saja
        </button>
        <button
          onClick={() => {
            setStartNow(true);
            handleSubmit();
          }}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
          Simpan & Mulai Broadcast
        </button>
      </div>
    </div>
  );
}
