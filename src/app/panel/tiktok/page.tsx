"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  Video,
  Plus,
  Music,
  Settings as SettingsIcon,
  Loader2,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  ExternalLink,
  Film,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface TiktokVideo {
  id: string;
  title: string;
  caption: string | null;
  renderStatus: string;
  renderedUrl: string | null;
  durationSec: number | null;
  publishStatus: string;
  tiktokUrl: string | null;
  createdAt: string;
  _count: { clips: number };
  backsong: { id: string; name: string } | null;
  article: { id: string; title: string; slug: string } | null;
}

function renderStatusBadge(status: string) {
  const map: Record<string, { label: string; class: string; icon: typeof Clock }> = {
    draft:      { label: "Draft",     class: "bg-gray-100 text-gray-700",    icon: Clock },
    queued:     { label: "Antrian",   class: "bg-blue-100 text-blue-700",    icon: Clock },
    rendering:  { label: "Render",    class: "bg-yellow-100 text-yellow-700",icon: Loader2 },
    rendered:   { label: "Siap",      class: "bg-green-100 text-green-700",  icon: CheckCircle },
    failed:     { label: "Gagal",     class: "bg-red-100 text-red-700",      icon: XCircle },
  };
  const s = map[status] || map.draft;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.class}`}>
      <Icon size={11} className={status === "rendering" ? "animate-spin" : ""} />
      {s.label}
    </span>
  );
}

function publishStatusBadge(status: string) {
  const map: Record<string, { label: string; class: string }> = {
    not_published: { label: "Belum publish",  class: "bg-gray-100 text-gray-600" },
    draft_tiktok:  { label: "Draft TikTok",   class: "bg-yellow-50 text-yellow-700" },
    published:     { label: "Published",      class: "bg-green-50 text-green-700" },
    failed:        { label: "Publish gagal",  class: "bg-red-50 text-red-700" },
  };
  const s = map[status] || map.not_published;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.class}`}>
      {s.label}
    </span>
  );
}

