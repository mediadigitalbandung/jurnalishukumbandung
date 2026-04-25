"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle,
  XCircle,
  FileVideo,
  Image as ImageIcon,
  Search,
  Wand2,
  Music,
  Type,
  Film,
  Clock,
  AlertCircle,
} from "lucide-react";

interface ArticleSearch {
  id: string;
  title: string;
  slug: string;
  status: string;
  category?: { name: string } | null;
}

interface UploadedFile {
  url: string;
  type: "video" | "image";
  size: number;
  filename: string;
  sourceDurationSec?: number;
}

interface AutoChoices {
  frameStyle: string;
  backsongName: string | null;
  backsongId: string | null;
  durations: number[];
  totalDuration: number;
  subtitleSegments: number;
  captionGenerated: boolean;
  subtitleGenerated: boolean;
  renderQueued: boolean;
}

const FRAME_LABELS: Record<string, string> = {
  "ticker-news": "🔴 Ticker News (LIVE bar bawah)",
  "breaking-news": "🚨 Breaking News (banner merah)",
  "lower-third": "📛 Lower Third (badge bawah)",
  "brand-green": "🟢 Brand Green (top bar)",
  "minimal": "💎 Minimal (watermark only)",
  "none": "⬜ Tanpa frame",
  "custom": "🎨 Custom",
};

