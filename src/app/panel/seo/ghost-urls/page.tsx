"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  Ghost,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ExternalLink,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Plus,
  Search,
  Globe,
  Eye,
  Ban,
  XOctagon,
} from "lucide-react";

type GhostUrl = {
  id: string;
  slug: string;
  path: string;
  hitCount: number;
  firstHitAt: string;
  lastHitAt: string;
  lastReferer: string | null;
  fromGoogle: boolean;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolvedByName: string | null;
  resolvedArticleId: string | null;
  resolvedArticle: { id: string; title: string; slug: string } | null;
  markedDeleted: boolean;
  deletedAt: string | null;
  deletedBy: string | null;
  googleRemoveStatus: string | null;
  googleRemoveAt: string | null;
  notes: string | null;
};

type Stats = {
  open: number;
  resolved: number;
  deleted: number;
  googleReferred: number;
  totalHits: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID");
}

export default function GhostUrlsPage() {
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();

  const [items, setItems] = useState<GhostUrl[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "deleted" | "all">("open");
  const [sort, setSort] = useState<"hits" | "recent" | "first">("hits");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/seo/ghost-urls", window.location.origin);
      url.searchParams.set("status", statusFilter);
      url.searchParams.set("sort", sort);
      if (search.trim()) url.searchParams.set("q", search.trim());
      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setStats(json.data.stats);
      } else {
        showError(json.error || "Gagal load");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setLoading(false);
  }, [statusFilter, sort, search, showError]);

  useEffect(() => {
    load();
  }, [load]);

  async function markResolved(id: string, resolved: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/seo/ghost-urls/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      const json = await res.json();
      if (json.success) {
        success(resolved ? "Ditandai resolved" : "Dikembalikan ke open");
        load();
      } else {
        showError(json.error || "Gagal update");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setBusyId(null);
  }

  async function googleRemove(item: GhostUrl) {
    const ok = await confirm({
      title: "Hapus URL ini dari Google?",
      message: `Slug: ${item.slug}\n\nAkan dikirim notifikasi URL_DELETED ke Google Indexing API. URL akan hilang dari hasil pencarian Google dalam beberapa jam.\n\nSetelah ini, URL ini tidak bisa di-claim ulang sampai kamu cabut tanda 'deleted'-nya.`,
      confirmText: "Ya, hapus dari Google",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/seo/ghost-urls/${item.id}/google-remove`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        success(json.data?.message || "Berhasil dikirim ke Google");
        load();
      } else {
        showError(json.error || "Gagal kirim ke Google");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setBusyId(null);
  }

  async function undoDelete(item: GhostUrl) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/seo/ghost-urls/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markedDeleted: false }),
      });
      const json = await res.json();
      if (json.success) {
        success("Tanda deleted dicabut. URL aktif lagi (kalau di-hit, akan ke-log lagi)");
        load();
      } else {
        showError(json.error || "Gagal cabut tanda deleted");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setBusyId(null);
  }

  async function deleteItem(item: GhostUrl) {
    const ok = await confirm({
      title: "Hapus ghost URL?",
      message: `Slug: ${item.slug}\n\nEntry log akan dihapus permanen. URL tetap akan muncul lagi kalau di-hit ulang.`,
      confirmText: "Hapus",
      variant: "danger",
    });
    if (!ok) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/seo/ghost-urls/${item.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        success("Entry dihapus");
        load();
      } else {
        showError(json.error || "Gagal hapus");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setBusyId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/panel/seo"
            className="inline-flex items-center gap-1 text-sm text-txt-secondary hover:text-goto-green mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> SEO Monitor
          </Link>
          <h1 className="text-2xl font-bold text-txt-primary flex items-center gap-2">
            <Ghost className="h-7 w-7 text-goto-green" /> Ghost URLs
          </h1>
          <p className="text-sm text-txt-secondary mt-1">
            URL artikel yang pernah ada / sudah terindex Google tapi sekarang 404. Bisa di-klaim ulang dengan artikel baru biar SEO juice ga hilang.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="btn-secondary inline-flex items-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card p-4">
            <div className="text-xs text-txt-secondary">Open (404 aktif)</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{stats.open}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-txt-secondary">Sudah diklaim</div>
            <div className="text-2xl font-bold text-goto-green mt-1">{stats.resolved}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-txt-secondary flex items-center gap-1">
              <XOctagon className="h-3 w-3" /> Dihapus dari Google
            </div>
            <div className="text-2xl font-bold text-gray-700 mt-1">{stats.deleted}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-txt-secondary flex items-center gap-1">
              <Globe className="h-3 w-3" /> Open dari Google
            </div>
            <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.googleReferred}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs text-txt-secondary flex items-center gap-1">
              <Eye className="h-3 w-3" /> Total hit (open)
            </div>
            <div className="text-2xl font-bold text-txt-primary mt-1">{stats.totalHits.toLocaleString("id-ID")}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-surface-secondary rounded-full p-1 flex-wrap">
          {(["open", "resolved", "deleted", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                statusFilter === s
                  ? "bg-white shadow-sm text-txt-primary"
                  : "text-txt-secondary hover:text-txt-primary"
              }`}
            >
              {s === "open" ? "Open" : s === "resolved" ? "Resolved" : s === "deleted" ? "Dihapus" : "Semua"}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="input !py-1.5 !text-sm !w-auto"
        >
          <option value="hits">Sort: Hit terbanyak</option>
          <option value="recent">Sort: Hit terbaru</option>
          <option value="first">Sort: Pertama di-log</option>
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input
            type="text"
            placeholder="Cari slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !pl-9 !py-1.5 !text-sm w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-txt-secondary">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Memuat...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Ghost className="h-12 w-12 mx-auto text-txt-muted mb-3" />
            <p className="text-txt-secondary">
              {statusFilter === "open"
                ? "Tidak ada ghost URL yang aktif. Bagus!"
                : statusFilter === "resolved"
                ? "Belum ada ghost URL yang diklaim ulang."
                : "Belum ada ghost URL tercatat."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-secondary text-xs uppercase text-txt-secondary">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">URL / Slug</th>
                  <th className="px-4 py-3 text-center font-semibold w-20">Hit</th>
                  <th className="px-4 py-3 text-left font-semibold w-32">Hit terakhir</th>
                  <th className="px-4 py-3 text-left font-semibold w-32">Status</th>
                  <th className="px-4 py-3 text-right font-semibold w-72">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {items.map((it) => (
                  <tr
                    key={it.id}
                    className={
                      it.markedDeleted
                        ? "bg-gray-100/50"
                        : it.resolved
                        ? "bg-green-50/30"
                        : ""
                    }
                  >
                    <td className="px-4 py-3 align-top">
                      <div
                        className={`font-mono text-xs break-all ${
                          it.markedDeleted ? "line-through text-txt-muted" : "text-txt-primary"
                        }`}
                      >
                        {it.path}
                      </div>
                      {it.fromGoogle && !it.markedDeleted && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-yellow-700 bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded-full">
                          <Globe className="h-3 w-3" /> Pernah dari Google
                        </span>
                      )}
                      {it.notes && (
                        <div className="text-xs text-txt-secondary mt-1 italic">{it.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <span className="font-bold text-base text-txt-primary">{it.hitCount}</span>
                    </td>
                    <td className="px-4 py-3 align-top text-txt-secondary text-xs">
                      <div>{timeAgo(it.lastHitAt)}</div>
                      <div className="text-txt-muted">{formatDate(it.lastHitAt)}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {it.markedDeleted ? (
                        <div>
                          <span className="badge bg-gray-200 text-gray-700 border-gray-300 inline-flex items-center gap-1">
                            <XOctagon className="h-3 w-3" /> Dihapus
                          </span>
                          {it.googleRemoveStatus === "submitted" ? (
                            <div className="text-[11px] text-goto-green mt-1">
                              ✓ Sudah dikirim ke Google
                            </div>
                          ) : it.googleRemoveStatus === "failed" ? (
                            <div className="text-[11px] text-red-600 mt-1">
                              ✗ Gagal kirim ke Google
                            </div>
                          ) : null}
                          {it.deletedAt && (
                            <div className="text-[11px] text-txt-muted mt-0.5">
                              {timeAgo(it.deletedAt)}
                            </div>
                          )}
                        </div>
                      ) : it.resolved ? (
                        <div>
                          <span className="badge badge-green inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Resolved
                          </span>
                          {it.resolvedArticle && (
                            <Link
                              href={`/panel/artikel/${it.resolvedArticle.id}/edit`}
                              className="block text-xs text-goto-green hover:underline mt-1 truncate max-w-[150px]"
                              title={it.resolvedArticle.title}
                            >
                              {it.resolvedArticle.title}
                            </Link>
                          )}
                          {it.resolvedByName && (
                            <div className="text-[11px] text-txt-muted mt-0.5">
                              oleh {it.resolvedByName}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="badge bg-red-50 text-red-600 border-red-200 inline-flex items-center gap-1">
                          <Ghost className="h-3 w-3" /> Open
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <a
                          href={it.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-ghost !px-2 !py-1 inline-flex items-center gap-1 text-xs"
                          title="Buka URL (cek 404)"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        {/* Aksi untuk Open (belum resolved/deleted) */}
                        {!it.resolved && !it.markedDeleted && (
                          <>
                            <Link
                              href={`/panel/artikel/baru?reclaimSlug=${encodeURIComponent(it.slug)}`}
                              className="btn-primary !px-3 !py-1 inline-flex items-center gap-1 text-xs"
                              title="Buat artikel baru dengan slug ini"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Klaim
                            </Link>
                            <button
                              onClick={() => googleRemove(it)}
                              disabled={busyId === it.id}
                              className="!px-3 !py-1 inline-flex items-center gap-1 text-xs rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                              title="Minta Google hapus URL ini dari hasil pencarian"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Hapus dari Google
                            </button>
                            <button
                              onClick={() => markResolved(it.id, true)}
                              disabled={busyId === it.id}
                              className="btn-ghost !px-2 !py-1 inline-flex items-center gap-1 text-xs"
                              title="Tandai resolved manual (tanpa buat artikel)"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-goto-green" />
                            </button>
                          </>
                        )}

                        {/* Aksi untuk Resolved */}
                        {it.resolved && !it.markedDeleted && (
                          <button
                            onClick={() => markResolved(it.id, false)}
                            disabled={busyId === it.id}
                            className="btn-ghost !px-2 !py-1 inline-flex items-center gap-1 text-xs"
                            title="Buka kembali (unresolve)"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Aksi untuk Deleted — bisa cabut tanda */}
                        {it.markedDeleted && (
                          <button
                            onClick={() => undoDelete(it)}
                            disabled={busyId === it.id}
                            className="btn-ghost !px-2 !py-1 inline-flex items-center gap-1 text-xs"
                            title="Cabut tanda deleted (URL akan aktif lagi untuk di-log)"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Batalkan
                          </button>
                        )}

                        <button
                          onClick={() => deleteItem(it)}
                          disabled={busyId === it.id}
                          className="btn-ghost !px-2 !py-1 inline-flex items-center gap-1 text-xs text-red-600"
                          title="Hapus entry log dari panel (URL tetap 404 / status sebelumnya tidak berubah di Google)"
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
