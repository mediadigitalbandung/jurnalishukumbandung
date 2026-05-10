"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  Radio,
  Plus,
  Loader2,
  Eye,
  Calendar,
  PlayCircle,
  Trash2,
  ExternalLink,
  Edit,
  RefreshCw,
} from "lucide-react";

type LiveSession = {
  id: string;
  slug: string;
  title: string;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  viewCount: number;
  peakViewers: number;
  currentViewers: number;
  recordingUrl: string | null;
  recordingDuration: number | null;
  isPublic: boolean;
  broadcaster: { id: string; name: string };
  category: { name: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  LIVE: "bg-red-50 text-red-700 border-red-200 animate-pulse",
  ENDED: "bg-gray-100 text-gray-700 border-gray-200",
  ARCHIVED: "bg-green-50 text-green-700 border-green-200",
  FAILED: "bg-orange-50 text-orange-700 border-orange-200",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Dijadwalkan",
  LIVE: "Live",
  ENDED: "Selesai",
  ARCHIVED: "Recording",
  FAILED: "Gagal",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(s: number | null) {
  if (!s) return "—";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

export default function PanelLivePage() {
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();
  const [items, setItems] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "SCHEDULED" | "LIVE" | "ARCHIVED" | "ENDED">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/live", window.location.origin);
      url.searchParams.set("includePrivate", "true");
      url.searchParams.set("limit", "100");
      if (filter !== "all") url.searchParams.set("status", filter);
      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) setItems(json.data.items);
      else showError(json.error || "Gagal load");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setLoading(false);
  }, [filter, showError]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh kalau ada yang LIVE
  useEffect(() => {
    if (!items.some((i) => i.status === "LIVE")) return;
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [items, load]);

  async function deleteItem(item: LiveSession) {
    const ok = await confirm({
      title: "Hapus live session?",
      message: `"${item.title}"\n\nIni akan menghapus session + recording (jika ada). Tidak bisa dibatalkan.`,
      confirmText: "Hapus permanen",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/live/${item.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        success("Live session dihapus");
        load();
      } else {
        showError(json.error || "Gagal hapus");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-txt-primary flex items-center gap-2">
            <Radio className="h-7 w-7 text-red-600" /> Live Streaming
          </h1>
          <p className="text-sm text-txt-secondary mt-1">
            Broadcast langsung dari panel ke website. Recording auto-disimpan setelah selesai.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary !px-3 !py-2" title="Refresh">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
          <Link href="/panel/live/baru" className="btn-primary inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Buat Live Baru
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface-secondary rounded-full p-1 w-fit">
        {(["all", "LIVE", "SCHEDULED", "ARCHIVED", "ENDED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === s
                ? "bg-white shadow-sm text-txt-primary"
                : "text-txt-secondary hover:text-txt-primary"
            }`}
          >
            {s === "all" ? "Semua" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-goto-green" />
            <span className="text-txt-secondary">Memuat...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Radio className="h-12 w-12 mx-auto text-txt-muted mb-3" />
            <p className="text-txt-secondary mb-4">Belum ada live session</p>
            <Link href="/panel/live/baru" className="btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Buat Live Pertama
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary text-xs uppercase text-txt-secondary">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Judul</th>
                  <th className="px-4 py-3 text-left font-semibold w-32">Status</th>
                  <th className="px-4 py-3 text-left font-semibold w-40">Waktu</th>
                  <th className="px-4 py-3 text-left font-semibold w-40">Broadcaster</th>
                  <th className="px-4 py-3 text-center font-semibold w-20">Viewer</th>
                  <th className="px-4 py-3 text-right font-semibold w-64">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {items.map((it) => (
                  <tr key={it.id} className={it.status === "LIVE" ? "bg-red-50/30" : ""}>
                    <td className="px-4 py-3 align-top">
                      <Link href={`/live/${it.slug}`} className="font-semibold text-txt-primary hover:text-goto-green">
                        {it.title}
                      </Link>
                      <div className="text-xs text-txt-muted mt-0.5 flex items-center gap-2">
                        {!it.isPublic && <span className="badge bg-gray-100 text-gray-600 text-[10px]">Private</span>}
                        {it.category && <span>{it.category.name}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`badge inline-flex items-center gap-1 ${STATUS_BADGE[it.status] || ""}`}>
                        {it.status === "LIVE" && <span className="w-1.5 h-1.5 bg-current rounded-full" />}
                        {STATUS_LABEL[it.status] || it.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-txt-secondary">
                      {it.status === "SCHEDULED" && (
                        <>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {formatDate(it.scheduledAt)}
                        </>
                      )}
                      {it.status === "LIVE" && (
                        <>
                          <Radio className="h-3 w-3 inline mr-1 text-red-600" />
                          mulai {formatDate(it.startedAt)}
                        </>
                      )}
                      {(it.status === "ENDED" || it.status === "ARCHIVED") && (
                        <>
                          {formatDate(it.endedAt || it.startedAt)}
                          {it.recordingDuration && (
                            <div className="text-txt-muted">{formatDuration(it.recordingDuration)}</div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-txt-secondary">{it.broadcaster.name}</td>
                    <td className="px-4 py-3 align-top text-center">
                      {it.status === "LIVE" ? (
                        <span className="text-red-600 font-semibold">{it.currentViewers}</span>
                      ) : (
                        <span className="text-txt-muted">{it.viewCount}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex justify-end gap-1 flex-wrap">
                        {(it.status === "SCHEDULED" || it.status === "LIVE") && (
                          <Link
                            href={`/panel/live/broadcast/${it.id}`}
                            className="!px-3 !py-1 inline-flex items-center gap-1 text-xs rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                          >
                            <Radio className="h-3.5 w-3.5" />
                            {it.status === "LIVE" ? "Buka Broadcaster" : "Mulai Broadcast"}
                          </Link>
                        )}
                        {it.status === "ARCHIVED" && it.recordingUrl && (
                          <Link
                            href={`/live/${it.slug}`}
                            target="_blank"
                            className="btn-secondary !px-3 !py-1 inline-flex items-center gap-1 text-xs"
                          >
                            <PlayCircle className="h-3.5 w-3.5" />
                            Tonton
                          </Link>
                        )}
                        <Link
                          href={`/live/${it.slug}`}
                          target="_blank"
                          className="btn-ghost !px-2 !py-1"
                          title="Buka halaman publik"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          href={`/panel/live/${it.id}/edit`}
                          className="btn-ghost !px-2 !py-1"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => deleteItem(it)}
                          disabled={it.status === "LIVE"}
                          className="btn-ghost !px-2 !py-1 text-red-600 disabled:opacity-30"
                          title={it.status === "LIVE" ? "Stop dulu live-nya" : "Hapus"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
