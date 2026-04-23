"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  ArrowLeft,
  Upload,
  Video,
  Image as ImageIcon,
  Music,
  Trash2,
  Loader2,
  PlayCircle,
  Send,
  Save,
  GripVertical,
  Type,
  Sparkles,
  RotateCw,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  Hash,
} from "lucide-react";

interface Clip {
  id: string;
  order: number;
  type: "video" | "image";
  sourceUrl: string;
  sourceDuration: number | null;
  durationSec: number;
  trimStart: number | null;
  textOverlay: string | null;
  textPosition: string | null;
  textColor: string | null;
  transition: string | null;
  kenBurns: boolean;
}

interface Backsong {
  id: string;
  name: string;
  url: string;
  durationSec: number;
  mood: string | null;
}

interface Video {
  id: string;
  title: string;
  caption: string | null;
  hashtags: string[];
  backsongId: string | null;
  backsongVolume: number;
  renderStatus: string;
  renderedUrl: string | null;
  durationSec: number | null;
  renderError: string | null;
  publishStatus: string;
  tiktokUrl: string | null;
  publishError: string | null;
  clips: Clip[];
  backsong: Backsong | null;
}

export default function TiktokEditPage() {
  const params = useParams<{ id: string }>();
  const videoId = params?.id as string;
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [backsongs, setBacksongs] = useState<Backsong[]>([]);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVideo = useCallback(async () => {
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}`);
      const json = await res.json();
      if (json.success) setVideo(json.data);
      else showError(json.error || "Gagal memuat video");
    } catch {
      showError("Gagal memuat video");
    }
    setLoading(false);
  }, [videoId, showError]);

  const fetchBacksongs = useCallback(async () => {
    try {
      const res = await fetch("/api/tiktok/backsongs");
      const json = await res.json();
      if (json.success) setBacksongs(json.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchVideo();
    fetchBacksongs();
  }, [fetchVideo, fetchBacksongs]);

  // Poll render status
  useEffect(() => {
    if (!video) return;
    if (video.renderStatus !== "queued" && video.renderStatus !== "rendering") return;
    const t = setInterval(fetchVideo, 5000);
    return () => clearInterval(t);
  }, [video, fetchVideo]);

  const totalDuration = video?.clips.reduce((sum, c) => sum + c.durationSec, 0) || 0;
  const MAX_DURATION = 60;

  const handleFilePick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const category = file.type.startsWith("video/") ? "video"
                     : file.type.startsWith("image/") ? "image"
                     : null;
      if (!category) {
        showError(`Skip ${file.name}: bukan video/foto`);
        continue;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", category);

      try {
        const up = await fetch("/api/tiktok/upload", { method: "POST", body: fd });
        const upJson = await up.json();
        if (!up.ok || !upJson.success) {
          showError(upJson.error || `Upload ${file.name} gagal`);
          continue;
        }

        // Tambah sebagai clip dengan default durasi
        const defaultDuration = category === "image" ? 3 : Math.min(10, MAX_DURATION - totalDuration);
        const res = await fetch(`/api/tiktok/videos/${videoId}/clips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: category,
            sourceUrl: upJson.data.url,
            durationSec: Math.max(1, defaultDuration),
            kenBurns: category === "image",
          }),
        });
        const json = await res.json();
        if (!json.success) showError(json.error || `Gagal tambah clip ${file.name}`);
      } catch {
        showError(`Error upload ${file.name}`);
      }
    }

    setUploading(false);
    fetchVideo();
  };

  const deleteClip = async (clipId: string) => {
    const ok = await confirm({ message: "Hapus clip ini?", variant: "danger", title: "Konfirmasi" });
    if (!ok) return;
    const res = await fetch(`/api/tiktok/videos/${videoId}/clips/${clipId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      success("Clip dihapus");
      fetchVideo();
    } else {
      showError(json.error || "Gagal hapus");
    }
  };

  const updateClip = async (clipId: string, data: Partial<Clip>) => {
    const res = await fetch(`/api/tiktok/videos/${videoId}/clips/${clipId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) {
      showError(json.error || "Gagal update");
    } else {
      fetchVideo();
    }
  };

  const moveClip = async (index: number, direction: -1 | 1) => {
    if (!video) return;
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= video.clips.length) return;
    const reordered = [...video.clips];
    [reordered[index], reordered[newIdx]] = [reordered[newIdx], reordered[index]];
    const clipIds = reordered.map((c) => c.id);
    const res = await fetch(`/api/tiktok/videos/${videoId}/clips/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clipIds }),
    });
    const json = await res.json();
    if (json.success) fetchVideo();
    else showError(json.error || "Gagal reorder");
  };

  const saveMeta = async (data: Partial<Video>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setVideo(json.data);
      } else {
        showError(json.error || "Gagal simpan");
      }
    } catch {
      showError("Gagal simpan");
    }
    setSaving(false);
  };

  const triggerRender = async () => {
    if (!video || video.clips.length === 0) {
      showError("Tambahkan minimal 1 clip dulu");
      return;
    }
    setRendering(true);
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}/render`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        success("Render dimulai. Halaman akan auto-refresh untuk cek status.");
        fetchVideo();
      } else {
        showError(json.error || "Gagal mulai render");
      }
    } catch {
      showError("Gagal mulai render");
    }
    setRendering(false);
  };

  const triggerPublish = async () => {
    const ok = await confirm({
      title: "Publish ke TikTok?",
      message: "Video akan diupload ke TikTok sebagai draft. Kamu masih bisa finalize/cancel di app TikTok.",
      variant: "warning",
    });
    if (!ok) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}/publish`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        success(json.data.message);
        fetchVideo();
      } else {
        showError(json.error || "Gagal publish");
      }
    } catch {
      showError("Gagal publish");
    }
    setPublishing(false);
  };

  const generateCaption = async () => {
    if (!video) return;
    setGeneratingCaption(true);
    try {
      const res = await fetch("/api/tiktok/videos/" + videoId + "/caption-gen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: video.title }),
      });
      const json = await res.json();
      if (json.success) {
        saveMeta({ caption: json.data.caption, hashtags: json.data.hashtags });
      } else {
        showError(json.error || "AI caption gagal");
      }
    } catch {
      showError("AI caption gagal");
    }
    setGeneratingCaption(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-pink-600" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-txt-secondary">Video tidak ditemukan</p>
        <Link href="/panel/tiktok" className="mt-2 inline-block text-sm text-pink-600 hover:underline">
          Kembali ke list
        </Link>
      </div>
    );
  }

  const canRender = video.clips.length > 0 && video.renderStatus !== "rendering" && video.renderStatus !== "queued";
  const canPublish = video.renderStatus === "rendered";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-5">
        <button
          onClick={() => router.push("/panel/tiktok")}
          className="mb-2 flex items-center gap-1 text-xs text-txt-secondary hover:text-txt-primary"
        >
          <ArrowLeft size={14} /> Kembali
        </button>
        <input
          type="text"
          value={video.title}
          onChange={(e) => setVideo({ ...video, title: e.target.value })}
          onBlur={(e) => saveMeta({ title: e.target.value })}
          className="w-full bg-transparent text-2xl font-bold text-txt-primary outline-none border-b border-transparent hover:border-border focus:border-pink-500"
        />
        <p className="mt-1 text-xs text-txt-muted">
          Durasi: <span className={totalDuration > MAX_DURATION ? "text-red-500 font-semibold" : ""}>{totalDuration.toFixed(1)}</span> / {MAX_DURATION}s · {video.clips.length} clip
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Kolom kiri & tengah: editor */}
        <div className="lg:col-span-2 space-y-5">
          {/* Upload */}
          <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
              <Upload size={14} /> Upload Video / Foto
            </h2>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*"
              multiple
              onChange={(e) => handleFilePick(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || totalDuration >= MAX_DURATION}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm font-medium text-txt-secondary hover:border-pink-400 hover:text-pink-600 disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 size={16} className="animate-spin" /> Uploading...</>
              ) : (
                <><Upload size={16} /> Klik atau drag-drop file (video .mp4, foto .jpg/.png)</>
              )}
            </button>
            <p className="mt-2 text-xs text-txt-muted">
              Max 128MB per video, 15MB per foto. Otomatis resize ke 1080×1920 (9:16).
            </p>
          </div>

          {/* Clips list */}
          <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
              <Video size={14} /> Urutan Clip ({video.clips.length})
            </h2>
            {video.clips.length === 0 ? (
              <p className="py-8 text-center text-sm text-txt-muted">Belum ada clip. Upload dulu di atas.</p>
            ) : (
              <div className="space-y-2">
                {video.clips.map((clip, i) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    index={i}
                    total={video.clips.length}
                    onMove={moveClip}
                    onUpdate={(data) => updateClip(clip.id, data)}
                    onDelete={() => deleteClip(clip.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Caption & Hashtags */}
          <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
                <Type size={14} /> Caption & Hashtag
              </h2>
              <button
                onClick={generateCaption}
                disabled={generatingCaption}
                className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 hover:underline disabled:opacity-50"
              >
                {generatingCaption ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                AI Generate
              </button>
            </div>
            <textarea
              value={video.caption || ""}
              onChange={(e) => setVideo({ ...video, caption: e.target.value })}
              onBlur={(e) => saveMeta({ caption: e.target.value })}
              placeholder="Caption menarik untuk TikTok (max 150 char, bahasa santai + hook di awal)..."
              rows={3}
              className="input w-full resize-none text-sm"
              maxLength={300}
            />
            <p className="mt-1 text-xs text-txt-muted">{(video.caption || "").length}/300 karakter</p>

            <div className="mt-3">
              <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-txt-secondary">
                <Hash size={11} /> Hashtag (pisah dengan koma atau spasi)
              </div>
              <input
                type="text"
                defaultValue={video.hashtags.join(", ")}
                onBlur={(e) => {
                  const tags = e.target.value
                    .split(/[\s,]+/)
                    .map((t) => t.trim().replace(/^#/, "").toLowerCase())
                    .filter((t) => t.length >= 2 && t.length <= 30)
                    .slice(0, 15);
                  saveMeta({ hashtags: tags });
                }}
                placeholder="fyp, hukum, bandung, pidana, ..."
                className="input w-full text-sm"
              />
              {video.hashtags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {video.hashtags.map((t) => (
                    <span key={t} className="rounded-full bg-pink-50 px-2 py-0.5 text-xs text-pink-700">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kolom kanan: backsong + render + publish */}
        <div className="space-y-5">
          {/* Preview video (kalau sudah dirender) */}
          {video.renderedUrl && (
            <div className="rounded-[12px] border border-border bg-surface p-3 shadow-card">
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-goto-green">
                <CheckCircle size={11} /> Hasil Render
              </p>
              <video
                src={video.renderedUrl}
                controls
                className="w-full rounded-lg"
              />
              <p className="mt-1 text-xs text-txt-muted">
                {video.durationSec?.toFixed(1)}s
              </p>
            </div>
          )}

          {/* Error banner */}
          {video.renderStatus === "failed" && video.renderError && (
            <div className="rounded-[12px] border border-red-300 bg-red-50 p-3 text-xs text-red-800">
              <p className="font-semibold flex items-center gap-1"><AlertCircle size={12} /> Render Gagal</p>
              <p className="mt-1 break-words">{video.renderError}</p>
            </div>
          )}

          {/* Backsong */}
          <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
              <Music size={12} /> Backsong
            </h3>
            <select
              value={video.backsongId || ""}
              onChange={(e) => saveMeta({ backsongId: e.target.value || null })}
              className="input w-full text-sm"
            >
              <option value="">— Tanpa backsong —</option>
              {backsongs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.durationSec.toFixed(0)}s{b.mood ? ` · ${b.mood}` : ""})
                </option>
              ))}
            </select>
            {video.backsongId && (
              <div className="mt-3">
                <label className="text-xs text-txt-secondary">Volume: {(video.backsongVolume * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={video.backsongVolume}
                  onChange={(e) => setVideo({ ...video, backsongVolume: parseFloat(e.target.value) })}
                  onMouseUp={(e) => saveMeta({ backsongVolume: parseFloat((e.target as HTMLInputElement).value) })}
                  onTouchEnd={(e) => saveMeta({ backsongVolume: parseFloat((e.target as HTMLInputElement).value) })}
                  className="w-full"
                />
              </div>
            )}
            <Link href="/panel/tiktok/backsongs" className="mt-2 inline-block text-xs text-pink-600 hover:underline">
              Kelola backsong →
            </Link>
          </div>

          {/* Actions */}
          <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-txt-muted">Aksi</h3>

            <button
              onClick={triggerRender}
              disabled={!canRender || rendering || totalDuration === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-40"
            >
              {rendering || video.renderStatus === "queued" || video.renderStatus === "rendering" ? (
                <><Loader2 size={14} className="animate-spin" /> {video.renderStatus === "rendering" ? "Rendering..." : "Queued..."}</>
              ) : video.renderStatus === "rendered" ? (
                <><RotateCw size={14} /> Render Ulang</>
              ) : (
                <><PlayCircle size={14} /> Render Video</>
              )}
            </button>

            <button
              onClick={triggerPublish}
              disabled={!canPublish || publishing}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border-2 border-pink-600 bg-white px-4 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-40"
            >
              {publishing ? (
                <><Loader2 size={14} className="animate-spin" /> Publishing...</>
              ) : (
                <><Send size={14} /> Publish ke TikTok</>
              )}
            </button>

            {video.publishStatus === "draft_tiktok" && (
              <p className="mt-2 rounded bg-yellow-50 px-2 py-1.5 text-xs text-yellow-800">
                ✓ Upload sukses ke TikTok inbox. Buka app TikTok untuk finalize.
              </p>
            )}
            {video.publishError && (
              <p className="mt-2 rounded bg-red-50 px-2 py-1.5 text-xs text-red-800 break-words">
                {video.publishError}
              </p>
            )}
          </div>

          {saving && (
            <div className="flex items-center gap-1 text-xs text-txt-muted">
              <Loader2 size={10} className="animate-spin" /> Menyimpan...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Clip Card (inline component)
// ────────────────────────────────────────────

function ClipCard({
  clip, index, total, onMove, onUpdate, onDelete,
}: {
  clip: Clip;
  index: number;
  total: number;
  onMove: (i: number, dir: -1 | 1) => void;
  onUpdate: (data: Partial<Clip>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState(clip.textOverlay || "");
  const [duration, setDuration] = useState(clip.durationSec);

  return (
    <div className="rounded-lg border border-border bg-surface-secondary/40">
      <div className="flex items-start gap-2 p-2">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="text-xs font-mono text-txt-muted">#{index + 1}</span>
          <button onClick={() => onMove(index, -1)} disabled={index === 0} className="text-txt-muted hover:text-txt-primary disabled:opacity-30">
            <ChevronUp size={14} />
          </button>
          <button onClick={() => onMove(index, 1)} disabled={index === total - 1} className="text-txt-muted hover:text-txt-primary disabled:opacity-30">
            <ChevronDown size={14} />
          </button>
        </div>

        <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded bg-surface-dark">
          {clip.type === "image" ? (
            <img src={clip.sourceUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <video src={clip.sourceUrl} className="h-full w-full object-cover" preload="metadata" muted />
          )}
          <div className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[10px] text-white">
            {clip.type === "video" ? <Video size={10} /> : <ImageIcon size={10} />}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <label className="text-xs text-txt-muted">Durasi</label>
            <input
              type="number"
              min={0.5}
              max={30}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 0.5)}
              onBlur={() => onUpdate({ durationSec: duration })}
              className="w-16 rounded border border-border bg-surface px-1.5 py-0.5 text-xs"
            />
            <span className="text-xs text-txt-muted">s</span>
            {clip.type === "image" && (
              <label className="flex items-center gap-1 text-xs text-txt-secondary">
                <input
                  type="checkbox"
                  checked={clip.kenBurns}
                  onChange={(e) => onUpdate({ kenBurns: e.target.checked })}
                />
                Zoom
              </label>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-xs text-pink-600 hover:underline"
          >
            {expanded ? "Sembunyikan" : "Text & Transisi"}
          </button>
        </div>

        <button onClick={onDelete} className="text-red-500 hover:text-red-700">
          <Trash2 size={14} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-2 py-2 space-y-2">
          <div>
            <label className="text-xs text-txt-muted">Text Overlay</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => onUpdate({ textOverlay: text || null })}
              placeholder="Tulis teks caption..."
              maxLength={120}
              className="input mt-1 w-full text-xs"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-txt-muted">Posisi Text</label>
              <select
                value={clip.textPosition || "bottom"}
                onChange={(e) => onUpdate({ textPosition: e.target.value })}
                className="input mt-1 w-full text-xs"
              >
                <option value="top">Atas</option>
                <option value="center">Tengah</option>
                <option value="bottom">Bawah</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-txt-muted">Transisi Masuk</label>
              <select
                value={clip.transition || "none"}
                onChange={(e) => onUpdate({ transition: e.target.value })}
                className="input mt-1 w-full text-xs"
              >
                <option value="none">Tanpa transisi</option>
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