export default function TiktokAutoCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: showError } = useToast();

  // Article selection
  const [articleQuery, setArticleQuery] = useState("");
  const [articleResults, setArticleResults] = useState<ArticleSearch[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ArticleSearch | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  // Files
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Options
  const [targetDuration, setTargetDuration] = useState<number>(60);
  const [frameStyleOverride, setFrameStyleOverride] = useState<string>("auto");
  const [renderEngine, setRenderEngine] = useState<"ffmpeg" | "hyperframes">("ffmpeg");

  // Process state
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [autoResult, setAutoResult] = useState<{ videoId: string; choices: AutoChoices } | null>(null);

  // ─── Pre-fill article from query param (when navigated from article edit page) ───
  useEffect(() => {
    const articleId = searchParams?.get("articleId");
    if (articleId && !selectedArticle) {
      fetch(`/api/articles/${articleId}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.success && j.data) {
            setSelectedArticle({
              id: j.data.id,
              title: j.data.title,
              slug: j.data.slug,
              status: j.data.status,
              category: j.data.category,
            });
          }
        })
        .catch(() => {});
    }
  }, [searchParams, selectedArticle]);

  // ─── Article search (debounced) ───
  useEffect(() => {
    if (selectedArticle) return;
    if (!articleQuery.trim() || articleQuery.trim().length < 2) {
      setArticleResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/articles?status=PUBLISHED&q=${encodeURIComponent(articleQuery)}&limit=8`);
        const json = await res.json();
        if (json.success) {
          setArticleResults(json.data?.articles || json.data || []);
        }
      } catch { /* ignore */ }
      setSearching(false);
    }, 300);
  }, [articleQuery, selectedArticle]);

  // ─── File upload ───
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (uploadedFiles.length + files.length > 12) {
      showError(`Max 12 file (sekarang ${uploadedFiles.length}, mau tambah ${files.length})`);
      return;
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(files)) {
      const category = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
      if (!category) {
        showError(`Skip ${file.name}: bukan video/foto`);
        continue;
      }

      try {
        // Probe duration for videos client-side
        let sourceDurationSec: number | undefined;
        if (category === "video") {
          sourceDurationSec = await new Promise<number>((resolve) => {
            const url = URL.createObjectURL(file);
            const v = document.createElement("video");
            v.addEventListener("loadedmetadata", () => { URL.revokeObjectURL(url); resolve(v.duration || 0); });
            v.addEventListener("error", () => { URL.revokeObjectURL(url); resolve(0); });
            v.src = url;
          });
        }

        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", category);
        const up = await fetch("/api/tiktok/upload", { method: "POST", body: fd });
        const upJson = await up.json();
        if (!up.ok || !upJson.success) {
          showError(upJson.error || `Upload ${file.name} gagal`);
          continue;
        }

        newFiles.push({
          url: upJson.data.url,
          type: category,
          size: file.size,
          filename: file.name,
          sourceDurationSec,
        });
      } catch {
        showError(`Error upload ${file.name}`);
      }
    }

    setUploadedFiles([...uploadedFiles, ...newFiles]);
    setUploading(false);
  };

  const removeFile = (idx: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx));
  };

  // ─── Trigger auto-create ───
  const handleAutoCreate = async () => {
    if (!selectedArticle) {
      showError("Pilih artikel dulu");
      return;
    }
    if (uploadedFiles.length === 0) {
      showError("Upload minimal 1 file");
      return;
    }

    setCreating(true);
    setProgress("Membuat project...");

    try {
      const res = await fetch("/api/tiktok/auto-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: selectedArticle.id,
          files: uploadedFiles.map((f) => ({
            url: f.url,
            type: f.type,
            sourceDurationSec: f.sourceDurationSec,
          })),
          targetDurationSec: targetDuration,
          frameStyle: frameStyleOverride === "auto" ? undefined : frameStyleOverride,
          renderEngine,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setAutoResult({ videoId: json.data.videoId, choices: json.data.autoChoices });
      success("Video dibuat otomatis! Render sedang berjalan...");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Gagal");
    }
    setCreating(false);
    setProgress(null);
  };

  // ─── Auto-redirect to editor after creation ───
  useEffect(() => {
    if (!autoResult) return;
    const t = setTimeout(() => router.push(`/panel/tiktok/${autoResult.videoId}/edit`), 4000);
    return () => clearTimeout(t);
  }, [autoResult, router]);

  // ─── Render ───
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/panel/tiktok" className="mb-2 inline-flex items-center gap-1 text-xs text-txt-secondary hover:text-txt-primary">
        <ArrowLeft size={12} /> Kembali ke TikTok
      </Link>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-txt-primary">
        <Wand2 size={24} className="text-pink-600" />
        Buat TikTok Otomatis
      </h1>
      <p className="mb-6 text-sm text-txt-secondary">
        Cukup pilih artikel + upload foto/video. Sisanya otomatis: durasi, frame style, backsong, subtitle AI, caption AI, render.
      </p>

      {/* Result banner */}
      {autoResult && (
        <div className="mb-6 rounded-[12px] border-2 border-green-300 bg-green-50 p-5 shadow-card">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-1 flex-shrink-0 text-green-600" size={28} />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-green-900">Video Berhasil Dibuat!</h2>
              <p className="mt-1 text-sm text-green-800">Render sedang berjalan di background. Akan auto-redirect ke editor dalam 4 detik...</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded bg-white p-2"><span className="text-txt-muted">Frame:</span> <strong>{FRAME_LABELS[autoResult.choices.frameStyle] || autoResult.choices.frameStyle}</strong></div>
                <div className="rounded bg-white p-2"><span className="text-txt-muted">Backsong:</span> <strong>{autoResult.choices.backsongName || "(tidak ada)"}</strong></div>
                <div className="rounded bg-white p-2"><span className="text-txt-muted">Durasi total:</span> <strong>{autoResult.choices.totalDuration}s</strong></div>
                <div className="rounded bg-white p-2"><span className="text-txt-muted">Subtitle AI:</span> <strong>{autoResult.choices.subtitleGenerated ? `✓ ${autoResult.choices.subtitleSegments} segment` : "✗"}</strong></div>
                <div className="rounded bg-white p-2"><span className="text-txt-muted">Caption AI:</span> <strong>{autoResult.choices.captionGenerated ? "✓" : "✗"}</strong></div>
                <div className="rounded bg-white p-2"><span className="text-txt-muted">Render:</span> <strong>{autoResult.choices.renderQueued ? "🔄 Berjalan" : "⏸️ Pending"}</strong></div>
              </div>
              <Link
                href={`/panel/tiktok/${autoResult.videoId}/edit`}
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Buka Editor →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Pilih Artikel */}
      <div className="mb-4 rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
          <Search size={14} /> Step 1: Pilih Artikel Sumber
        </h2>
        {selectedArticle ? (
          <div className="flex items-center justify-between rounded-lg border border-pink-300 bg-pink-50 p-3">
            <div>
              <p className="text-sm font-bold text-txt-primary">{selectedArticle.title}</p>
              <p className="text-xs text-txt-muted">{selectedArticle.category?.name || "Tanpa kategori"} · {selectedArticle.status}</p>
            </div>
            <button
              onClick={() => { setSelectedArticle(null); setArticleQuery(""); }}
              className="text-xs text-pink-600 hover:underline"
              disabled={creating}
            >
              Ganti
            </button>
          </div>
        ) : (
          <>
            <input
              type="text"
              value={articleQuery}
              onChange={(e) => setArticleQuery(e.target.value)}
              placeholder="Cari artikel published... (min 2 huruf)"
              className="input w-full text-sm"
              disabled={creating}
            />
            {searching && <p className="mt-2 text-xs text-txt-muted">Mencari...</p>}
            {articleResults.length > 0 && (
              <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface-secondary">
                {articleResults.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setSelectedArticle(a); setArticleQuery(""); setArticleResults([]); }}
                    className="w-full p-3 text-left hover:bg-pink-50"
                  >
                    <p className="text-sm font-medium text-txt-primary">{a.title}</p>
                    <p className="text-xs text-txt-muted">{a.category?.name || "—"} · {a.status}</p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Step 2: Upload Files */}
      <div className="mb-4 rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
          <Upload size={14} /> Step 2: Upload Foto / Video
        </h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={creating}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || creating || uploadedFiles.length >= 12}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border py-8 text-sm font-medium text-txt-secondary hover:border-pink-400 hover:text-pink-600 disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 size={16} className="animate-spin" /> Uploading...</>
          ) : (
            <><Upload size={16} /> Klik untuk pilih file (multi-select). Min 1, max 12. Foto & video.</>
          )}
        </button>

        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-txt-secondary">{uploadedFiles.length} file siap</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-lg border border-border bg-surface-dark overflow-hidden">
                  {f.type === "image" ? (
                    <img src={f.url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <video src={f.url} className="h-full w-full object-cover" muted preload="metadata" />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                    <span className="flex items-center gap-1">
                      {f.type === "video" ? <FileVideo size={9} /> : <ImageIcon size={9} />}
                      {(f.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                    <button onClick={() => removeFile(i)} className="text-red-300 hover:text-red-100" disabled={creating}>
                      <XCircle size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Options (collapsible advanced) */}
      <details className="mb-4 rounded-[12px] border border-border bg-surface p-5 shadow-card group">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
          <Sparkles size={14} /> Step 3: Opsi Lanjutan <span className="text-[10px] font-normal normal-case text-txt-muted ml-auto">(opsional, default sudah ideal)</span>
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-txt-secondary"><Clock size={11} className="inline mr-1" /> Target Durasi</label>
            <select
              value={targetDuration}
              onChange={(e) => setTargetDuration(parseInt(e.target.value))}
              className="input mt-1 w-full text-sm"
              disabled={creating}
            >
              <option value={15}>15 detik (snappy)</option>
              <option value={30}>30 detik</option>
              <option value={45}>45 detik</option>
              <option value={60}>60 detik (1 menit, recommended)</option>
              <option value={90}>90 detik</option>
              <option value={120}>2 menit</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-txt-secondary"><Type size={11} className="inline mr-1" /> Frame Style</label>
            <select
              value={frameStyleOverride}
              onChange={(e) => setFrameStyleOverride(e.target.value)}
              className="input mt-1 w-full text-sm"
              disabled={creating}
            >
              <option value="auto">🤖 Auto (deteksi dari kategori)</option>
              <option value="ticker-news">{FRAME_LABELS["ticker-news"]}</option>
              <option value="breaking-news">{FRAME_LABELS["breaking-news"]}</option>
              <option value="lower-third">{FRAME_LABELS["lower-third"]}</option>
              <option value="brand-green">{FRAME_LABELS["brand-green"]}</option>
              <option value="minimal">{FRAME_LABELS["minimal"]}</option>
              <option value="none">{FRAME_LABELS["none"]}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-txt-secondary"><Film size={11} className="inline mr-1" /> Render Engine</label>
            <select
              value={renderEngine}
              onChange={(e) => setRenderEngine(e.target.value as "ffmpeg" | "hyperframes")}
              className="input mt-1 w-full text-sm"
              disabled={creating}
            >
              <option value="ffmpeg">⚡ FFmpeg (cepat, default)</option>
              <option value="hyperframes">🎬 HyperFrames (premium animasi)</option>
            </select>
          </div>
        </div>
      </details>

      {/* Status info */}
      <div className="mb-4 rounded-[12px] border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
        <div className="flex items-start gap-2">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Yang otomatis dijalankan setelah klik tombol:</p>
            <ol className="mt-1 list-decimal pl-5 space-y-0.5">
              <li>Buat project TikTok dengan judul artikel</li>
              <li>Distribusi durasi clip merata supaya total {targetDuration}s</li>
              <li>Auto-pilih backsong sesuai mood artikel (kalau frame=auto)</li>
              <li>Auto-pilih frame style sesuai kategori artikel (kalau frame=auto)</li>
              <li>AI generate caption + hashtag TikTok</li>
              <li>AI generate subtitle merata di sepanjang {targetDuration} detik</li>
              <li>Foto auto-Ken Burns zoom, transisi fade antar clip</li>
              <li>Trigger render — jadi MP4 9:16 siap publish ke TikTok</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Big button */}
      <button
        onClick={handleAutoCreate}
        disabled={!selectedArticle || uploadedFiles.length === 0 || creating || uploading}
        className="flex w-full items-center justify-center gap-3 rounded-full bg-pink-600 px-6 py-4 text-base font-bold text-white shadow-lg hover:bg-pink-700 disabled:opacity-40"
      >
        {creating ? (
          <><Loader2 size={20} className="animate-spin" /> {progress || "Membuat..."}</>
        ) : (
          <><Wand2 size={20} /> Buat Video TikTok Otomatis</>
        )}
      </button>

      {/* Smart defaults preview */}
      {selectedArticle && uploadedFiles.length > 0 && !creating && !autoResult && (
        <p className="mt-3 text-center text-xs text-txt-muted">
          {uploadedFiles.length} file → akan dibagi rata jadi clip ~{(targetDuration / uploadedFiles.length).toFixed(1)}s per clip · target total {targetDuration}s · ~{Math.round(targetDuration / 6)} subtitle segment
        </p>
      )}
    </div>
  );
}
