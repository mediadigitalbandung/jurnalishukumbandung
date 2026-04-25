"use client";

import { useState } from "react";
import { Trash2, Eraser, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  videoId: string;
  onReset?: () => void;
}

interface ResetOptions {
  clearClips: boolean;
  clearSubtitles: boolean;
  clearTextOverlays: boolean;
  clearOverlays: boolean;
  clearMeta: boolean;
}

const DEFAULT_OPTS: ResetOptions = {
  clearClips: false,
  clearSubtitles: false,
  clearTextOverlays: false,
  clearOverlays: false,
  clearMeta: false,
};

export default function ResetPanel({ videoId, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ResetOptions>(DEFAULT_OPTS);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const anySelected = Object.values(opts).some(Boolean);

  const reset = async () => {
    if (!anySelected) return;
    const labels: string[] = [];
    if (opts.clearClips) labels.push("semua clip foto/video");
    if (opts.clearSubtitles) labels.push("semua subtitle entry");
    if (opts.clearTextOverlays) labels.push("text overlay di semua clip");
    if (opts.clearOverlays) labels.push("semua PNG overlay");
    if (opts.clearMeta) labels.push("caption + hashtag + link artikel");

    if (!confirm(`PERMANEN: hapus ${labels.join(", ")}?\n\nTidak bisa di-undo.`)) return;

    setLoading(true);
    setLastResult(null);
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Gagal");
      const s = json.data;
      const parts: string[] = [];
      if (s.clipsDeleted) parts.push(`${s.clipsDeleted} clip`);
      if (s.subtitlesDeleted) parts.push(`${s.subtitlesDeleted} subtitle`);
      if (s.textOverlaysCleared) parts.push(`${s.textOverlaysCleared} text overlay`);
      if (s.pngOverlaysDeleted) parts.push(`${s.pngOverlaysDeleted} PNG overlay`);
      if (s.metaCleared) parts.push("meta");
      setLastResult(parts.length > 0 ? `Dihapus: ${parts.join(", ")}` : "Tidak ada yang dihapus");
      setOpts(DEFAULT_OPTS);
      onReset?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
    setLoading(false);
  };

  const quickReset = async (key: keyof ResetOptions, confirmText: string) => {
    if (!confirm(`PERMANEN: ${confirmText}?\n\nTidak bisa di-undo.`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: true }),
      });
      const json = await res.json();
      if (json.success) onReset?.();
      else alert(json.error || "Gagal");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
    setLoading(false);
  };

  return (
    <div className="rounded-[12px] border border-red-200 bg-red-50/30 p-3 shadow-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-red-700"
      >
        <span className="flex items-center gap-2">
          <Eraser size={12} /> Reset Konten
        </span>
        <span className="text-[10px] text-red-500">{open ? "▼" : "▶"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-1.5">
            <QuickBtn
              label="Hapus Clips"
              loading={loading}
              onClick={() => quickReset("clearClips", "hapus SEMUA clip foto/video")}
            />
            <QuickBtn
              label="Hapus Subtitle"
              loading={loading}
              onClick={() => quickReset("clearSubtitles", "hapus SEMUA subtitle entry")}
            />
            <QuickBtn
              label="Clear Text"
              loading={loading}
              onClick={() => quickReset("clearTextOverlays", "kosongkan text overlay di SEMUA clip")}
            />
            <QuickBtn
              label="Hapus PNG"
              loading={loading}
              onClick={() => quickReset("clearOverlays", "hapus SEMUA PNG overlay")}
            />
          </div>

          {/* Custom multi-select */}
          <div className="rounded border border-red-200 bg-white p-2">
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-700">
              <AlertTriangle size={10} /> Pilih beberapa sekaligus
            </p>
            <div className="space-y-1">
              <Check label="Semua clip foto/video"
                checked={opts.clearClips}
                onChange={(v) => setOpts({ ...opts, clearClips: v })} />
              <Check label="Semua subtitle entry"
                checked={opts.clearSubtitles}
                onChange={(v) => setOpts({ ...opts, clearSubtitles: v })} />
              <Check label="Text overlay (kosongkan, clip tetap)"
                checked={opts.clearTextOverlays}
                onChange={(v) => setOpts({ ...opts, clearTextOverlays: v })}
                disabled={opts.clearClips}
                hint={opts.clearClips ? "Tidak relevan — clips ikut dihapus" : undefined} />
              <Check label="Semua PNG overlay"
                checked={opts.clearOverlays}
                onChange={(v) => setOpts({ ...opts, clearOverlays: v })} />
              <Check label="Caption + hashtag + link artikel"
                checked={opts.clearMeta}
                onChange={(v) => setOpts({ ...opts, clearMeta: v })} />
            </div>

            <button
              onClick={reset}
              disabled={!anySelected || loading}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40"
            >
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              Reset Yang Dipilih
            </button>
          </div>

          {lastResult && (
            <p className="rounded bg-emerald-50 px-2 py-1 text-[10px] text-emerald-800">
              ✓ {lastResult}
            </p>
          )}

          <p className="text-[10px] text-red-600">
            ⚠️ Aksi permanen — tidak bisa di-undo. Pakai ini untuk start fresh sebelum apply template baru.
          </p>
        </div>
      )}
    </div>
  );
}

function QuickBtn({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-red-700 hover:border-red-400 hover:bg-red-50 disabled:opacity-50"
    >
      {label}
    </button>
  );
}

function Check({
  label, checked, onChange, disabled, hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className={`flex cursor-pointer items-start gap-1.5 text-[11px] ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 accent-red-600"
      />
      <div className="flex-1">
        <span className="text-txt-primary">{label}</span>
        {hint && <span className="block text-[9px] text-txt-muted">{hint}</span>}
      </div>
    </label>
  );
}
