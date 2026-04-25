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
  textX: number | null;
  textY: number | null;
  textFontSize: number | null;
  textRotation: number | null;
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

import VideoCanvas, { SelectedLayer, OverlayPos, SubtitlePos, ClipData } from "./VideoCanvas";
import TimelinePanel, { TimelineLayer } from "./TimelinePanel";
import LayerInspector from "./LayerInspector";

interface Video {
  id: string;
  title: string;
  caption: string | null;
  hashtags: string[];
  backsongId: string | null;
  backsongVolume: number;
  frameStyle: string;
  breakingText: string | null;
  // Custom overlay (when frameStyle === "custom")
  overlayImageUrl: string | null;
  overlayX: number;
  overlayY: number;
  overlayScale: number;
  overlayRotation: number;
  overlayOpacity: number;
  // Subtitle config
  subtitleEnabled: boolean;
  subtitleY: number;
  subtitleFontSize: number;
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

const FRAME_STYLES: Array<{ value: string; label: string; desc: string; icon: string }> = [
  { value: "none", label: "Tanpa Frame", desc: "Video polos tanpa dekorasi", icon: "⬜" },
  { value: "ticker-news", label: "News Ticker", desc: "Bar merah bawah + badge LIVE + brand JHB", icon: "🔴" },
  { value: "brand-green", label: "Brand JHB Green", desc: "Border hijau 12px + handle TikTok", icon: "🟢" },
  { value: "breaking-news", label: "Breaking News", desc: "Badge BREAKING merah atas + ticker bawah", icon: "⚡" },
  { value: "minimal", label: "Minimal", desc: "Border putih tipis 4px — simpel elegan", icon: "▫️" },
  { value: "lower-third", label: "Lower Third (TV Style)", desc: "Judul + source di bawah seperti TV news", icon: "📺" },
  { value: "custom", label: "Custom Overlay (PNG)", desc: "Upload PNG sendiri — drag untuk posisikan, resize, rotate", icon: "🎨" },
];

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

  // NEW: Unified editor state
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<SelectedLayer>({ kind: "none" });
  const [subtitlePreviewText, setSubtitlePreviewText] = useState("Contoh subtitle — akan auto-generate dari audio");

  // Timeline layer visibility & lock (UI-only state, doesn't affect render)
  const [layerVisibility, setLayerVisibility] = useState<Record<TimelineLayer, boolean>>({
    background: true, text: true, overlay: true, subtitle: true,
  });
  const [layerLock, setLayerLock] = useState<Record<TimelineLayer, boolean>>({
    background: false, text: false, overlay: false, subtitle: false,
  });

