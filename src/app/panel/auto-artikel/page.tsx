"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import Link from "next/link";
import {
  Bot,
  Zap,
  Save,
  RefreshCw,
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Hash,
  Settings,
  Play,
  Pause,
  TrendingUp,
  EyeOff,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Pagination component — reusable untuk 3 tab
function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  // Build page number list: always show first, last, current ± 1
  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "...") pages.push("...");
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-3 flex-wrap">
      <div className="text-xs text-txt-muted">
        Menampilkan <span className="font-medium text-txt-primary">{start.toLocaleString("id-ID")}–{end.toLocaleString("id-ID")}</span> dari <span className="font-medium text-txt-primary">{total.toLocaleString("id-ID")}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="inline-flex items-center justify-center rounded-full border border-border bg-surface p-1.5 text-txt-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Sebelumnya"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-xs text-txt-muted">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`min-w-[32px] rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                p === page
                  ? "bg-goto-green text-white"
                  : "bg-surface text-txt-secondary hover:bg-surface-secondary border border-border"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="inline-flex items-center justify-center rounded-full border border-border bg-surface p-1.5 text-txt-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Berikutnya"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

const FALLBACK_KEYWORDS = [
  "hukum bandung", "berita hukum bandung", "pengadilan bandung",
  "sidang bandung", "hukum pidana bandung", "hukum perdata bandung",
  "korupsi jawa barat", "kasus hukum bandung", "berita hukum jawa barat",
  "advokat bandung", "pengacara bandung", "hukum tata negara",
  "HAM bandung", "tipikor bandung", "kejaksaan bandung",
];

interface DraftArticle {
  id: string;
  title: string;
  slug: string;
  status: string;
  createdAt: string;
  category: { name: string };
  author: { name: string };
  viewCount: number;
}

