"use client";

import { useCallback, useEffect, useState } from "react";
import { LayoutTemplate, Save, Loader2, Check, Trash2, Plus, X, Sparkles } from "lucide-react";

interface TemplateOverlay {
  id: string;
  imageUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  order: number;
  label: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  frameStyle: string;
  subtitleEnabled: boolean;
  subtitleY: number;
  subtitleFontSize: number;
  defaultTextColor: string | null;
  defaultTextFontSize: number | null;
  backsongId: string | null;
  backsong?: { id: string; name: string } | null;
  overlays: TemplateOverlay[];
  usedCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  createdByName: string | null;
}

interface Props {
  videoId: string;
  onApplied?: () => void;
}

export default function TemplateManager({ videoId, onApplied }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tiktok/templates");
      const json = await res.json();
      if (json.success) setTemplates(json.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveTemplate = async () => {
    if (name.trim().length < 2) {
      setError("Nama minimal 2 karakter");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tiktok/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, name: name.trim(), description: description.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal save");
      setSaveOpen(false);
      setName("");
      setDescription("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
    setSaving(false);
  };

  const applyTemplate = async (id: string, name: string) => {
    if (!confirm(`Apply template "${name}"? Akan replace PNG overlays + frame + subtitle style + backsong di video ini.`)) return;
    setApplyingId(id);
    try {
      const res = await fetch(`/api/tiktok/templates/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal apply");
      onApplied?.();
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
    setApplyingId(null);
  };

  const deleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Hapus template "${name}"?`)) return;
    try {
      await fetch(`/api/tiktok/templates/${id}`, { method: "DELETE" });
      load();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
          <LayoutTemplate size={12} /> Template ({templates.length})
        </h3>
        <button
          onClick={() => setSaveOpen(true)}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-indigo-700"
          title="Simpan setup video ini sebagai template reusable"
        >
          <Save size={10} /> Simpan
        </button>
      </div>

      {/* Save form */}
      {saveOpen && (
        <div className="rounded-lg border-2 border-indigo-300 bg-indigo-50 p-3">
          <p className="mb-2 text-[11px] text-indigo-900 leading-relaxed">
            Setup video ini (frame, PNG overlay, subtitle style, backsong, default text style) akan disimpan jadi template.
            <br />
            <strong>Tidak ikut disimpan:</strong> clip foto/video, subtitle entries, judul, caption, hashtag.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama template (e.g. Berita Hukum Default)"
            maxLength={100}
            className="input mb-2 w-full text-xs"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Deskripsi singkat (opsional)"
            maxLength={500}
            rows={2}
            className="input mb-2 w-full resize-none text-xs"
          />
          {error && (
            <p className="mb-2 rounded bg-red-100 px-2 py-1 text-[10px] text-red-800">{error}</p>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={saveTemplate}
              disabled={saving || name.trim().length < 2}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {saving ? "Saving..." : "Simpan Template"}
            </button>
            <button
              onClick={() => { setSaveOpen(false); setError(null); }}
              disabled={saving}
              className="rounded-full border border-indigo-300 px-3 py-1.5 text-xs text-indigo-700 hover:bg-indigo-100"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Templates list */}
      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 size={14} className="animate-spin text-indigo-600" />
        </div>
      ) : templates.length === 0 ? (
        <p className="rounded border border-dashed border-border py-3 text-center text-[10px] text-txt-muted">
          Belum ada template. Setup video ini, lalu klik <strong>Simpan</strong>.
        </p>
      ) : (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-surface p-2 hover:border-indigo-300">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-txt-primary">{t.name}</p>
                  <p className="text-[10px] text-txt-muted">
                    {t.frameStyle !== "none" && <>🎞 {t.frameStyle} · </>}
                    {t.overlays.length > 0 && <>🖼 {t.overlays.length} PNG · </>}
                    {t.backsong && <>🎵 {t.backsong.name.slice(0, 12)} · </>}
                    {t.usedCount > 0 && <>✨ {t.usedCount}×</>}
                  </p>
                  {t.description && (
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-txt-secondary">{t.description}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => applyTemplate(t.id, t.name)}
                    disabled={applyingId === t.id}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    title="Apply ke video ini"
                  >
                    {applyingId === t.id ? (
                      <Loader2 size={9} className="animate-spin" />
                    ) : (
                      <Sparkles size={9} />
                    )}
                    Apply
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id, t.name)}
                    className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                    title="Hapus template"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