  const fetchVideo = useCallback(async () => {
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}`);
      const json = await res.json();
      if (json.success) {
        setVideo(json.data);
        // Auto-select first clip jika belum ada yang dipilih
        setSelectedClipId((current) => {
          if (current && json.data.clips.some((c: Clip) => c.id === current)) return current;
          return json.data.clips[0]?.id || null;
        });
      } else {
        showError(json.error || "Gagal memuat video");
      }
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

  // Upload custom overlay PNG
  const [uploadingOverlay, setUploadingOverlay] = useState(false);
  const uploadOverlay = async (file: File) => {
    setUploadingOverlay(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "image");
      const up = await fetch("/api/tiktok/upload", { method: "POST", body: fd });
      const upJson = await up.json();
      if (!up.ok || !upJson.success) {
        console.error("[OVERLAY UPLOAD] failed", upJson);
        throw new Error(upJson.error || `Upload gagal (HTTP ${up.status})`);
      }
      const uploadedUrl = upJson.data?.url;
      if (!uploadedUrl) {
        throw new Error("Server tidak return URL — response kosong");
      }
      console.log("[OVERLAY UPLOAD] success:", uploadedUrl);

      // Save URL to video metadata + switch to custom frame style
      const saveRes = await fetch(`/api/tiktok/videos/${videoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overlayImageUrl: uploadedUrl,
          frameStyle: "custom",
        }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson.success) {
        console.error("[OVERLAY SAVE] failed", saveJson);
        throw new Error(`Upload berhasil tapi gagal save ke DB: ${saveJson.error || `HTTP ${saveRes.status}`}`);
      }
      setVideo(saveJson.data);
      setSelectedLayer({ kind: "overlay" });
      success(`Overlay "${file.name}" terupload & siap di-drag`);
    } catch (err) {
      console.error("[OVERLAY UPLOAD] error:", err);
      showError(err instanceof Error ? err.message : "Upload gagal");
    }
    setUploadingOverlay(false);
  };

  const removeOverlay = async () => {
    await saveMeta({ overlayImageUrl: null });
  };

  // ─── Multiple PNG overlays (NEW) ──────────────────────────────────────
  const [multiOverlays, setMultiOverlays] = useState<Array<{
    id: string; imageUrl: string; x: number; y: number; scale: number;
    rotation: number; opacity: number; order: number; label?: string | null;
  }>>([]);

  const fetchMultiOverlays = useCallback(async () => {
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}/overlays`);
      const json = await res.json();
      if (json.success) setMultiOverlays(json.data || []);
    } catch { /* ignore */ }
  }, [videoId]);

  useEffect(() => {
    if (videoId) fetchMultiOverlays();
  }, [videoId, fetchMultiOverlays]);

  const addMultiOverlay = async (file: File) => {
    try {
      // Step 1: upload file
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "image");
      const up = await fetch("/api/tiktok/upload", { method: "POST", body: fd });
      const upJson = await up.json();
      if (!up.ok || !upJson.success) {
        throw new Error(upJson.error || "Upload gagal");
      }
      const uploadedUrl = upJson.data?.url;

      // Step 2: create overlay record (default position center)
      const createRes = await fetch(`/api/tiktok/videos/${videoId}/overlays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadedUrl,
          x: 0.5,
          y: 0.5,
          scale: 1,
          rotation: 0,
          opacity: 1,
          label: file.name.slice(0, 40),
        }),
      });
      const createJson = await createRes.json();
      if (!createJson.success) throw new Error(createJson.error || "Gagal tambah overlay");

      success(`Overlay "${file.name}" ditambahkan`);
      fetchMultiOverlays();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error");
    }
  };

  const removeMultiOverlay = async (id: string) => {
    const ok = await confirm({ message: "Hapus overlay ini?", variant: "danger", title: "Konfirmasi" });
    if (!ok) return;
    try {
      const res = await fetch(`/api/tiktok/videos/${videoId}/overlays/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        success("Overlay dihapus");
        fetchMultiOverlays();
      } else {
        showError(json.error || "Gagal hapus");
      }
    } catch {
      showError("Error");
    }
  };

  // Debounced position update — kalau drag cepat, jangan spam API
  const overlaySaveTimer = useRef<NodeJS.Timeout | null>(null);
  const clipTextSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const subtitleSaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounced text position update (while dragging text overlay on canvas)
  const updateTextPosition = (clipId: string, xPct: number, yPct: number) => {
    if (!video) return;
    setVideo({
      ...video,
      clips: video.clips.map((c) => c.id === clipId ? { ...c, textX: xPct, textY: yPct } : c),
    });
    if (clipTextSaveTimer.current) clearTimeout(clipTextSaveTimer.current);
    clipTextSaveTimer.current = setTimeout(() => {
      updateClip(clipId, { textX: xPct, textY: yPct });
    }, 400);
  };

  // Update subtitle pos (debounced)
  const updateSubtitle = (patch: Partial<SubtitlePos>) => {
    if (!video) return;
    const next = {
      subtitleY: patch.y ?? video.subtitleY,
      subtitleFontSize: patch.fontSize ?? video.subtitleFontSize,
      subtitleEnabled: patch.show ?? video.subtitleEnabled,
    };
    setVideo({ ...video, ...next });
    if (subtitleSaveTimer.current) clearTimeout(subtitleSaveTimer.current);
    subtitleSaveTimer.current = setTimeout(() => {
      saveMeta(next);
    }, 400);
  };

  const updateOverlayPosition = (pos: OverlayPos) => {
    if (!video) return;
    // Optimistic UI update
    setVideo({
      ...video,
      overlayX: pos.x,
      overlayY: pos.y,
      overlayScale: pos.scale,
      overlayRotation: pos.rotation,
      overlayOpacity: pos.opacity,
    });
    // Debounce server save (300ms after last change)
    if (overlaySaveTimer.current) clearTimeout(overlaySaveTimer.current);
    overlaySaveTimer.current = setTimeout(() => {
      saveMeta({
        overlayX: pos.x,
        overlayY: pos.y,
        overlayScale: pos.scale,
        overlayRotation: pos.rotation,
        overlayOpacity: pos.opacity,
      });
    }, 400);
  };

  // Auto-select overlay layer when user uploads custom PNG
  useEffect(() => {
    if (video?.frameStyle === "custom" && video?.overlayImageUrl && selectedLayer.kind === "none") {
      setSelectedLayer({ kind: "overlay" });
    }
  }, [video?.frameStyle, video?.overlayImageUrl, selectedLayer.kind]);

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ═══════════════════════════════════════════════════
            KOLOM KIRI — Clip list + Upload (3/12)
            ═══════════════════════════════════════════════════ */}
        <div className="space-y-4 lg:col-span-3">
          {/* Upload */}
          <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-txt-muted">
              <Upload size={12} /> Upload
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-4 text-xs font-medium text-txt-secondary hover:border-pink-400 hover:text-pink-600 disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 size={14} className="animate-spin" /> Uploading...</>
              ) : (
                <><Upload size={14} /> Video / Foto</>
              )}
            </button>
            <p className="mt-1.5 text-[10px] text-txt-muted">
              Max 128MB (video), 15MB (foto)
            </p>
          </div>

          {/* Clips list */}
          <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-txt-muted">
              <span className="flex items-center gap-2"><Video size={12} /> Clips</span>
              <span className="text-[10px] text-txt-secondary">
                {video.clips.length} · {totalDuration.toFixed(1)}s
              </span>
            </h2>
            {video.clips.length === 0 ? (
              <p className="py-6 text-center text-xs text-txt-muted">Belum ada clip</p>
            ) : (
              <div className="space-y-1.5">
                {video.clips.map((clip, i) => (
                  <ClipThumb
                    key={clip.id}
                    clip={clip}
                    index={i}
                    total={video.clips.length}
                    active={selectedClipId === clip.id}
                    onSelect={() => {
                      setSelectedClipId(clip.id);
                      setSelectedLayer({ kind: "none" });
                    }}
                    onMove={moveClip}
                    onDelete={() => deleteClip(clip.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Frame Style picker (compact) */}
          <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-txt-muted">
              🎞 Frame
            </h2>
            <select
              value={video.frameStyle || "none"}
              onChange={(e) => saveMeta({ frameStyle: e.target.value })}
              className="input w-full text-xs"
            >
              {FRAME_STYLES.map((s) => (
                <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
              ))}
            </select>
            {video.frameStyle === "breaking-news" && (
              <input
                type="text"
                value={video.breakingText || ""}
                onChange={(e) => setVideo({ ...video, breakingText: e.target.value })}
                onBlur={(e) => saveMeta({ breakingText: e.target.value || null })}
                placeholder="Teks breaking..."
                maxLength={80}
                className="input mt-2 w-full text-xs"
              />
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            KOLOM TENGAH — Unified Video Canvas (6/12)
            ═══════════════════════════════════════════════════ */}
        <div className="lg:col-span-6">
          <div className="sticky top-4 rounded-[12px] border border-border bg-surface p-4 shadow-card">
            <VideoCanvas
              selectedClip={
                video.clips.find((c) => c.id === selectedClipId) || video.clips[0] || null
              }
              // Overlay URL selalu ditampilkan kalau ada (tidak bergantung frameStyle).
              // frameStyle "custom" cuma kontrol apakah overlay ikut masuk render FFmpeg.
              overlayUrl={video.overlayImageUrl}
              overlayPos={{
                x: video.overlayX,
                y: video.overlayY,
                scale: video.overlayScale,
                rotation: video.overlayRotation,
                opacity: video.overlayOpacity,
              }}
              subtitlePreview={subtitlePreviewText}
              subtitlePos={{
                y: video.subtitleY,
                fontSize: video.subtitleFontSize,
                show: video.subtitleEnabled,
              }}
              selected={selectedLayer}
              onSelectLayer={setSelectedLayer}
              onTextMove={updateTextPosition}
              onOverlayChange={updateOverlayPosition}
              onSubtitleMove={(y) => updateSubtitle({ y })}
              onUploadOverlay={uploadOverlay}
              onRemoveOverlay={removeOverlay}
              uploadingOverlay={uploadingOverlay}
              renderedUrl={video.renderStatus === "rendered" ? video.renderedUrl : null}
              multiOverlays={multiOverlays}
              onAddMultiOverlay={addMultiOverlay}
              onRemoveMultiOverlay={removeMultiOverlay}
              onAddTextLayer={() => {
                if (selectedClipId) {
                  setSelectedLayer({ kind: "text", clipId: selectedClipId });
                }
              }}
              onAddSubtitleLayer={() => {
                updateSubtitle({ show: !video.subtitleEnabled });
                setSelectedLayer({ kind: "subtitle" });
              }}
            />

            {/* Render + Publish buttons — stacked below canvas */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <button
                onClick={triggerRender}
                disabled={!canRender || rendering || totalDuration === 0}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-40"
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
                className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-pink-600 bg-white px-4 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-40"
              >
                {publishing ? (
                  <><Loader2 size={14} className="animate-spin" /> Publishing...</>
                ) : (
                  <><Send size={14} /> Publish TikTok</>
                )}
              </button>
            </div>

            {/* ─── TIMELINE PANEL ─── */}
            <div className="mt-4 border-t border-border pt-4">
              <TimelinePanel
                clips={video.clips.map((c) => ({
                  id: c.id,
                  order: c.order,
                  type: c.type,
                  durationSec: c.durationSec,
                  textOverlay: c.textOverlay,
                  sourceUrl: c.sourceUrl,
                }))}
                selectedClipId={selectedClipId}
                onSelectClip={(id) => {
                  setSelectedClipId(id);
                  // Auto-select text layer if clip has text
                  const c = video.clips.find((cc) => cc.id === id);
                  if (c?.textOverlay) setSelectedLayer({ kind: "text", clipId: id });
                }}
                onMoveClip={(id, direction) => {
                  const idx = video.clips.findIndex((c) => c.id === id);
                  if (idx >= 0) moveClip(idx, direction);
                }}
                hasOverlay={!!video.overlayImageUrl}
                subtitleSegments={[]}
                layerVisibility={layerVisibility}
                layerLock={layerLock}
                onToggleVisibility={(layer) =>
                  setLayerVisibility((prev) => ({ ...prev, [layer]: !prev[layer] }))
                }
                onToggleLock={(layer) =>
                  setLayerLock((prev) => ({ ...prev, [layer]: !prev[layer] }))
                }
                selectedLayer={
                  selectedLayer.kind === "text" ? "text"
                  : selectedLayer.kind === "overlay" ? "overlay"
                  : selectedLayer.kind === "subtitle" ? "subtitle"
                  : "none"
                }
                onSelectLayer={(layer) => {
                  if (layer === "background") {
                    setSelectedLayer({ kind: "none" });
                  } else if (layer === "text" && selectedClipId) {
                    setSelectedLayer({ kind: "text", clipId: selectedClipId });
                  } else if (layer === "overlay") {
                    setSelectedLayer({ kind: "overlay" });
                  } else if (layer === "subtitle") {
                    setSelectedLayer({ kind: "subtitle" });
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            KOLOM KANAN — Layer Inspector + Backsong + Caption (3/12)
            ═══════════════════════════════════════════════════ */}
        <div className="space-y-4 lg:col-span-3">
          {/* Layer Inspector — context-sensitive editing panel */}
          <LayerInspector
            selected={selectedLayer}
            selectedClip={
              (video.clips.find((c) => c.id === selectedClipId) || video.clips[0] || null) as ClipData | null
            }
            onTextChange={(clipId, patch) => {
              if (!video) return;
              setVideo({
                ...video,
                clips: video.clips.map((c) => c.id === clipId ? { ...c, ...patch } : c),
              });
              if (clipTextSaveTimer.current) clearTimeout(clipTextSaveTimer.current);
              clipTextSaveTimer.current = setTimeout(() => {
                updateClip(clipId, patch);
              }, 400);
            }}
            overlayPos={{
              x: video.overlayX,
              y: video.overlayY,
              scale: video.overlayScale,
              rotation: video.overlayRotation,
              opacity: video.overlayOpacity,
            }}
            onOverlayChange={updateOverlayPosition}
            subtitlePos={{
              y: video.subtitleY,
              fontSize: video.subtitleFontSize,
              show: video.subtitleEnabled,
            }}
            subtitlePreview={subtitlePreviewText}
            onSubtitleChange={updateSubtitle}
            onSubtitlePreviewChange={setSubtitlePreviewText}
          />

          {/* Hasil Render (kalau ada) */}
          {video.renderedUrl && (
            <div className="rounded-[12px] border border-goto-green/40 bg-surface p-3 shadow-card">
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-goto-green">
                <CheckCircle size={11} /> Hasil Render Terakhir
              </p>
              <video src={video.renderedUrl} controls className="w-full rounded-lg" />
              <p className="mt-1 text-xs text-txt-muted">{video.durationSec?.toFixed(1)}s</p>
            </div>
          )}

          {/* Error banner */}
          {video.renderStatus === "failed" && video.renderError && (
            <div className="rounded-[12px] border border-red-300 bg-red-50 p-3 text-xs text-red-800">
              <p className="font-semibold flex items-center gap-1"><AlertCircle size={12} /> Render Gagal</p>
              <p className="mt-1 break-words">{video.renderError}</p>
            </div>
          )}

          {/* Backsong (collapsible) */}
          <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-txt-muted">
              <Music size={12} /> Backsong
            </h3>
            <select
              value={video.backsongId || ""}
              onChange={(e) => saveMeta({ backsongId: e.target.value || null })}
              className="input w-full text-xs"
            >
              <option value="">— Tanpa backsong —</option>
              {backsongs.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.durationSec.toFixed(0)}s)
                </option>
              ))}
            </select>
            {video.backsongId && (
              <div className="mt-2">
                <label className="text-[10px] text-txt-secondary">Volume: {(video.backsongVolume * 100).toFixed(0)}%</label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={video.backsongVolume}
                  onChange={(e) => setVideo({ ...video, backsongVolume: parseFloat(e.target.value) })}
                  onMouseUp={(e) => saveMeta({ backsongVolume: parseFloat((e.target as HTMLInputElement).value) })}
                  className="w-full accent-pink-600"
                />
              </div>
            )}
            <Link href="/panel/tiktok/backsongs" className="mt-1 inline-block text-[10px] text-pink-600 hover:underline">
              Kelola backsong →
            </Link>
          </div>

          {/* Caption & Hashtags */}
          <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-txt-muted">
                <Type size={12} /> Caption
              </h3>
              <button
                onClick={generateCaption}
                disabled={generatingCaption}
                className="inline-flex items-center gap-1 text-[10px] font-semibold text-pink-600 hover:underline disabled:opacity-50"
              >
                {generatingCaption ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                AI
              </button>
            </div>
            <textarea
              value={video.caption || ""}
              onChange={(e) => setVideo({ ...video, caption: e.target.value })}
              onBlur={(e) => saveMeta({ caption: e.target.value })}
              placeholder="Caption untuk TikTok..."
              rows={3}
              className="input w-full resize-none text-xs"
              maxLength={300}
            />
            <p className="mt-0.5 text-[10px] text-txt-muted">{(video.caption || "").length}/300</p>

            <div className="mt-2">
              <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-txt-secondary">
                <Hash size={9} /> Hashtag
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
                placeholder="fyp, hukum, bandung..."
                className="input w-full text-xs"
              />
              {video.hashtags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {video.hashtags.map((t) => (
                    <span key={t} className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] text-pink-700">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Publish status */}
          {video.publishStatus === "draft_tiktok" && (
            <p className="rounded bg-yellow-50 px-2 py-1.5 text-[10px] text-yellow-800">
              ✓ Upload sukses ke TikTok inbox. Buka app untuk finalize.
            </p>
          )}
          {video.publishError && (
            <p className="rounded bg-red-50 px-2 py-1.5 text-[10px] text-red-800 break-words">
              {video.publishError}
            </p>
          )}

          {saving && (
            <div className="flex items-center gap-1 text-[10px] text-txt-muted">
              <Loader2 size={9} className="animate-spin" /> Menyimpan...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Clip Thumb — compact left-sidebar item (click to select clip for canvas)
// ────────────────────────────────────────────

function ClipThumb({
  clip, index, total, active, onSelect, onMove, onDelete,
}: {
  clip: Clip;
  index: number;
  total: number;
  active: boolean;
  onSelect: () => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative flex cursor-pointer gap-2 rounded-lg border p-2 transition-colors ${
        active ? "border-pink-600 bg-pink-50 ring-2 ring-pink-600/20" : "border-border bg-surface hover:border-pink-300 hover:bg-pink-50/30"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 overflow-hidden rounded bg-black" style={{ width: 48, height: 64 }}>
        {clip.type === "video" ? (
          <video src={clip.sourceUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.sourceUrl} alt="" className="h-full w-full object-cover" />
        )}
        {active && (
          <div className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-pink-600 ring-2 ring-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        <div>
          <p className="text-[11px] font-semibold text-txt-primary">#{index + 1} · {clip.type}</p>
          <p className="text-[10px] text-txt-muted">{clip.durationSec.toFixed(1)}s</p>
          {clip.textOverlay && (
            <p className="truncate text-[10px] text-pink-600">📝 {clip.textOverlay}</p>
          )}
        </div>
      </div>

      {/* Controls (visible on hover or active) */}
      <div className={`flex flex-col items-center gap-0.5 ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
        <button
          onClick={(e) => { e.stopPropagation(); onMove(index, -1); }}
          disabled={index === 0}
          className="rounded p-0.5 text-txt-muted hover:bg-surface-tertiary hover:text-txt-primary disabled:opacity-30"
          title="Naik"
        >
          <ChevronUp size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMove(index, 1); }}
          disabled={index === total - 1}
          className="rounded p-0.5 text-txt-muted hover:bg-surface-tertiary hover:text-txt-primary disabled:opacity-30"
          title="Turun"
        >
          <ChevronDown size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Hapus clip ini?")) onDelete();
          }}
          className="rounded p-0.5 text-red-400 hover:bg-red-50 hover:text-red-600"
          title="Hapus"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Clip Card (legacy — kept for reference, not used in new layout)
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

        <div className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded bg-surface-dark group">
          {clip.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clip.sourceUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <video
              src={`${clip.sourceUrl}#t=0.5`}
              className="h-full w-full object-cover"
              preload="auto"
              muted
              playsInline
              // Force load first frame as poster
              onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.5; }}
            />
          )}
          {clip.type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  const preview = e.currentTarget.closest(".group")?.querySelector("video");
                  if (!preview) return;
                  if (preview.paused) { preview.play(); } else { preview.pause(); }
                }}
                className="rounded-full bg-white/90 p-1.5 text-black hover:bg-white"
                title="Play preview"
              >
                <PlayCircle size={18} />
              </button>
            </div>
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
        <div className="border-t border-border px-2 py-2 space-y-3">
          <div>
            <label className="text-xs text-txt-muted">Text Overlay</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => onUpdate({ textOverlay: text || null })}
              placeholder="Tulis teks caption... (gunakan Enter untuk subtitle multi-line)"
              maxLength={240}
              rows={2}
              className="input mt-1 w-full text-xs resize-none"
            />
            <p className="mt-0.5 text-[10px] text-txt-muted">{text.length}/240 char — max 3 baris direkomendasi</p>
          </div>

          {/* 9-position grid selector */}
          <div>
            <label className="text-xs text-txt-muted">Posisi Text (grid 3×3)</label>
            <div className="mt-1 inline-grid grid-cols-3 gap-1 rounded border border-border bg-surface p-1">
              {[
                { val: "top-left", label: "↖" },
                { val: "top", label: "↑" },
                { val: "top-right", label: "↗" },
                { val: "center-left", label: "←" },
                { val: "center", label: "•" },
                { val: "center-right", label: "→" },
                { val: "bottom-left", label: "↙" },
                { val: "bottom", label: "↓" },
                { val: "bottom-right", label: "↘" },
              ].map((p) => {
                const current = clip.textPosition || "bottom";
                // Backwards compat: "top"/"center"/"bottom" map to column center
                const normalized = current === "top" ? "top" : current === "center" ? "center" : current === "bottom" ? "bottom" : current;
                const active = p.val === normalized;
                return (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => onUpdate({ textPosition: p.val })}
                    className={`flex h-7 w-7 items-center justify-center rounded text-sm transition-colors ${
                      active ? "bg-pink-600 text-white" : "bg-surface-secondary text-txt-secondary hover:bg-surface-tertiary"
                    }`}
                    title={p.val}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-txt-muted">
              Pilih posisi: atas / tengah / bawah × kiri / tengah / kanan
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-txt-muted">Warna Text</label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="color"
                  value={clip.textColor || "#FFFFFF"}
                  onChange={(e) => onUpdate({ textColor: e.target.value })}
                  className="h-7 w-10 cursor-pointer rounded border border-border"
                />
                <input
                  type="text"
                  value={clip.textColor || "#FFFFFF"}
                  onChange={(e) => onUpdate({ textColor: e.target.value })}
                  className="input flex-1 font-mono text-xs"
                  maxLength={7}
                />
              </div>
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

          {/* Visual drag-drop editor */}
          {text && (
            <DragDropTextEditor clip={clip} text={text} onUpdate={onUpdate} />
          )}
        </div>
      )}
    </div>
  );
}