export default function TiktokDashboardPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();
  const [videos, setVideos] = useState<TiktokVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tiktok/videos");
      const json = await res.json();
      if (json.success) setVideos(json.data.videos || []);
    } catch {
      showError("Gagal memuat video");
    }
    setLoading(false);
  }, [showError]);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  // Auto-poll every 10s if ada video rendering
  useEffect(() => {
    const hasRendering = videos.some((v) => v.renderStatus === "queued" || v.renderStatus === "rendering");
    if (!hasRendering) return;
    const t = setInterval(loadVideos, 10000);
    return () => clearInterval(t);
  }, [videos, loadVideos]);

  const createNew = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/tiktok/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Video TikTok ${new Date().toLocaleDateString("id-ID")}` }),
      });
      const json = await res.json();
      if (json.success) {
        success("Project baru dibuat");
        router.push(`/panel/tiktok/${json.data.id}/edit`);
      } else {
        showError(json.error || "Gagal membuat project");
      }
    } catch {
      showError("Gagal membuat project");
    }
    setCreating(false);
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: "Hapus video",
      message: `Hapus video "${title}"? File hasil render juga akan dihapus. Tidak bisa dibatalkan.`,
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/tiktok/videos/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        success("Video dihapus");
        setVideos((prev) => prev.filter((v) => v.id !== id));
      } else {
        showError(json.error || "Gagal hapus");
      }
    } catch {
      showError("Gagal hapus");
    }
    setDeletingId(null);
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100">
            <Video size={24} className="text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-txt-primary">TikTok Auto-Content</h1>
            <p className="text-sm text-txt-secondary">
              Buat video TikTok otomatis dari clip video, foto, dan backsong
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/panel/tiktok/backsongs"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-txt-secondary hover:text-txt-primary"
          >
            <Music size={14} /> Backsongs
          </Link>
          <Link
            href="/panel/tiktok/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-txt-secondary hover:text-txt-primary"
          >
            <SettingsIcon size={14} /> Settings
          </Link>
          <Link
            href="/panel/tiktok/auto"
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:from-purple-700 hover:to-pink-700"
          >
            <Sparkles size={14} /> Buat Otomatis
          </Link>
          <button
            onClick={createNew}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-600 bg-white px-4 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-50"
          >
            {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Buat Manual
          </button>
        </div>
      </div>

      {/* Quick info */}
      <div className="mb-4 rounded-[12px] border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-4 text-sm text-purple-900">
        <div className="flex items-start gap-2">
          <Sparkles size={16} className="mt-0.5 flex-shrink-0 text-purple-600" />
          <div>
            <p className="font-semibold">🚀 Mode Otomatis (rekomendasi):</p>
            <p className="mt-1 text-xs">
              Klik <strong>Buat Otomatis</strong> → cukup pilih artikel + upload foto/video. Sistem auto-handle: durasi, frame style, backsong, subtitle AI, caption AI, render. <strong>3 klik selesai</strong>.
            </p>
            <p className="mt-2 font-semibold">Atau Mode Manual (full control):</p>
            <ol className="mt-1 list-decimal pl-5 space-y-0.5 text-xs">
              <li>Buat project → upload clip (video + foto) & pilih backsong</li>
              <li>Atur urutan, durasi, text overlay per clip</li>
              <li>Klik <strong>Render</strong> → server FFmpeg menggabungkan jadi 1 video 9:16 (max 60 detik)</li>
              <li>Review hasil render → klik <strong>Publish TikTok</strong> (butuh TikTok connected di Settings)</li>
            </ol>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-pink-600" />
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-[12px] border border-border bg-surface p-12 text-center shadow-card">
          <Film size={48} className="mx-auto mb-3 text-txt-muted" />
          <p className="text-sm text-txt-secondary">Belum ada project video TikTok</p>
          <button
            onClick={createNew}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-pink-600 hover:underline"
          >
            <Plus size={14} /> Buat video pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <div key={v.id} className="rounded-[12px] border border-border bg-surface shadow-card">
              {/* Thumbnail / preview */}
              <div className="relative aspect-[9/16] max-h-96 overflow-hidden rounded-t-[12px] bg-surface-dark">
                {v.renderedUrl ? (
                  <video
                    src={v.renderedUrl}
                    controls
                    className="h-full w-full object-cover"
                    preload="metadata"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center text-white/50">
                      <Film size={40} className="mx-auto mb-2" />
                      <p className="text-xs">{v._count.clips} clip(s)</p>
                      <p className="text-[10px] uppercase tracking-wider">{v.renderStatus === "rendering" ? "Rendering..." : "Belum dirender"}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="flex-1 text-sm font-semibold text-txt-primary line-clamp-2">{v.title}</h3>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {renderStatusBadge(v.renderStatus)}
                  {publishStatusBadge(v.publishStatus)}
                </div>
                <div className="mb-3 space-y-1 text-xs text-txt-secondary">
                  <div>
                    <span className="text-txt-muted">Clips:</span> {v._count.clips}
                    {v.durationSec && <> · <span className="text-txt-muted">Durasi:</span> {v.durationSec.toFixed(1)}s</>}
                  </div>
                  {v.backsong && (
                    <div className="flex items-center gap-1">
                      <Music size={10} /> {v.backsong.name}
                    </div>
                  )}
                  {v.article && (
                    <div className="truncate">
                      <span className="text-txt-muted">Artikel:</span> {v.article.title}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/panel/tiktok/${v.id}/edit`}
                    className="flex-1 rounded-full bg-pink-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-pink-700"
                  >
                    {v.renderStatus === "rendered" ? "Lihat/Edit" : "Edit"}
                  </Link>
                  {v.tiktokUrl && (
                    <a
                      href={v.tiktokUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-txt-secondary hover:bg-surface-secondary"
                    >
                      <ExternalLink size={10} /> TikTok
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(v.id, v.title)}
                    disabled={deletingId === v.id}
                    className="inline-flex items-center rounded-full border border-red-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === v.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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
