"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  Search,
  Globe,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Loader2,
  Filter,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  lastIndexedAt: string | null;
  indexStatus: string | null;
  viewCount: number;
  category: { name: string };
}

interface Stats {
  total: number;
  submitted: number;
  failed: number;
  notSubmitted: number;
}

export default function SeoMonitorPage() {
  const { success, error: showError } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, submitted: 0, failed: 0, notSubmitted: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? `&q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/seo/status?filter=${filter}&page=${page}${q}`);
      const data = await res.json();
      if (data.success) {
        setArticles(data.data.articles || []);
        setStats(data.data.stats || { total: 0, submitted: 0, failed: 0, notSubmitted: 0 });
        setTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter, page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Submit single article
  const submitSingle = async (articleId: string) => {
    setSubmittingId(articleId);
    try {
      const res = await fetch("/api/seo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds: [articleId] }),
      });
      const data = await res.json();
      if (data.success) {
        const result = data.data.results?.[0];
        if (result?.status === "submitted") {
          success("Berhasil submit ke Google Indexing API");
        } else {
          showError(result?.error || "Gagal submit");
        }
        fetchData();
      }
    } catch {
      showError("Gagal submit");
    }
    setSubmittingId(null);
  };

  // Submit batch
  const submitBatch = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/seo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        const { ok, failed } = data.data.summary;
        success(`Submit selesai: ${ok} berhasil, ${failed} gagal`);
        setSelectedIds([]);
        fetchData();
      }
    } catch {
      showError("Gagal submit batch");
    }
    setSubmitting(false);
  };

  // Submit all not submitted
  const submitAllPending = async () => {
    setSubmitting(true);
    try {
      // Fetch all not-submitted article IDs
      const res = await fetch("/api/seo/status?filter=not_submitted&page=1");
      const data = await res.json();
      if (data.success && data.data.articles.length > 0) {
        const ids = data.data.articles.map((a: Article) => a.id);
        const submitRes = await fetch("/api/seo/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleIds: ids }),
        });
        const submitData = await submitRes.json();
        if (submitData.success) {
          const { ok, failed } = submitData.data.summary;
          success(`Submit selesai: ${ok} berhasil, ${failed} gagal`);
          fetchData();
        }
      } else {
        success("Semua artikel sudah di-submit!");
      }
    } catch {
      showError("Gagal submit");
    }
    setSubmitting(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === articles.length) setSelectedIds([]);
    else setSelectedIds(articles.map((a) => a.id));
  };

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusBadge = (status: string | null) => {
    if (status === "submitted")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-600">
          <CheckCircle size={12} /> Submitted
        </span>
      );
    if (status === "failed")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
          <XCircle size={12} /> Failed
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-600">
        <Clock size={12} /> Belum Submit
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-txt-primary">SEO Monitor</h1>
          <p className="text-sm text-txt-secondary">Pantau status indexing Google untuk setiap artikel</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchData()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={submitAllPending}
            disabled={submitting || stats.notSubmitted === 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-goto-green px-5 py-2 text-sm font-medium text-white hover:bg-goto-green-dark disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submit Semua ({stats.notSubmitted})
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Globe size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-txt-primary">{stats.total}</p>
              <p className="text-xs text-txt-muted">Total Artikel</p>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <CheckCircle size={20} className="text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
              <p className="text-xs text-txt-muted">Submitted</p>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
              <Clock size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.notSubmitted}</p>
              <p className="text-xs text-txt-muted">Belum Submit</p>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <XCircle size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-xs text-txt-muted">Gagal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter + Search + Batch Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-txt-muted" />
          {["all", "submitted", "not_submitted", "failed"].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-goto-green text-white"
                  : "bg-surface-secondary text-txt-secondary hover:bg-surface-tertiary"
              }`}
            >
              {f === "all" ? "Semua" : f === "submitted" ? "Submitted" : f === "not_submitted" ? "Belum" : "Gagal"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={submitBatch}
              disabled={submitting}
              className="inline-flex items-center gap-1 rounded-full bg-goto-green px-4 py-1.5 text-xs font-medium text-white hover:bg-goto-green-dark disabled:opacity-50"
            >
              {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Submit {selectedIds.length} dipilih
            </button>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchData(); } }}
              placeholder="Cari artikel..."
              className="input pl-9 pr-3 py-1.5 text-sm w-60"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[12px] border border-border bg-surface shadow-card">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border bg-surface-secondary">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.length === articles.length && articles.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border text-goto-green focus:ring-goto-green"
                />
              </th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Artikel</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Kategori</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Status</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Terakhir Submit</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Views</th>
              <th className="px-4 py-3 text-sm font-semibold text-txt-primary text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Loader2 size={24} className="mx-auto animate-spin text-goto-green" />
                </td>
              </tr>
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-txt-muted">
                  Tidak ada artikel ditemukan
                </td>
              </tr>
            ) : (
              articles.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="h-4 w-4 rounded border-border text-goto-green focus:ring-goto-green"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs">
                      <p className="truncate text-sm font-medium text-txt-primary">{a.title}</p>
                      <a
                        href={`https://jurnalishukumbandung.com/berita/${a.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-goto-green hover:underline"
                      >
                        <ExternalLink size={10} /> Lihat
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-txt-secondary">{a.category?.name || "-"}</td>
                  <td className="px-4 py-3">{statusBadge(a.indexStatus)}</td>
                  <td className="px-4 py-3 text-xs text-txt-muted">{formatDate(a.lastIndexedAt)}</td>
                  <td className="px-4 py-3 text-sm text-txt-secondary">{a.viewCount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => submitSingle(a.id)}
                      disabled={submittingId === a.id}
                      className="inline-flex items-center gap-1 rounded-full border border-goto-green px-3 py-1 text-xs font-medium text-goto-green hover:bg-goto-green hover:text-white transition-colors disabled:opacity-50"
                    >
                      {submittingId === a.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Send size={12} />
                      )}
                      Index
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-full border border-border p-2 text-txt-secondary hover:bg-surface-secondary disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-txt-secondary">
            Halaman {page} dari {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-full border border-border p-2 text-txt-secondary hover:bg-surface-secondary disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