function DragDropTextEditor({
  clip,
  text,
  onUpdate,
}: {
  clip: Clip;
  text: string;
  onUpdate: (data: Partial<Clip>) => void;
}) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fontSize, setFontSize] = useState(clip.textFontSize || 54);

  // Position state (percentage 0-100)
  const hasCustomPos = typeof clip.textX === "number" && typeof clip.textY === "number";
  const xPct = hasCustomPos ? clip.textX! : presetToPercent(clip.textPosition || "bottom").x;
  const yPct = hasCustomPos ? clip.textY! : presetToPercent(clip.textPosition || "bottom").y;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));
    onUpdate({ textX: clampedX, textY: clampedY });
  };

  const onPointerUp = () => {
    setDragging(false);
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <label className="text-txt-muted">
          {hasCustomPos ? "🎯 Posisi Custom (drag)" : "📐 Posisi Preset (9-grid)"}
        </label>
        {hasCustomPos && (
          <button
            type="button"
            onClick={() => onUpdate({ textX: null, textY: null })}
            className="text-[10px] text-pink-600 hover:underline"
          >
            Reset ke preset
          </button>
        )}
      </div>
      <div
        ref={previewRef}
        className="relative aspect-[9/16] max-h-64 w-auto overflow-hidden rounded border-2 border-border bg-black select-none"
      >
        {clip.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.sourceUrl} alt="" className="h-full w-full object-cover opacity-75" draggable={false} />
        ) : (
          <video
            src={`${clip.sourceUrl}#t=0.5`}
            className="h-full w-full object-cover opacity-75"
            muted
            preload="auto"
          />
        )}

        {/* Grid overlay untuk guide */}
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute left-1/3 top-0 h-full w-px bg-white" />
          <div className="absolute left-2/3 top-0 h-full w-px bg-white" />
          <div className="absolute left-0 top-1/3 h-px w-full bg-white" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-white" />
        </div>

        {/* Draggable text */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`absolute cursor-move px-2 py-1 font-bold text-center whitespace-pre-wrap select-none transition-shadow ${
            dragging ? "ring-2 ring-pink-500 shadow-lg" : "hover:ring-1 hover:ring-pink-300"
          }`}
          style={{
            left: `${xPct}%`,
            top: `${yPct}%`,
            transform: "translate(-50%, -50%)",
            color: clip.textColor || "#FFFFFF",
            textShadow: "0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.6)",
            fontSize: `${(fontSize / 54) * 12}px`,
            lineHeight: "1.3",
            maxWidth: "85%",
            touchAction: "none",
          }}
        >
          {text}
        </div>

        {/* Position indicator badge */}
        <div className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] text-white">
          X: {xPct.toFixed(0)}% · Y: {yPct.toFixed(0)}%
        </div>
      </div>

      <p className="mt-1 text-[10px] text-txt-muted">
        💡 <strong>Drag</strong> teks untuk posisi custom. Klik ↖↑↗ di grid 3×3 di atas untuk preset cepat.
      </p>

      {/* Font size slider */}
      <div className="mt-2">
        <label className="flex items-center justify-between text-xs">
          <span className="text-txt-muted">Ukuran Font</span>
          <span className="font-mono text-txt-primary">{fontSize}px</span>
        </label>
        <input
          type="range"
          min={24}
          max={120}
          step={2}
          value={fontSize}
          onChange={(e) => setFontSize(parseInt(e.target.value))}
          onMouseUp={(e) => onUpdate({ textFontSize: parseInt((e.target as HTMLInputElement).value) })}
          onTouchEnd={(e) => onUpdate({ textFontSize: parseInt((e.target as HTMLInputElement).value) })}
          className="mt-1 w-full"
        />
      </div>
    </div>
  );
}

function presetToPercent(pos: string): { x: number; y: number } {
  // Convert preset string to x/y percentage for initial display
  const [v, h] = (() => {
    if (pos === "top") return ["top", "center"];
    if (pos === "center") return ["center", "center"];
    if (pos === "bottom") return ["bottom", "center"];
    const parts = pos.split("-");
    return parts.length === 2 ? parts : ["bottom", "center"];
  })();
  const y = v === "top" ? 10 : v === "center" ? 50 : 90;
  const x = h === "left" ? 15 : h === "right" ? 85 : 50;
  return { x, y };
}

