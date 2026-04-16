"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
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
  Sparkles,
  FileText,
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

interface SorotanItem {
  id: string;
  slug: string;
  title: string;
  angle: string;
  createdAt: string;
  article: { title: string; slug: string; category: { name: string } };
}

const angleLabels: Record<string, string> = {
  kronologi: "Kronologi", analisis: "Analisis Hukum", dampak: "Dampak & Implikasi",
  "latar-belakang": "Latar Belakang", "fakta-data": "Fakta & Data", regulasi: "Regulasi Terkait",
  profil: "Profil & Pihak", opini: "Perspektif & Opini", perbandingan: "Perbandingan Kasus",
  "tanya-jawab": "Tanya Jawab",
};

export default function SeoMonitorPage() {
  const { success, error: showError } = useToast();
  const [activeTab, setActiveTab] = useState<"articles" | "sorotan">("articles");
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

  // Sorotan state
  const [sorotanList, setSorotanList] = useState<SorotanItem[]>([]);
  const [sorotanTotal, setSorotanTotal] = useState(0);
  const [sorotanPage, setSorotanPage] = useState(1);
  const [sorotanTotalPages, setSorotanTotalPages] = useState(1);
  const [sorotanLoading, setSorotanLoading] = useState(false);
  const [sorotanSearch, setSorotanSearch] = useState("");
  const [sorotanSelected, setSorotanSelected] = useState<string[]>([]);
  const [sorotanSubmitting, setSorotanSubmitting] = useState(false);
  const [sorotanSubmittingSlug, setSorotanSubmittingSlug] = useState<string | null>(null);

  const fetchSorotan = useCallback(async () => {
    setSorotanLoading(true);
    try {
      const q = sorotanSearch ? `&q=${encodeURIComponent(sorotanSearch)}` : "";
      const res = await fetch(`/api/seo/sorotan-status?page=${sorotanPage}${q}`);
      const data = await res.json();
      if (data.success) {
        setSorotanList(data.data.sorotan || []);
        setSorotanTotal(data.data.total || 0);
        setSorotanTotalPages(data.data.pagination?.totalPages || 1);
      }
    } catch { /* ignore */ }
    setSorotanLoading(false);
  }, [sorotanPage, sorotanSearch]);

  useEffect(() => {
    if (activeTab === "sorotan") fetchSorotan();
  }, [activeTab, fetchSorotan]);

  const submitSorotanSingle = async (slug: string) => {
    setSorotanSubmittingSlug(slug);
    try {
      const res = await fetch("/api/seo/sorotan-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: [slug] }),
      });
      const data = await res.json();
      if (data.success) {
        success(`Submitted ke Google + IndexNow`);
      } else {
        showError("Gagal submit");
      }
    } catch { showError("Gagal submit"); }
    setSorotanSubmittingSlug(null);
  };

  const submitSorotanBatch = async (slugs: string[]) => {
    setSorotanSubmitting(true);
    try {
      const res = await fetch("/api/seo/sorotan-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs }),
      });
      const data = await res.json();
      if (data.success) {
        success(`${data.data.submitted} sorotan di-submit ke Google + IndexNow`);
        setSorotanSelected([]);
      }
    } catch { showError("Gagal submit batch"); }
    setSorotanSubmitting(false);
  };

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

  const [submitInfo, setSubmitInfo] = useState<{
    ok: number;
    failed: number;
    remaining: number;
    quotaExhausted: boolean;
    estimate: { remainingArticles: number; quotaPerDay: number; estimatedDays: number; nextRetry: string } | null;
    indexNow: number;
  } | null>(null);

  // Smart submit — sends one by one, stops when quota exhausted
  const smartSubmit = async (articleIds: string[]) => {
    setSubmitting(true);
    setSubmitInfo(null);
    try {
      const res = await fetch("/api/seo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleIds }),
      });
      const data = await res.json();
      if (data.success) {
        const d = data.data;
        setSubmitInfo({
          ok: d.summary.ok,
          failed: d.summary.failed,
          remaining: d.summary.remaining || 0,
          quotaExhausted: d.quotaExhausted || false,
          estimate: d.estimate || null,
          indexNow: d.indexNow?.submitted || 0,
        });
        fetchData();
      }
    } catch {
      showError("Gagal submit");
    }
    setSubmitting(false);
  };

  // Retry all failed articles
  const retryAllFailed = async () => {
    const res = await fetch("/api/seo/status?filter=failed&page=1&limit=200");
    const data = await res.json();
    if (data.success && data.data.articles.length > 0) {
      await smartSubmit(data.data.articles.map((a: Article) => a.id));
    } else {
      success("Tidak ada artikel failed!");
    }
  };

  // Submit ALL (not submitted + failed)
  const submitAll = async () => {
    // Get all not submitted + failed
    const [res1, res2] = await Promise.all([
      fetch("/api/seo/status?filter=not_submitted&page=1&limit=200").then(r => r.json()),
      fetch("/api/seo/status?filter=failed&page=1&limit=200").then(r => r.json()),
    ]);
    const ids = [
      ...(res1.data?.articles || []).map((a: Article) => a.id),
      ...(res2.data?.articles || []).map((a: Article) => a.id),
    ];
    if (ids.length > 0) {
      await smartSubmit(ids);
    } else {
      success("Semua artikel sudah di-submit!");
    }
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchData()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          {stats.failed > 0 && (
            <button
              onClick={retryAllFailed}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Retry Failed ({stats.failed})
            </button>
          )}
          <button
            onClick={submitAll}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-goto-green px-5 py-2 text-sm font-medium text-white hover:bg-goto-dark disabled:opacity-50"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submit Semua ({stats.notSubmitted + stats.failed})
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

      {/* Submit Result Info */}
      {submitInfo && (
        <div className={`rounded-[12px] border p-5 ${submitInfo.quotaExhausted ? "border-yellow-300 bg-yellow-50" : "border-goto-green/30 bg-goto-light"}`}>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-goto-green font-semibold">✓ Google: {submitInfo.ok} berhasil</span>
            {submitInfo.failed > 0 && <span className="text-red-500">✗ {submitInfo.failed} gagal</span>}
            {submitInfo.remaining > 0 && <span className="text-yellow-600">⏳ {submitInfo.remaining} menunggu</span>}
            <span className="text-blue-500">↗ IndexNow (Bing): {submitInfo.indexNow} submitted</span>
          </div>

          {submitInfo.quotaExhausted && submitInfo.estimate && (
            <div className="mt-3 rounded-lg bg-white/70 p-4">
              <p className="text-sm font-semibold text-yellow-700 mb-2">
                ⚠ Google Indexing API quota habis untuk hari ini
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-txt-muted">Sisa artikel</p>
                  <p className="text-lg font-bold text-txt-primary">{submitInfo.estimate.remainingArticles}</p>
                </div>
                <div>
                  <p className="text-xs text-txt-muted">Quota/hari</p>
                  <p className="text-lg font-bold text-txt-primary">~{submitInfo.estimate.quotaPerDay}</p>
                </div>
                <div>
                  <p className="text-xs text-txt-muted">Estimasi selesai</p>
                  <p className="text-lg font-bold text-goto-green">{submitInfo.estimate.estimatedDays} hari</p>
                </div>
                <div>
                  <p className="text-xs text-txt-muted">Auto-retry</p>
                  <p className="text-xs font-medium text-txt-primary">{submitInfo.estimate.nextRetry}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-txt-muted">
                Tidak perlu klik lagi — cron otomatis akan retry artikel yang gagal 3x sehari. Quota Google naik otomatis seiring waktu.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab switcher: Artikel / Sorotan */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("articles")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "articles" ? "border-goto-green text-goto-green" : "border-transparent text-txt-secondary hover:text-txt-primary"
          }`}
        >
          <FileText size={16} /> Artikel ({stats.total})
        </button>
        <button
          onClick={() => setActiveTab("sorotan")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "sorotan" ? "border-goto-green text-goto-green" : "border-transparent text-txt-secondary hover:text-txt-primary"
          }`}
        >
          <Sparkles size={16} /> Sorotan SEO ({sorotanTotal})
        </button>
      </div>

      {/* === SOROTAN TAB === */}
      {activeTab === "sorotan" && (
        <div className="space-y-4">
          {/* Search + Batch */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              {sorotanSelected.length > 0 && (
                <button
                  onClick={() => submitSorotanBatch(sorotanSelected)}
                  disabled={sorotanSubmitting}
                  className="inline-flex items-center gap-1 rounded-full bg-goto-green px-4 py-1.5 text-xs font-medium text-white hover:bg-goto-dark disabled:opacity-50"
                >
                  {sorotanSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Submit {sorotanSelected.length} dipilih
                </button>
              )}
              <button
                onClick={() => {
                  const allSlugs = sorotanList.map((s) => s.slug);
                  submitSorotanBatch(allSlugs);
                }}
                disabled={sorotanSubmitting || sorotanList.length === 0}
                className="inline-flex items-center gap-1 rounded-full bg-goto-green px-4 py-1.5 text-xs font-medium text-white hover:bg-goto-dark disabled:opacity-50"
              >
                <Send size={12} /> Submit Semua ({sorotanTotal})
              </button>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
              <input
                value={sorotanSearch}
                onChange={(e) => setSorotanSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { setSorotanPage(1); fetchSorotan(); } }}
                placeholder="Cari sorotan..."
                className="input pl-9 pr-3 py-1.5 text-sm w-60"
              />
            </div>
          </div>

          {/* Sorotan Table */}
          <div className="overflow-x-auto rounded-[12px] border border-border bg-surface shadow-card">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-surface-secondary">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={sorotanSelected.length === sorotanList.length && sorotanList.length > 0}
                      onChange={() => sorotanSelected.length === sorotanList.length ? setSorotanSelected([]) : setSorotanSelected(sorotanList.map((s) => s.slug))}
                      className="h-4 w-4 rounded border-border text-goto-green"
                    />
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Judul Sorotan</th>
                  <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Angle</th>
                  <th className="px-4 py-3 text-sm font-semibold text-txt-primary">Artikel Induk</th>
                  <th className="px-4 py-3 text-sm font-semibold text-txt-primary text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sorotanLoading ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center"><Loader2 size={24} className="mx-auto animate-spin text-goto-green" /></td></tr>
                ) : sorotanList.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-txt-muted">Belum ada halaman sorotan</td></tr>
                ) : (
                  sorotanList.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={sorotanSelected.includes(s.slug)}
                          onChange={() => setSorotanSelected((prev) => prev.includes(s.slug) ? prev.filter((x) => x !== s.slug) : [...prev, s.slug])}
                          className="h-4 w-4 rounded border-border text-goto-green"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          <p className="truncate text-sm font-medium text-txt-primary">{s.title}</p>
                          <a
                            href={`https://jurnalishukumbandung.com/sorotan/${s.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-goto-green hover:underline"
                          >
                            <ExternalLink size={10} /> Lihat
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-600">
                          <Sparkles size={10} />
                          {angleLabels[s.angle] || s.angle}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate text-xs text-txt-secondary max-w-[200px]">{s.article.title}</p>
                        <p className="text-[10px] text-txt-muted">{s.article.category?.name}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => submitSorotanSingle(s.slug)}
                          disabled={sorotanSubmittingSlug === s.slug}
                          className="inline-flex items-center gap-1 rounded-full border border-goto-green px-3 py-1 text-xs font-medium text-goto-green hover:bg-goto-green hover:text-white transition-colors disabled:opacity-50"
                        >
                          {sorotanSubmittingSlug === s.slug ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          Index
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sorotan Pagination */}
          {sorotanTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setSorotanPage((p) => Math.max(1, p - 1))} disabled={sorotanPage === 1} className="rounded-full border border-border p-2 text-txt-secondary hover:bg-surface-secondary disabled:opacity-30">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-txt-secondary">Halaman {sorotanPage} dari {sorotanTotalPages}</span>
              <button onClick={() => setSorotanPage((p) => Math.min(sorotanTotalPages, p + 1))} disabled={sorotanPage === sorotanTotalPages} className="rounded-full border border-border p-2 text-txt-secondary hover:bg-surface-secondary disabled:opacity-30">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* === ARTICLES TAB === */}
      {activeTab === "articles" && <>
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
      </>}
    </div>
  );
}
