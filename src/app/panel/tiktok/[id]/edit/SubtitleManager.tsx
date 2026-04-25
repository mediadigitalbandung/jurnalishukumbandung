"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Subtitles, Clock, Sparkles, AlertCircle } from "lucide-react";

interface SubtitleEntry {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  y: number | null;
  fontSize: number | null;
  color: string | null;
}

interface Props {
  videoId: string;
  totalDuration: number;
  onChange?: () => void;
}

export default function SubtitleManager({ videoId, totalDuration, onChange }: Props) {
  const [entries, setEntries] = useState<SubtitleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenForm, setShowGenForm] = useState(false);
  const [genCount, setGenCount] = useState<number | "auto">("auto");
  const [genError, setGenError] = useState<string | null>(null);

  // Add form
  const [newText, setNewText] = useState("");
  const [newStart, setNewStart] = useState(0);
  const [newEnd, setNewEnd] = useState(2.5);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}/subtitles`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data || []);
        onChange?.();
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [videoId, onChange]);

  useEffect(() => { load(); }, [load]);

  const addEntry = async () => {
    if (!newText.trim()) return;
    if (newEnd <= newStart) {
      alert("End harus lebih besar dari Start");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}/subtitles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startSec: newStart,
          endSec: newEnd,
          text: newText.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewText("");
        setNewStart(newEnd);
        setNewEnd(Math.min(totalDuration, newEnd + 2.5));
        load();
      } else {
        alert(json.error || "Gagal");
      }
    } catch { /* ignore */ }
    setAdding(false);
  };

  const updateEntry = async (id: string, patch: Partial<SubtitleEntry>) => {
    try {
      await fetch(`/api/tiktok/videos/${videoId}/subtitles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      load();
    } catch { /* ignore */ }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm("Hapus subtitle ini?")) return;
    try {
      await fetch(`/api/tiktok/videos/${videoId}/subtitles/${id}`, { method: "DELETE" });
      load();
    } catch { /* ignore */ }
  };

  // Generate sequence of subtitle text via AI from linked article
  const generateSequence = async () => {
    if (entries.length > 0) {
      const ok = confirm(
        `Sudah ada ${entries.length} subtitle. Generate akan HAPUS semua dan ganti dengan sequence baru. Lanjut?`
      );
      if (!ok) return;
    }
    setGenerating(true);
    setGenError(null);
    try {
      const body: Record<string, unknown> = { replace: true };
      if (genCount !== "auto") body.count = genCount;
      const res = await fetch(`/api/tiktok/videos/${videoId}/generate-text-segments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setShowGenForm(false);
      load();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Gagal generate");
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
          <Subtitles size={12} /> Subtitle Timeline ({entries.length})
        </h3>
        <button
          onClick={() => setShowGenForm((s) => !s)}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
          title="Generate sequence dari artikel terkait via AI"
        >
          <Sparkles size={10} />
          AI Generate
        </button>
      </div>

      {/* AI Generate form */}
      {showGenForm && (
        <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 p-3">
          <p className="mb-2 text-[11px] text-emerald-900 leading-relaxed">
            AI akan pecah artikel terkait jadi <strong>beberapa text overlay timed</strong> yang muncul beruntun di video, total {totalDuration.toFixed(0)}s.
          </p>
          <div className="mb-2">
            <label className="mb-1 block text-[10px] font-semibold text-emerald-900">Jumlah Segment</label>
            <select
              value={genCount}
              onChange={(e) => setGenCount(e.target.value === "auto" ? "auto" : parseInt(e.target.value))}
              className="input w-full text-xs"
              disabled={generating}
            >
              <option value="auto">Auto (sesuai durasi)</option>
              <option value={3}>3 segment</option>
              <option value={5}>5 segment</option>
              <option value={6}>6 segment</option>
              <option value={8}>8 segment</option>
              <option value={10}>10 segment</option>
              <option value={12}>12 segment</option>
            </select>
          </div>
          {genError && (
            <div className="mb-2 flex items-start gap-1.5 rounded bg-red-100 p-1.5 text-[10px] text-red-800">
              <AlertCircle size={11} className="shrink-0 mt-0.5" />
              <span className="break-words">{genError}</span>
            </div>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={generateSequence}
              disabled={generating}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {generating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {generating ? "Generating (10-30s)..." : "Generate"}
            </button>
            <button
              onClick={() => setShowGenForm(false)}
              disabled={generating}
              className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              Batal
            </button>
          </div>
          <p className="mt-1.5 text-[9px] text-emerald-700">
            ⚠️ Video harus sudah di-link ke artikel. Generate akan replace existing subtitles.
          </p>
        </div>
      )}

      {/* Add form */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Tulis subtitle..."
          maxLength={500}
          className="input w-full text-xs"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-txt-muted">Mulai (detik)</label>
            <input
              type="number"
              value={newStart}
              onChange={(e) => setNewStart(parseFloat(e.target.value) || 0)}
              min={0}
              max={totalDuration}
              step={0.5}
              className="input mt-0.5 w-full text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-txt-muted">Selesai (detik)</label>
            <input
              type="number"
              value={newEnd}
              onChange={(e) => setNewEnd(parseFloat(e.target.value) || 0)}
              min={0.1}
              max={totalDuration}
              step={0.5}
              className="input mt-0.5 w-full text-xs"
            />
          </div>
        </div>
        <button
          onClick={addEntry}
          disabled={adding || !newText.trim()}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          Tambah Subtitle
        </button>
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-emerald-600" />
        </div>
      ) : entries.length === 0 ? (
        <p className="rounded border border-dashed border-border py-4 text-center text-xs text-txt-muted">
          Belum ada subtitle. Tambahkan di atas.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {entries.map((e) => (
            <SubtitleRow key={e.id} entry={e} totalDuration={totalDuration} onUpdate={updateEntry} onDelete={deleteEntry} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubtitleRow({
  entry, totalDuration, onUpdate, onDelete,
}: {
  entry: SubtitleEntry;
  totalDuration: number;
  onUpdate: (id: string, patch: Partial<SubtitleEntry>) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState(entry.text);
  const [start, setStart] = useState(entry.startSec);
  const [end, setEnd] = useState(entry.endSec);

  return (
    <div className="rounded border border-border bg-surface p-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => text !== entry.text && onUpdate(entry.id, { text })}
        className="w-full bg-transparent text-xs font-medium text-txt-primary outline-none"
      />
      <div className="mt-1 flex items-center gap-1.5 text-[10px]">
        <Clock size={10} className="text-emerald-600" />
        <input
          type="number"
          value={start}
          onChange={(e) => setStart(parseFloat(e.target.value) || 0)}
          onBlur={() => start !== entry.startSec && onUpdate(entry.id, { startSec: start })}
          min={0}
          max={totalDuration}
          step={0.1}
          className="w-14 rounded border border-border bg-surface-secondary px-1 py-0.5 font-mono"
        />
        <span className="text-txt-muted">→</span>
        <input
          type="number"
          value={end}
          onChange={(e) => setEnd(parseFloat(e.target.value) || 0)}
          onBlur={() => end !== entry.endSec && onUpdate(entry.id, { endSec: end })}
          min={0.1}
          max={totalDuration}
          step={0.1}
          className="w-14 rounded border border-border bg-surface-secondary px-1 py-0.5 font-mono"
        />
        <span className="ml-auto text-txt-muted">{(end - start).toFixed(1)}s</span>
        <button
          onClick={() => onDelete(entry.id)}
          className="rounded p-0.5 text-red-500 hover:bg-red-50"
          title="Hapus"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}