export default function AutoArtikelPage() {
  const { success, error: showError } = useToast();

  // Settings
  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval_] = useState("60");
  const [count, setCount] = useState("1");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Generate
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{
    generated: number;
    failed: number;
    results: { success: boolean; article?: { title: string; slug: string }; keyword?: string; error?: string }[];
  } | null>(null);

  const PAGE_SIZE = 20;

  // Draft history
  const [drafts, setDrafts] = useState<DraftArticle[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [totalDrafts, setTotalDrafts] = useState(0);
  const [draftsPage, setDraftsPage] = useState(1);
  const [draftsTotalPages, setDraftsTotalPages] = useState(1);

  // Published articles (for hide/unhide)
  const [published, setPublished] = useState<DraftArticle[]>([]);
  const [loadingPublished, setLoadingPublished] = useState(true);
  const [totalPublished, setTotalPublished] = useState(0);
  const [publishedPage, setPublishedPage] = useState(1);
  const [publishedTotalPages, setPublishedTotalPages] = useState(1);

  const [activeTab, setActiveTab] = useState<"drafts" | "published" | "hidden">("drafts");
  const [hidden, setHidden] = useState<DraftArticle[]>([]);
  const [loadingHidden, setLoadingHidden] = useState(true);
  const [totalHidden, setTotalHidden] = useState(0);
  const [hiddenPage, setHiddenPage] = useState(1);
  const [hiddenTotalPages, setHiddenTotalPages] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Last run info
  const [lastRun, setLastRun] = useState<string | null>(null);

  // Target keywords (fetched from DB)
  const [targetKeywords, setTargetKeywords] = useState<string[]>([]);

  // Load settings
  useEffect(() => {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (json?.data) {
          const d = json.data;
          if (d.auto_article_enabled !== undefined) setEnabled(d.auto_article_enabled === "true");
          if (d.auto_article_count) setCount(d.auto_article_count);
          if (d.auto_article_interval) setInterval_(d.auto_article_interval);
          if (d.auto_article_last_run) setLastRun(d.auto_article_last_run);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load target keywords from DB (active only)
  const loadTargetKeywords = useCallback(async () => {
    try {
      const res = await fetch("/api/target-keywords");
      if (res.ok) {
        const json = await res.json();
        const active = (json.data?.keywords || [])
          .filter((k: { isActive: boolean }) => k.isActive)
          .map((k: { keyword: string }) => k.keyword);
        setTargetKeywords(active.length > 0 ? active : FALLBACK_KEYWORDS);
      } else {
        setTargetKeywords(FALLBACK_KEYWORDS);
      }
    } catch {
      setTargetKeywords(FALLBACK_KEYWORDS);
    }
  }, []);
  useEffect(() => { loadTargetKeywords(); }, [loadTargetKeywords]);

  // Load AI-generated drafts (paginated)
  const loadDrafts = useCallback(async (page = 1) => {
    setLoadingDrafts(true);
    try {
      const res = await fetch(`/api/articles?status=DRAFT&limit=${PAGE_SIZE}&page=${page}&sort=createdAt&autoGenerated=true`);
      const json = await res.json();
      if (json.success) {
        setDrafts(json.data?.articles || []);
        setTotalDrafts(json.data?.pagination?.total || 0);
        setDraftsTotalPages(json.data?.pagination?.totalPages || 1);
        setDraftsPage(json.data?.pagination?.page || page);
      }
    } catch { /* ignore */ }
    setLoadingDrafts(false);
  }, []);

  useEffect(() => { loadDrafts(1); }, [loadDrafts]);

  // Load published articles (paginated)
  const loadPublished = useCallback(async (page = 1) => {
    setLoadingPublished(true);
    try {
      const res = await fetch(`/api/articles?status=PUBLISHED&limit=${PAGE_SIZE}&page=${page}&sort=createdAt&autoGenerated=true`);
      const json = await res.json();
      if (json.success) {
        setPublished(json.data?.articles || []);
        setTotalPublished(json.data?.pagination?.total || 0);
        setPublishedTotalPages(json.data?.pagination?.totalPages || 1);
        setPublishedPage(json.data?.pagination?.page || page);
      }
    } catch { /* ignore */ }
    setLoadingPublished(false);
  }, []);

  // Load hidden (archived) articles (paginated)
  const loadHidden = useCallback(async (page = 1) => {
    setLoadingHidden(true);
    try {
      const res = await fetch(`/api/articles?status=ARCHIVED&limit=${PAGE_SIZE}&page=${page}&sort=createdAt&autoGenerated=true`);
      const json = await res.json();
      if (json.success) {
        setHidden(json.data?.articles || []);
        setTotalHidden(json.data?.pagination?.total || 0);
        setHiddenTotalPages(json.data?.pagination?.totalPages || 1);
        setHiddenPage(json.data?.pagination?.page || page);
      }
    } catch { /* ignore */ }
    setLoadingHidden(false);
  }, []);

  useEffect(() => { loadPublished(1); loadHidden(1); }, [loadPublished, loadHidden]);

  // Toggle hide/unhide
  const toggleVisibility = async (articleId: string, action: "hide" | "unhide") => {
    setTogglingId(articleId);
    try {
      const res = await fetch("/api/articles/toggle-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, action }),
      });
      const data = await res.json();
      if (data.success) {
        success(data.data.message);
        loadPublished(publishedPage);
        loadHidden(hiddenPage);
      } else {
        showError(data.error || "Gagal");
      }
    } catch { showError("Gagal toggle visibility"); }
    setTogglingId(null);
  };

  // Quick publish draft
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const publishDraft = async (articleId: string) => {
    setPublishingId(articleId);
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      const data = await res.json();
      if (data.success) {
        success("Artikel berhasil dipublish!");
        loadDrafts(draftsPage);
        loadPublished(publishedPage);
        // Clear generate result when all drafts are published
        setGenerateResult(null);
      } else {
        showError(data.error || "Gagal publish");
      }
    } catch { showError("Gagal publish"); }
    setPublishingId(null);
  };

  // Delete article
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteArticle = async (articleId: string, articleTitle: string) => {
    if (!confirm(`Hapus artikel "${articleTitle}"? Tidak bisa dikembalikan.`)) return;
    setDeletingId(articleId);
    try {
      const res = await fetch(`/api/articles/${articleId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        success("Artikel dihapus");
        loadDrafts(draftsPage);
        loadPublished(publishedPage);
        loadHidden(hiddenPage);
      } else {
        showError(data.error || "Gagal hapus");
      }
    } catch { showError("Gagal hapus"); }
    setDeletingId(null);
  };

  // Bulk delete by status
  const [bulkDeletingStatus, setBulkDeletingStatus] = useState<string | null>(null);
  const bulkDeleteByStatus = async (status: "DRAFT" | "PUBLISHED" | "ARCHIVED", label: string, count: number) => {
    if (count === 0) return;
    if (!confirm(
      `HAPUS SEMUA ${count} artikel ${label} (auto-generated)?\n\n` +
      `Aksi ini PERMANEN dan tidak bisa di-undo. Yakin lanjut?`
    )) return;
    // Double confirm for published
    if (status === "PUBLISHED") {
      const confirmText = `HAPUS ${count}`;
      const input = prompt(`Untuk konfirmasi penghapusan ${count} artikel PUBLISHED, ketik: ${confirmText}`);
      if (input !== confirmText) {
        showError("Konfirmasi tidak sesuai, dibatalkan");
        return;
      }
    }
    setBulkDeletingStatus(status);
    try {
      const res = await fetch("/api/articles/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, autoGeneratedOnly: true }),
      });
      const data = await res.json();
      if (data.success) {
        success(data.data?.message || `${data.data?.deleted || 0} artikel dihapus`);
        loadDrafts(1);
        loadPublished(1);
        loadHidden(1);
      } else {
        showError(data.error || "Gagal hapus semua");
      }
    } catch { showError("Gagal hapus semua"); }
    setBulkDeletingStatus(null);
  };

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      const payloads = [
        { key: "auto_article_enabled", value: enabled ? "true" : "false" },
        { key: "auto_article_count", value: String(count) },
        { key: "auto_article_interval", value: String(interval) },
      ];
      const results = await Promise.all(
        payloads.map((p) =>
          fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        showError(`${failed.length} pengaturan gagal disimpan (HTTP ${failed[0].status})`);
      } else {
        success("Pengaturan auto-artikel disimpan");
      }
    } catch {
      showError("Gagal menyimpan");
    }
    setSaving(false);
  };

  // Manual generate
  const [generateCount, setGenerateCount] = useState("1");

  const generateNow = async () => {
    const total = parseInt(generateCount);
    setGenerating(true);
    setGenerateResult({ generated: 0, failed: 0, results: [] });

    for (let i = 0; i < total; i++) {
      try {
        const res = await fetch("/api/cron/auto-article", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: 1 }),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.success && data.data?.results?.[0]) {
          const r = data.data.results[0];
          setGenerateResult((prev) => prev ? {
            generated: prev.generated + (r.success ? 1 : 0),
            failed: prev.failed + (r.success ? 0 : 1),
            results: [...prev.results, r],
          } : prev);
        } else {
          // HTTP error or no results — surface the actual message
          const errMsg = data?.error
            || (res.status === 401 ? "Sesi habis — login ulang"
              : res.status === 403 ? "Anda tidak berwenang (perlu SUPER_ADMIN/EDITOR)"
              : res.status === 429 ? "Rate limit AI tercapai — coba lagi 1 jam"
              : res.status >= 500 ? `Server error (HTTP ${res.status})`
              : `Gagal generate (HTTP ${res.status})`);
          setGenerateResult((prev) => prev ? {
            ...prev,
            failed: prev.failed + 1,
            results: [...prev.results, { success: false, error: errMsg }],
          } : prev);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Timeout / koneksi terputus";
        setGenerateResult((prev) => prev ? {
          ...prev,
          failed: prev.failed + 1,
          results: [...prev.results, { success: false, error: errMsg }],
        } : prev);
      }

      // Short delay between requests
      if (i < total - 1) await new Promise((r) => setTimeout(r, 1000));
    }

    setGenerating(false);
    loadDrafts();
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const intervalLabel = (val: string) => {
    const map: Record<string, string> = {
      "30": "30 menit", "60": "1 jam", "120": "2 jam", "180": "3 jam",
      "360": "6 jam", "720": "12 jam", "1440": "24 jam",
    };
    return map[val] || val + " menit";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-goto-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-txt-primary flex items-center gap-2">
            <Bot size={28} className="text-purple-600" />
            Auto-Generate Artikel
          </h1>
          <p className="text-sm text-txt-secondary mt-1">
            Generate draft artikel otomatis dari AI berdasarkan topik hukum Bandung
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={generateCount}
            onChange={(e) => setGenerateCount(e.target.value)}
            className="rounded-full border border-purple-300 bg-white px-3 py-2.5 text-sm font-medium text-purple-700"
          >
            {[1, 2, 3, 5, 10].map((n) => (
              <option key={n} value={n}>{n} artikel</option>
            ))}
          </select>
          <button
            onClick={generateNow}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {generating ? `Generating ${(generateResult?.generated || 0) + (generateResult?.failed || 0) + 1}/${generateCount}...` : "Generate Draft"}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              {enabled ? <Play size={20} className="text-purple-600" /> : <Pause size={20} className="text-gray-400" />}
            </div>
            <div>
              <p className="text-lg font-bold text-txt-primary">{enabled ? "Aktif" : "Nonaktif"}</p>
              <p className="text-xs text-txt-muted">Status</p>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-txt-primary">{intervalLabel(interval)}</p>
              <p className="text-xs text-txt-muted">Interval</p>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <FileText size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-txt-primary">{count}/run</p>
              <p className="text-xs text-txt-muted">Artikel</p>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <TrendingUp size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-txt-primary">{totalDrafts}</p>
              <p className="text-xs text-txt-muted">Total Draft</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Config */}
          <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
            <h2 className="text-lg font-bold text-txt-primary mb-4 flex items-center gap-2">
              <Settings size={18} /> Pengaturan
            </h2>

            {/* Toggle */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm font-medium text-txt-primary">Auto-Generate</p>
                <p className="text-xs text-txt-muted">Buat draft otomatis via cron</p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${enabled ? "bg-goto-green" : "bg-gray-200"}`}
              >
                <span className={`pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow transform transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            {/* Interval */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-txt-primary">Interval</label>
              <select value={interval} onChange={(e) => setInterval_(e.target.value)} className="input w-full">
                <option value="30">Setiap 30 menit</option>
                <option value="60">Setiap 1 jam</option>
                <option value="120">Setiap 2 jam</option>
                <option value="180">Setiap 3 jam</option>
                <option value="360">Setiap 6 jam</option>
                <option value="720">Setiap 12 jam</option>
                <option value="1440">Setiap 24 jam</option>
              </select>
            </div>

            {/* Count */}
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-txt-primary">Jumlah per generate</label>
              <select value={count} onChange={(e) => setCount(e.target.value)} className="input w-full">
                <option value="1">1 artikel</option>
                <option value="2">2 artikel</option>
                <option value="3">3 artikel</option>
                <option value="5">5 artikel</option>
              </select>
            </div>

            <button onClick={saveSettings} disabled={saving} className="btn-primary w-full text-sm">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Simpan Pengaturan
            </button>

            {lastRun && (
              <p className="mt-3 text-xs text-txt-muted text-center">
                Terakhir jalan: {formatDate(lastRun)}
              </p>
            )}
          </div>

          {/* Target Keywords */}
          <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h2 className="text-lg font-bold text-txt-primary flex items-center gap-2">
                <Hash size={18} /> Keyword Target
                <span className="text-xs font-normal text-txt-muted">({targetKeywords.length})</span>
              </h2>
              <Link
                href="/panel/tags?tab=research"
                className="text-xs text-goto-green font-medium hover:underline whitespace-nowrap flex items-center gap-1"
                title="Kelola keyword di Tags Manager"
              >
                <TrendingUp size={12} /> Riset AI
              </Link>
            </div>
            <p className="text-xs text-txt-muted mb-3">
              Topik yang digunakan AI untuk generate artikel (dari Tags Manager → Riset Keyword):
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {targetKeywords.length === 0 ? (
                <p className="text-xs italic text-txt-muted">Loading...</p>
              ) : (
                targetKeywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                    {kw}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content — Generate Result + Draft List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Generate Result */}
          {generateResult && (
            <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
              <h2 className="text-lg font-bold text-txt-primary mb-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" /> Hasil Generate
              </h2>
              <div className="flex gap-4 mb-4">
                <div className="rounded-lg bg-green-50 px-4 py-2 text-center">
                  <p className="text-2xl font-bold text-green-600">{generateResult.generated}</p>
                  <p className="text-xs text-green-700">Berhasil</p>
                </div>
                {generateResult.failed > 0 && (
                  <div className="rounded-lg bg-red-50 px-4 py-2 text-center">
                    <p className="text-2xl font-bold text-red-600">{generateResult.failed}</p>
                    <p className="text-xs text-red-700">Gagal</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {generateResult.results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 rounded-lg p-3 ${r.success ? "bg-green-50" : "bg-red-50"}`}>
                    {r.success ? <CheckCircle size={16} className="text-green-500 shrink-0" /> : <XCircle size={16} className="text-red-500 shrink-0" />}
                    <div className="flex-1 min-w-0 max-w-[300px] sm:max-w-none">
                      <p className="text-sm font-medium text-txt-primary line-clamp-1">{r.article?.title || "Gagal generate"}</p>
                      {r.keyword && <p className="text-xs text-txt-muted truncate">Keyword: {r.keyword}</p>}
                      {r.error && <p className="text-xs text-red-500 truncate">{r.error}</p>}
                    </div>
                    {r.success && r.article && (
                      <Link href={`/panel/artikel/${r.article.slug}`} className="text-xs text-goto-green hover:underline shrink-0">
                        Edit →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Articles Tabs: Drafts / Published / Hidden */}
          <div className="rounded-[12px] border border-border bg-surface shadow-card">
            {/* Tab buttons */}
            <div className="flex border-b border-border">
              {([
                { key: "drafts", label: "Draft", count: totalDrafts, icon: FileText, color: "yellow" },
                { key: "published", label: "Published", count: totalPublished, icon: Eye, color: "green" },
                { key: "hidden", label: "Hidden", count: totalHidden, icon: EyeOff, color: "red" },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    if (tab.key === "published") loadPublished(publishedPage);
                    if (tab.key === "hidden") loadHidden(hiddenPage);
                    if (tab.key === "drafts") loadDrafts(draftsPage);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.key
                      ? "border-goto-green text-goto-green"
                      : "border-transparent text-txt-secondary hover:text-txt-primary"
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {/* Bulk delete bar — shown per active tab */}
            {((activeTab === "drafts" && drafts.length > 0) ||
              (activeTab === "published" && published.length > 0) ||
              (activeTab === "hidden" && hidden.length > 0)) && (
              <div className="flex items-center justify-between border-b border-border bg-red-50/40 px-6 py-2.5">
                <p className="text-xs text-red-700">
                  ⚠️ Bulk delete hanya menghapus artikel <strong>auto-generated</strong> di tab ini.
                </p>
                <button
                  onClick={() => {
                    if (activeTab === "drafts") bulkDeleteByStatus("DRAFT", "Draft", drafts.length);
                    else if (activeTab === "published") bulkDeleteByStatus("PUBLISHED", "Published", published.length);
                    else if (activeTab === "hidden") bulkDeleteByStatus("ARCHIVED", "Hidden", hidden.length);
                  }}
                  disabled={bulkDeletingStatus !== null}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkDeletingStatus ? (
                    <><Loader2 size={11} className="animate-spin" /> Menghapus...</>
                  ) : (
                    <><Trash2 size={11} /> Hapus Semua di Tab Ini</>
                  )}
                </button>
              </div>
            )}

            {/* Tab content */}
            {activeTab === "drafts" && (
              <>
                {loadingDrafts ? (
                  <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-goto-green" /></div>
                ) : drafts.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText size={40} className="mx-auto mb-3 text-txt-muted" />
                    <p className="text-sm text-txt-muted">Belum ada draft artikel</p>
                    <button onClick={generateNow} disabled={generating} className="mt-3 text-sm font-medium text-purple-600 hover:underline">Generate sekarang →</button>
                  </div>
                ) : (
                  <>
                  <div className="divide-y divide-border">
                    {drafts.map((d) => (
                      <div key={d.id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-secondary/50 transition-colors">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-50"><FileText size={18} className="text-yellow-600" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-txt-primary truncate">{d.title}</p>
                          <p className="text-xs text-txt-muted">{d.category?.name || "-"} · {formatDate(d.createdAt)}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => publishDraft(d.id)}
                            disabled={publishingId === d.id}
                            className="inline-flex items-center gap-1 rounded-full bg-goto-green px-3 py-1.5 text-xs font-medium text-white hover:bg-goto-green-dark transition-colors disabled:opacity-50"
                          >
                            {publishingId === d.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            Publish
                          </button>
                          <Link href={`/panel/artikel/${d.id}/edit`} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-txt-secondary hover:bg-surface-secondary transition-colors">Edit</Link>
                          <button
                            onClick={() => deleteArticle(d.id, d.title)}
                            disabled={deletingId === d.id}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {deletingId === d.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination page={draftsPage} totalPages={draftsTotalPages} total={totalDrafts} pageSize={PAGE_SIZE} onChange={(p) => loadDrafts(p)} />
                  </>
                )}
              </>
            )}

            {activeTab === "published" && (
              <>
                {loadingPublished ? (
                  <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-goto-green" /></div>
                ) : published.length === 0 ? (
                  <div className="py-12 text-center"><p className="text-sm text-txt-muted">Belum ada artikel published</p></div>
                ) : (
                  <>
                  <div className="divide-y divide-border">
                    {published.map((d) => (
                      <div key={d.id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-secondary/50 transition-colors">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50"><Eye size={18} className="text-green-600" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-txt-primary truncate">{d.title}</p>
                          <p className="text-xs text-txt-muted">{d.category?.name || "-"} · {d.viewCount} views · {formatDate(d.createdAt)}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => toggleVisibility(d.id, "hide")}
                            disabled={togglingId === d.id}
                            className="inline-flex items-center gap-1 rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            {togglingId === d.id ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
                            Hide
                          </button>
                          <a href={`/berita/${d.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-txt-muted hover:bg-surface-secondary">
                            <ExternalLink size={10} /> Lihat
                          </a>
                          <button onClick={() => deleteArticle(d.id, d.title)} disabled={deletingId === d.id} className="inline-flex items-center rounded-full border border-red-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50">
                            {deletingId === d.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination page={publishedPage} totalPages={publishedTotalPages} total={totalPublished} pageSize={PAGE_SIZE} onChange={(p) => loadPublished(p)} />
                  </>
                )}
              </>
            )}

            {activeTab === "hidden" && (
              <>
                {loadingHidden ? (
                  <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-goto-green" /></div>
                ) : hidden.length === 0 ? (
                  <div className="py-12 text-center"><EyeOff size={40} className="mx-auto mb-3 text-txt-muted" /><p className="text-sm text-txt-muted">Tidak ada artikel yang disembunyikan</p></div>
                ) : (
                  <>
                  <div className="divide-y divide-border">
                    {hidden.map((d) => (
                      <div key={d.id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-secondary/50 transition-colors">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50"><EyeOff size={18} className="text-red-500" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-txt-primary truncate line-through opacity-60">{d.title}</p>
                          <p className="text-xs text-txt-muted">{d.category?.name || "-"} · {formatDate(d.createdAt)}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => toggleVisibility(d.id, "unhide")}
                            disabled={togglingId === d.id}
                            className="inline-flex items-center gap-1 rounded-full border border-goto-green px-3 py-1.5 text-xs font-medium text-goto-green hover:bg-goto-green hover:text-white transition-colors disabled:opacity-50"
                          >
                            {togglingId === d.id ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                            Unhide
                          </button>
                          <button onClick={() => deleteArticle(d.id, d.title)} disabled={deletingId === d.id} className="inline-flex items-center rounded-full border border-red-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50">
                            {deletingId === d.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Pagination page={hiddenPage} totalPages={hiddenTotalPages} total={totalHidden} pageSize={PAGE_SIZE} onChange={(p) => loadHidden(p)} />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
