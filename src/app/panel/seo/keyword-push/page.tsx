"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import {
  Target,
  RefreshCw,
  Loader2,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Rocket,
  Edit,
  Plus,
  ExternalLink,
  Search,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban,
  Lightbulb,
  Wand2,
  FileText,
  Trash2,
} from "lucide-react";

type Priority = "HIGH" | "MEDIUM" | "LOW";
type Status = "on-track" | "needs-push" | "stagnant" | "no-data";

type Keyword = {
  id: string;
  keyword: string;
  priority: Priority;
  targetPosition: number;
  currentPosition: number | null;
  currentImpressions: number;
  currentClicks: number;
  currentCtr: number;
  bestArticleSlug: string | null;
  bestArticleId: string | null;
  lastSyncedAt: string | null;
  lastBoostedAt: string | null;
  boostCount: number;
  notes: string | null;
  isActive: boolean;
  status: Status;
  trend: "up" | "down" | "flat" | "new";
  trendDiff: number | null;
  snapshotCount: number;
};

type StatusData = {
  summary: {
    total: number;
    active: number;
    onTrack: number;
    needsPush: number;
    stagnant: number;
    noData: number;
    byPriority: { HIGH: number; MEDIUM: number; LOW: number };
  };
  keywords: Keyword[];
};

type AnalyzeAction = {
  type: string;
  severity: "high" | "medium" | "low";
  message: string;
  articleId?: string;
  articleSlug?: string;
  detail?: string;
};

type AnalyzeResult = {
  keyword: string;
  currentPosition: number | null;
  targetPosition: number;
  bestArticle: {
    id: string;
    slug: string;
    title: string;
    score: number;
    kwCount: number;
    density: number;
    wordCount: number;
    linkCount: number;
    viewCount: number;
    signals: Record<string, boolean>;
  } | null;
  relatedArticles: { id: string; slug: string; title: string; score: number; viewCount: number; category: string | null }[];
  totalArticles: number;
  actions: AnalyzeAction[];
};

const STATUS_LABEL: Record<Status, { label: string; color: string }> = {
  "on-track": { label: "🟢 On Track", color: "bg-green-50 text-goto-green border-green-200" },
  "needs-push": { label: "🚀 Needs Push", color: "bg-orange-50 text-orange-600 border-orange-200" },
  "stagnant": { label: "⚠️ Stagnant", color: "bg-red-50 text-red-600 border-red-200" },
  "no-data": { label: "❓ No Data", color: "bg-gray-50 text-txt-secondary border-border" },
};

const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-gray-100 text-txt-muted",
};

function fmtPos(p: number | null) {
  if (p === null) return "—";
  return "#" + p.toFixed(1);
}

export default function KeywordPushPage() {
  const { success, error: showError } = useToast();
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [boostingId, setBoostingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("MEDIUM");
  const [newTarget, setNewTarget] = useState(3);

  // Auto-disable generic state
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableData, setDisableData] = useState<{
    total: number;
    candidates: number;
    stale: number;
    recommendations: { id: string; keyword: string; reason: string; currentPosition: number | null; currentImpressions: number; currentClicks: number }[];
  } | null>(null);
  const [disableSelected, setDisableSelected] = useState<Set<string>>(new Set());

  // AI snippet optimizer state
  const [snippetLoading, setSnippetLoading] = useState<string | null>(null);
  const [snippetData, setSnippetData] = useState<{
    keyword: string;
    article: { id: string; slug: string; title: string; currentSeoTitle: string | null; currentSeoDesc: string | null };
    variants: { id: number; title: string; titleLen: number; description: string; descLen: number; angle: string }[];
    keywordId: string;
  } | null>(null);
  const [applyingVariant, setApplyingVariant] = useState<number | null>(null);

  // Sorotan SEO state
  const [sorotanLoading, setSorotanLoading] = useState<string | null>(null);
  const [sorotanGenerating, setSorotanGenerating] = useState<string | null>(null);
  const [sorotanGenerateCount, setSorotanGenerateCount] = useState(1);
  const [sorotanData, setSorotanData] = useState<{
    keyword: string;
    keywordId: string;
    total: number;
    sorotanList: { id: string; slug: string; title: string; url: string; relatedCount: number; indexStatus: string | null; createdAt: string }[];
  } | null>(null);

  // Bulk Sorotan state
  const [bulkSorotanLoading, setBulkSorotanLoading] = useState(false);
  const [bulkSorotanModal, setBulkSorotanModal] = useState(false);
  const [bulkSorotanProgress, setBulkSorotanProgress] = useState<{
    processed: number;
    total: number;
    generated: number;
    failed: number;
    currentKeyword?: string;
    log: string[];
  } | null>(null);

  // Long-tail suggester state
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestData, setSuggestData] = useState<{
    total: number;
    suggestions: { keyword: string; rationale: string; category: string; priority: Priority }[];
  } | null>(null);
  const [suggestSelected, setSuggestSelected] = useState<Set<number>>(new Set());
  const [suggestApplying, setSuggestApplying] = useState(false);

  const loadDisableCandidates = async () => {
    setDisableLoading(true);
    try {
      const res = await fetch("/api/seo/keyword-push/auto-disable-generic");
      const json = await res.json();
      if (json.success) {
        setDisableData(json.data);
        // Auto-select all candidates by default
        setDisableSelected(new Set(json.data.recommendations.map((r: { id: string }) => r.id)));
      } else showError(json.error || "Gagal load");
    } catch (e) { showError(e instanceof Error ? e.message : "Network error"); }
    setDisableLoading(false);
  };

  const applyDisable = async () => {
    if (disableSelected.size === 0) return;
    setDisableLoading(true);
    try {
      const res = await fetch("/api/seo/keyword-push/auto-disable-generic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(disableSelected) }),
      });
      const json = await res.json();
      if (json.success) {
        success(`${json.data.disabled} keyword di-disable`);
        setDisableData(null);
        setDisableSelected(new Set());
        load();
      } else showError(json.error || "Apply gagal");
    } catch (e) { showError(e instanceof Error ? e.message : "Network error"); }
    setDisableLoading(false);
  };

  const optimizeSnippet = async (keywordId: string) => {
    setSnippetLoading(keywordId);
    setSnippetData(null);
    try {
      const res = await fetch(`/api/seo/keyword-push/optimize-snippet/${keywordId}`);
      const json = await res.json();
      if (json.success) {
        setSnippetData({ ...json.data, keywordId });
      } else showError(json.error || "AI generate gagal");
    } catch (e) { showError(e instanceof Error ? e.message : "Network error"); }
    setSnippetLoading(null);
  };

  const applyVariant = async (variantId: number) => {
    if (!snippetData) return;
    const variant = snippetData.variants.find((v) => v.id === variantId);
    if (!variant) return;
    setApplyingVariant(variantId);
    try {
      const res = await fetch(`/api/seo/keyword-push/optimize-snippet/${snippetData.keywordId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: snippetData.article.id,
          seoTitle: variant.title,
          seoDescription: variant.description,
        }),
      });
      const json = await res.json();
      if (json.success) {
        success(`Variant ${variantId} diterapkan ke artikel`);
        setSnippetData(null);
        load();
      } else showError(json.error || "Apply gagal");
    } catch (e) { showError(e instanceof Error ? e.message : "Network error"); }
    setApplyingVariant(null);
  };

  const loadSorotanList = async (keywordId: string, keyword: string) => {
    setSorotanLoading(keywordId);
    try {
      const res = await fetch(`/api/seo/keyword-push/sorotan-list/${keywordId}`);
      const json = await res.json();
      if (json.success) {
        setSorotanData({ ...json.data, keywordId });
      } else showError(json.error || "Gagal load sorotan");
    } catch (e) { showError(e instanceof Error ? e.message : "Network error"); }
    setSorotanLoading(null);
    void keyword;
  };

  const generateSorotan = async (keywordId: string, count = 1) => {
    setSorotanGenerating(keywordId);
    try {
      const res = await fetch(`/api/seo/keyword-push/generate-sorotan/${keywordId}?count=${count}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        success(`Generated ${json.data.generated}/${json.data.requested} sorotan${json.data.failed > 0 ? `, ${json.data.failed} gagal` : ""}`);
        const target = data?.keywords.find((k) => k.id === keywordId);
        if (target) await loadSorotanList(keywordId, target.keyword);
      } else showError(json.error || "Generate gagal");
    } catch (e) { showError(e instanceof Error ? e.message : "Network error"); }
    setSorotanGenerating(null);
  };

  const bulkGenerateAllSorotan = async () => {
    setBulkSorotanLoading(true);
    setBulkSorotanProgress({ processed: 0, total: 0, generated: 0, failed: 0, log: ["Mulai bulk generate..."] });
    let offset = 0;
    let totalGenerated = 0;
    let totalFailed = 0;
    let totalProcessed = 0;
    const allLog: string[] = ["Mulai bulk generate..."];

    while (true) {
      try {
        const res = await fetch("/api/seo/keyword-push/bulk-generate-sorotan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "all-active", limit: 5, offset }),
        });
        const json = await res.json();
        if (!json.success) {
          allLog.push(`✗ Error: ${json.error || "Unknown"}`);
          setBulkSorotanProgress((p) => p ? { ...p, log: [...allLog] } : null);
          break;
        }

        const d = json.data;
        totalProcessed += d.processed;
        totalGenerated += d.generated;
        totalFailed += d.failed;

        for (const r of d.results || []) {
          allLog.push(r.ok ? `✓ ${r.keyword} → ${r.sorotanSlug}` : `✗ ${r.keyword}: ${r.error}`);
        }

        setBulkSorotanProgress({
          processed: totalProcessed,
          total: d.total,
          generated: totalGenerated,
          failed: totalFailed,
          log: [...allLog].slice(-30),
        });

        if (d.done) {
          allLog.push(`=== Selesai: ${totalGenerated} sorotan generated, ${totalFailed} failed ===`);
          setBulkSorotanProgress((p) => p ? { ...p, log: [...allLog].slice(-30) } : null);
          success(`Bulk generate selesai: ${totalGenerated} sorotan, ${totalFailed} gagal`);
          break;
        }
        offset = d.nextOffset;
      } catch (e) {
        allLog.push(`✗ Network error: ${e instanceof Error ? e.message : "Unknown"}`);
        setBulkSorotanProgress((p) => p ? { ...p, log: [...allLog].slice(-30) } : null);
        showError("Bulk generate gagal di tengah jalan");
        break;
      }
    }
    setBulkSorotanLoading(false);
    load();
  };

  const deleteSorotan = async (keywordId: string, sorotanId: string) => {
    if (!confirm("Hapus sorotan ini?")) return;
    try {
      const res = await fetch(`/api/seo/keyword-push/sorotan-list/${keywordId}?sorotanId=${sorotanId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        success("Sorotan dihapus");
        const target = data?.keywords.find((k) => k.id === keywordId);
        if (target) await loadSorotanList(keywordId, target.keyword);
      } else showError(json.error || "Hapus gagal");
    } catch (e) { showError(e instanceof Error ? e.message : "Network error"); }
  };

  const loadSuggestions = async () => {
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/seo/keyword-push/suggest-longtail");
      const json = await res.json();
      if (json.success) {
        setSuggestData(json.data);
        // Auto-select all by default
        setSuggestSelected(new Set(json.data.suggestions.map((_: unknown, i: number) => i)));
      } else showError(json.error || "AI generate gagal");
    } catch (e) { showError(e instanceof Error ? e.message : "Network error"); }
    setSuggestLoading(false);
  };

  const applySuggestions = async () => {
    if (!suggestData || suggestSelected.size === 0) return;
    setSuggestApplying(true);
    try {
      const selected = Array.from(suggestSelected).map((i) => suggestData.suggestions[i]);
      const res = await fetch("/api/seo/keyword-push/suggest-longtail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestions: selected }),
      });
      const json = await res.json();
      if (json.success) {
        success(`${json.data.inserted} keyword baru ditambahkan, ${json.data.skipped} skip duplicate`);
        setSuggestData(null);
        setSuggestSelected(new Set());
        load();
      } else showError(json.error || "Apply gagal");
    } catch (e) { showError(e instanceof Error ? e.message : "Network error"); }
    setSuggestApplying(false);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seo/keyword-push/status");
      const json = await res.json();
      if (json.success) setData(json.data);
      else showError(json.error || "Gagal load");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setLoading(false);
  }, [showError]);

  useEffect(() => { load(); }, [load]);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/seo/keyword-push/sync", { method: "POST" });
      const json = await res.json();
      if (json.success && json.data?.configured !== false) {
        success(`Sync GSC selesai: ${json.data.updated} keyword, ${json.data.snapshotCount} snapshot`);
        load();
      } else {
        showError(json.error || "GSC belum dikonfigurasi");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setSyncing(false);
  };

  const boost = async (id: string) => {
    setBoostingId(id);
    try {
      const res = await fetch(`/api/seo/keyword-push/auto-boost/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        success(`Boost selesai: ${json.data.success} sukses, ${json.data.failed} gagal`);
        load();
      } else {
        showError(json.error || "Boost gagal");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setBoostingId(null);
  };

  const analyze = async (id: string) => {
    setAnalyzingId(id);
    setAnalyzeResult(null);
    try {
      const res = await fetch(`/api/seo/keyword-push/analyze/${id}`);
      const json = await res.json();
      if (json.success) setAnalyzeResult(json.data);
      else showError(json.error || "Analyze gagal");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setAnalyzingId(null);
  };

  const updateField = async (id: string, field: { priority?: Priority; targetPosition?: number; isActive?: boolean }) => {
    try {
      const res = await fetch("/api/seo/keyword-push/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...field }),
      });
      const json = await res.json();
      if (json.success) {
        load();
        setEditingId(null);
      } else {
        showError(json.error || "Update gagal");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    try {
      const res = await fetch("/api/target-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newKeyword.trim(), source: "manual" }),
      });
      const json = await res.json();
      if (json.success) {
        // Update priority + targetPosition
        await fetch("/api/seo/keyword-push/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: json.data.id,
            priority: newPriority,
            targetPosition: newTarget,
          }),
        });
        success(`Keyword "${newKeyword}" ditambahkan`);
        setNewKeyword("");
        setNewPriority("MEDIUM");
        setNewTarget(3);
        load();
      } else {
        showError(json.error || "Gagal tambah keyword");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
  };

  const filtered = (data?.keywords || []).filter((k) => {
    if (!k.isActive) return false;
    if (filterStatus !== "all" && k.status !== filterStatus) return false;
    if (filterPriority !== "all" && k.priority !== filterPriority) return false;
    if (search.trim() && !k.keyword.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="container-main py-6 space-y-6">
      <div>
        <Link href="/panel/seo" className="inline-flex items-center gap-1 text-sm text-txt-secondary hover:text-txt-primary mb-3">
          <ChevronLeft size={14} /> Kembali ke SEO Monitor
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Target size={22} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-txt-primary">Keyword Push Engine</h1>
              <p className="text-sm text-txt-secondary">
                Input keyword target, mesin bantu naikkan posisinya di Google
              </p>
            </div>
          </div>
          <button
            onClick={sync}
            disabled={syncing || loading}
            className="inline-flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-medium text-white hover:bg-goto-dark disabled:opacity-50"
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync GSC Sekarang
          </button>
        </div>
      </div>

      {/* AI Tools Bar */}
      <div className="rounded-[12px] border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-4">
        <h3 className="text-sm font-semibold text-purple-900 mb-2">✨ AI Tools — Boost CTR & Content Strategy</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={loadDisableCandidates}
            disabled={disableLoading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
          >
            {disableLoading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
            Auto-Disable Generic
          </button>
          <button
            onClick={loadSuggestions}
            disabled={suggestLoading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {suggestLoading ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
            Suggest Long-Tail
          </button>
          <button
            onClick={() => setBulkSorotanModal(true)}
            disabled={bulkSorotanLoading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 col-span-2 md:col-span-1"
          >
            {bulkSorotanLoading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            Bulk Sorotan SEO
          </button>
          <p className="flex items-center justify-center text-[11px] text-purple-900 px-2 text-center col-span-2 md:col-span-1">
            💡 <Wand2 size={11} className="inline mx-1" /> + <FileText size={11} className="inline mx-1" /> per keyword
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-[12px] border border-border bg-surface p-4">
          <p className="text-xs text-txt-muted">Total Aktif</p>
          <p className="text-2xl font-bold text-txt-primary">{data?.summary.active ?? "—"}</p>
        </div>
        <div className="rounded-[12px] border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-goto-green">🟢 On Track</p>
          <p className="text-2xl font-bold text-goto-green">{data?.summary.onTrack ?? "—"}</p>
        </div>
        <div className="rounded-[12px] border border-orange-200 bg-orange-50 p-4">
          <p className="text-xs text-orange-600">🚀 Needs Push</p>
          <p className="text-2xl font-bold text-orange-600">{data?.summary.needsPush ?? "—"}</p>
        </div>
        <div className="rounded-[12px] border border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-600">⚠️ Stagnant</p>
          <p className="text-2xl font-bold text-red-600">{data?.summary.stagnant ?? "—"}</p>
        </div>
      </div>

      {/* Add keyword form */}
      <div className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-txt-primary mb-3">+ Tambah Keyword Target</h2>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_120px_auto] gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Contoh: kasus hukum bjb"
            className="rounded-full border border-border bg-surface-secondary px-4 py-2 text-sm focus:border-goto-green focus:outline-none"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as Priority)}
            className="rounded-full border border-border bg-surface px-3 py-2 text-sm focus:border-goto-green focus:outline-none"
          >
            <option value="HIGH">🔴 HIGH</option>
            <option value="MEDIUM">🟡 MEDIUM</option>
            <option value="LOW">⚪ LOW</option>
          </select>
          <select
            value={newTarget}
            onChange={(e) => setNewTarget(parseInt(e.target.value))}
            className="rounded-full border border-border bg-surface px-3 py-2 text-sm focus:border-goto-green focus:outline-none"
          >
            <option value={1}>Target #1</option>
            <option value={3}>Target #3</option>
            <option value={5}>Target #5</option>
            <option value={10}>Target #10</option>
          </select>
          <button
            onClick={addKeyword}
            disabled={!newKeyword.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-medium text-white hover:bg-goto-dark disabled:opacity-50"
          >
            <Plus size={14} /> Tambah
          </button>
        </div>
        <p className="text-xs text-txt-muted mt-2">
          💡 Setelah tambah, klik <strong>Sync GSC</strong> untuk pull posisi terkini, lalu <strong>Auto Boost</strong> untuk push posisi.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-txt-muted">Filter:</div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as Status | "all")}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs focus:border-goto-green focus:outline-none"
        >
          <option value="all">Semua status</option>
          <option value="on-track">🟢 On Track</option>
          <option value="needs-push">🚀 Needs Push</option>
          <option value="stagnant">⚠️ Stagnant</option>
          <option value="no-data">❓ No Data</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Priority | "all")}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs focus:border-goto-green focus:outline-none"
        >
          <option value="all">Semua priority</option>
          <option value="HIGH">🔴 HIGH</option>
          <option value="MEDIUM">🟡 MEDIUM</option>
          <option value="LOW">⚪ LOW</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari keyword..."
            className="w-full rounded-full border border-border bg-surface pl-9 pr-3 py-1.5 text-xs focus:border-goto-green focus:outline-none"
          />
        </div>
      </div>

      {/* Keyword list */}
      <div className="rounded-[12px] border border-border bg-surface shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-goto-green" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-txt-muted">Tidak ada keyword cocok dengan filter</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((k) => {
              const trendIcon = k.trend === "up" ? TrendingUp : k.trend === "down" ? TrendingDown : Minus;
              const trendColor = k.trend === "up" ? "text-goto-green" : k.trend === "down" ? "text-red-600" : "text-txt-muted";
              const TrendIcon = trendIcon;
              const statusInfo = STATUS_LABEL[k.status];
              return (
                <div key={k.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 p-4 hover:bg-surface-secondary/30">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-txt-primary truncate">{k.keyword}</p>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PRIORITY_COLOR[k.priority]}`}>
                        {k.priority}
                      </span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-txt-muted flex-wrap">
                      <span>
                        Posisi: <strong className={k.currentPosition && k.currentPosition <= 3 ? "text-goto-green" : "text-txt-primary"}>{fmtPos(k.currentPosition)}</strong>
                        {" / target "}
                        <strong>#{k.targetPosition}</strong>
                      </span>
                      {k.trendDiff !== null && (
                        <span className={`inline-flex items-center gap-0.5 ${trendColor}`}>
                          <TrendIcon size={11} /> {Math.abs(k.trendDiff).toFixed(1)}
                        </span>
                      )}
                      <span>Impresi: {k.currentImpressions.toLocaleString("id-ID")}</span>
                      <span>Klik: {k.currentClicks}</span>
                      <span>CTR: {(k.currentCtr * 100).toFixed(1)}%</span>
                      {k.boostCount > 0 && <span>🚀 Boost: {k.boostCount}x</span>}
                    </div>
                    {k.bestArticleSlug && (
                      <p className="text-xs text-txt-secondary mt-1">
                        Best:{" "}
                        <a
                          href={`/berita/${k.bestArticleSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          /berita/{k.bestArticleSlug.slice(0, 60)}...
                        </a>
                      </p>
                    )}
                    {editingId === k.id && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <select
                          defaultValue={k.priority}
                          onChange={(e) => updateField(k.id, { priority: e.target.value as Priority })}
                          className="rounded-full border border-border bg-surface px-2 py-1 text-xs"
                        >
                          <option value="HIGH">HIGH</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="LOW">LOW</option>
                        </select>
                        <select
                          defaultValue={k.targetPosition}
                          onChange={(e) => updateField(k.id, { targetPosition: parseInt(e.target.value) })}
                          className="rounded-full border border-border bg-surface px-2 py-1 text-xs"
                        >
                          <option value={1}>#1</option>
                          <option value={3}>#3</option>
                          <option value={5}>#5</option>
                          <option value={10}>#10</option>
                        </select>
                        <button onClick={() => setEditingId(null)} className="text-xs text-txt-muted hover:text-txt-primary">batal</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => analyze(k.id)}
                      disabled={analyzingId === k.id}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      title="Analisis artikel + saran action"
                    >
                      {analyzingId === k.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Analyze
                    </button>
                    <button
                      onClick={() => boost(k.id)}
                      disabled={boostingId === k.id || !k.bestArticleId}
                      className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
                      title={!k.bestArticleId ? "Sync GSC dulu untuk identify best article" : "Re-submit indexing + purge cache"}
                    >
                      {boostingId === k.id ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
                      Boost
                    </button>
                    <button
                      onClick={() => optimizeSnippet(k.id)}
                      disabled={snippetLoading === k.id || !k.bestArticleId}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-600 disabled:opacity-50"
                      title="AI generate seoTitle + seoDescription baru"
                    >
                      {snippetLoading === k.id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    </button>
                    <button
                      onClick={() => loadSorotanList(k.id, k.keyword)}
                      disabled={sorotanLoading === k.id || !k.bestArticleId}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      title="Lihat & generate Sorotan SEO landing page untuk keyword ini"
                    >
                      {sorotanLoading === k.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                    </button>
                    <button
                      onClick={() => setEditingId(editingId === k.id ? null : k.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1.5 text-xs text-txt-muted hover:bg-surface-secondary"
                      title="Edit priority/target"
                    >
                      <Edit size={12} />
                    </button>
                    {k.bestArticleId && (
                      <Link
                        href={`/panel/artikel/${k.bestArticleId}/edit`}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1.5 text-xs text-txt-muted hover:bg-surface-secondary"
                        title="Edit best article"
                      >
                        <ExternalLink size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Analyze result modal */}
      {analyzeResult && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setAnalyzeResult(null)}>
          <div className="bg-surface rounded-[12px] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-card-hover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-txt-primary">📊 Analisis: <code className="text-base">{analyzeResult.keyword}</code></h2>
                <p className="text-sm text-txt-muted">
                  Posisi sekarang: {fmtPos(analyzeResult.currentPosition)} · Target: #{analyzeResult.targetPosition} · {analyzeResult.totalArticles} artikel relevan
                </p>
              </div>
              <button onClick={() => setAnalyzeResult(null)} className="text-2xl text-txt-muted hover:text-txt-primary">×</button>
            </div>

            {analyzeResult.bestArticle ? (
              <div className="rounded-[10px] border border-blue-200 bg-blue-50 p-4 mb-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">🏆 Best Article</h3>
                <p className="text-sm text-txt-primary mb-2">{analyzeResult.bestArticle.title}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div><strong className="text-blue-900">Score:</strong> {analyzeResult.bestArticle.score}/100</div>
                  <div><strong className="text-blue-900">Word:</strong> {analyzeResult.bestArticle.wordCount}</div>
                  <div><strong className="text-blue-900">KW count:</strong> {analyzeResult.bestArticle.kwCount}</div>
                  <div><strong className="text-blue-900">Density:</strong> {analyzeResult.bestArticle.density}%</div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mt-3 text-xs">
                  {Object.entries(analyzeResult.bestArticle.signals || {}).map(([k, v]) => (
                    <div key={k} className={v ? "text-goto-green" : "text-red-600"}>
                      {v ? "✓" : "✗"} {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[10px] border border-orange-200 bg-orange-50 p-4 mb-4">
                <h3 className="text-sm font-semibold text-orange-900 mb-2">⚠️ Belum ada artikel relevan</h3>
                <p className="text-xs text-orange-800">
                  Tidak ditemukan artikel JHB yang membahas keyword <code>&ldquo;{analyzeResult.keyword}&rdquo;</code>. Lihat Action Plan di bawah untuk rekomendasi.
                </p>
              </div>
            )}

            <h3 className="text-sm font-semibold text-txt-primary mb-2">🎯 Action Plan ({analyzeResult.actions.length})</h3>
            <div className="space-y-2 mb-4">
              {analyzeResult.actions.map((a, i) => {
                const sevColor = a.severity === "high" ? "border-red-200 bg-red-50" : a.severity === "medium" ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-gray-50";
                const sevIcon = a.severity === "high" ? AlertCircle : a.severity === "medium" ? Zap : CheckCircle;
                const SevIcon = sevIcon;
                return (
                  <div key={i} className={`rounded-[8px] border ${sevColor} p-3 flex items-start gap-2`}>
                    <SevIcon size={14} className={`shrink-0 mt-0.5 ${a.severity === "high" ? "text-red-600" : a.severity === "medium" ? "text-orange-600" : "text-txt-muted"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-txt-primary">{a.message}</p>
                      {a.detail && <p className="text-[10px] text-txt-muted mt-1">{a.detail}</p>}
                      {a.articleId && (
                        <Link
                          href={`/panel/artikel/${a.articleId}/edit`}
                          className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-1"
                        >
                          <Edit size={10} /> Edit artikel
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <h3 className="text-sm font-semibold text-txt-primary mb-2">📰 Related Articles ({(analyzeResult.relatedArticles || []).length})</h3>
            <div className="space-y-1 mb-4">
              {(analyzeResult.relatedArticles || []).slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href={`/panel/artikel/${a.id}/edit`}
                  className="flex items-center justify-between gap-2 rounded-[6px] border border-border p-2 hover:bg-surface-secondary text-xs"
                >
                  <span className="truncate text-txt-primary">{a.title}</span>
                  <span className="shrink-0 text-txt-muted">Score {a.score} · {a.viewCount} views</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Disable Generic Modal */}
      {disableData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setDisableData(null)}>
          <div className="bg-surface rounded-[12px] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-card-hover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-txt-primary flex items-center gap-2">
                  <Ban size={20} className="text-red-600" /> Auto-Disable Generic
                </h2>
                <p className="text-sm text-txt-muted">
                  {disableData.candidates} generic keyword + {disableData.stale} stale keyword direkomendasi disable
                </p>
              </div>
              <button onClick={() => setDisableData(null)} className="text-2xl text-txt-muted hover:text-txt-primary">×</button>
            </div>

            {disableData.recommendations.length === 0 ? (
              <p className="text-center py-8 text-sm text-txt-muted">
                Tidak ada keyword yang perlu di-disable. Semua keyword Anda sudah focused. 🎉
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <button
                    onClick={() => setDisableSelected(new Set(disableData.recommendations.map(r => r.id)))}
                    className="rounded-full border border-border px-2 py-1 hover:bg-surface-secondary"
                  >Pilih semua</button>
                  <button
                    onClick={() => setDisableSelected(new Set())}
                    className="rounded-full border border-border px-2 py-1 hover:bg-surface-secondary"
                  >Pilih none</button>
                  <span className="text-txt-muted ml-auto">{disableSelected.size}/{disableData.recommendations.length} dipilih</span>
                </div>
                <div className="divide-y divide-border max-h-[50vh] overflow-y-auto">
                  {disableData.recommendations.map((r) => (
                    <label key={r.id} className="flex items-start gap-2 py-2 cursor-pointer hover:bg-surface-secondary/50">
                      <input
                        type="checkbox"
                        checked={disableSelected.has(r.id)}
                        onChange={(e) => {
                          const next = new Set(disableSelected);
                          if (e.target.checked) next.add(r.id);
                          else next.delete(r.id);
                          setDisableSelected(next);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-txt-primary">{r.keyword}</p>
                        <p className="text-xs text-red-600">{r.reason}</p>
                        <p className="text-[10px] text-txt-muted">
                          Posisi: {r.currentPosition ? "#" + r.currentPosition.toFixed(1) : "—"} ·
                          Impresi: {r.currentImpressions} · Klik: {r.currentClicks}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border">
                  <button onClick={() => setDisableData(null)} className="text-sm text-txt-secondary px-3 py-1.5 rounded-full hover:bg-surface-secondary">Batal</button>
                  <button
                    onClick={applyDisable}
                    disabled={disableSelected.size === 0 || disableLoading}
                    className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {disableLoading ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                    Disable {disableSelected.size} Keyword
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI Snippet Optimizer Modal */}
      {snippetData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSnippetData(null)}>
          <div className="bg-surface rounded-[12px] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-card-hover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-txt-primary flex items-center gap-2">
                  <Wand2 size={20} className="text-purple-600" /> AI Snippet Optimizer
                </h2>
                <p className="text-sm text-txt-muted">
                  Keyword: <code>{snippetData.keyword}</code> · Article: {snippetData.article.title.slice(0, 60)}...
                </p>
              </div>
              <button onClick={() => setSnippetData(null)} className="text-2xl text-txt-muted hover:text-txt-primary">×</button>
            </div>

            <div className="rounded-[8px] border border-border bg-surface-secondary p-3 mb-4 text-xs">
              <p className="font-medium text-txt-secondary mb-1">📋 Sekarang ({(snippetData.article.currentSeoTitle || "").length}/{(snippetData.article.currentSeoDesc || "").length} char):</p>
              <p className="text-txt-primary">{snippetData.article.currentSeoTitle || "(seoTitle kosong)"}</p>
              <p className="text-txt-muted mt-1">{snippetData.article.currentSeoDesc || "(seoDescription kosong)"}</p>
            </div>

            <h3 className="text-sm font-semibold text-txt-primary mb-3">✨ {snippetData.variants.length} Variasi AI</h3>
            <div className="space-y-3">
              {snippetData.variants.map((v) => (
                <div key={v.id} className="rounded-[10px] border border-purple-200 bg-purple-50/30 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-700">VARIANT {v.id}</span>
                    <span className="text-xs text-purple-600 italic">{v.angle}</span>
                  </div>
                  <p className="text-sm font-semibold text-txt-primary mb-1">{v.title}</p>
                  <p className="text-[10px] text-txt-muted mb-2">{v.titleLen || v.title.length} char</p>
                  <p className="text-xs text-txt-secondary mb-1">{v.description}</p>
                  <p className="text-[10px] text-txt-muted mb-3">{v.descLen || v.description.length} char</p>
                  <button
                    onClick={() => applyVariant(v.id)}
                    disabled={applyingVariant !== null}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {applyingVariant === v.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                    Apply ke Artikel
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Long-Tail Suggester Modal */}
      {suggestData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSuggestData(null)}>
          <div className="bg-surface rounded-[12px] max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-card-hover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-txt-primary flex items-center gap-2">
                  <Lightbulb size={20} className="text-blue-600" /> Long-Tail Keyword Suggestions
                </h2>
                <p className="text-sm text-txt-muted">
                  AI generate {suggestData.total} keyword baru berdasarkan topik artikel published JHB
                </p>
              </div>
              <button onClick={() => setSuggestData(null)} className="text-2xl text-txt-muted hover:text-txt-primary">×</button>
            </div>

            {suggestData.suggestions.length === 0 ? (
              <p className="text-center py-8 text-sm text-txt-muted">Tidak ada suggestion baru.</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3 text-xs">
                  <button
                    onClick={() => setSuggestSelected(new Set(suggestData.suggestions.map((_, i) => i)))}
                    className="rounded-full border border-border px-2 py-1 hover:bg-surface-secondary"
                  >Pilih semua</button>
                  <button
                    onClick={() => setSuggestSelected(new Set())}
                    className="rounded-full border border-border px-2 py-1 hover:bg-surface-secondary"
                  >Pilih none</button>
                  <button
                    onClick={() => setSuggestSelected(new Set(suggestData.suggestions.map((s, i) => s.priority === "HIGH" ? i : -1).filter(i => i >= 0)))}
                    className="rounded-full border border-red-200 bg-red-50 text-red-600 px-2 py-1 hover:bg-red-100"
                  >Hanya HIGH</button>
                  <span className="text-txt-muted ml-auto">{suggestSelected.size}/{suggestData.suggestions.length} dipilih</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto">
                  {suggestData.suggestions.map((s, i) => (
                    <label key={i} className="flex items-start gap-2 rounded-[8px] border border-border p-2 cursor-pointer hover:bg-surface-secondary/50">
                      <input
                        type="checkbox"
                        checked={suggestSelected.has(i)}
                        onChange={(e) => {
                          const next = new Set(suggestSelected);
                          if (e.target.checked) next.add(i);
                          else next.delete(i);
                          setSuggestSelected(next);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-txt-primary">{s.keyword}</p>
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_COLOR[s.priority]}`}>{s.priority}</span>
                          <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{s.category}</span>
                        </div>
                        {s.rationale && <p className="text-[10px] text-txt-muted mt-0.5">{s.rationale}</p>}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-border">
                  <button onClick={() => setSuggestData(null)} className="text-sm text-txt-secondary px-3 py-1.5 rounded-full hover:bg-surface-secondary">Batal</button>
                  <button
                    onClick={applySuggestions}
                    disabled={suggestSelected.size === 0 || suggestApplying}
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {suggestApplying ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Tambahkan {suggestSelected.size} Keyword
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Sorotan SEO Modal */}
      {sorotanData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSorotanData(null)}>
          <div className="bg-surface rounded-[12px] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-card-hover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-txt-primary flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" /> Sorotan SEO untuk &ldquo;{sorotanData.keyword}&rdquo;
                </h2>
                <p className="text-sm text-txt-muted">
                  Landing page SEO yang link ke artikel terkait, boost ranking keyword ini.
                </p>
              </div>
              <button onClick={() => setSorotanData(null)} className="text-2xl text-txt-muted hover:text-txt-primary">×</button>
            </div>

            <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 mb-4">
              <h3 className="text-sm font-semibold text-emerald-900 mb-1">✨ Cara Kerja</h3>
              <ul className="text-xs text-emerald-900 space-y-0.5 list-disc list-inside">
                <li>AI scan artikel JHB yang relevan dengan keyword ini</li>
                <li>Generate landing page komprehensif (800-1200 kata)</li>
                <li>Internal link ke artikel terkait sebagai &ldquo;Sumber&rdquo;</li>
                <li>Auto-submit ke Google Indexing API</li>
                <li>Render di <code>/sorotan/[slug]</code> dengan section &ldquo;Artikel Terkait&rdquo; prominent</li>
              </ul>
            </div>

            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-txt-muted">Jumlah:</span>
              <select
                value={sorotanGenerateCount}
                onChange={(e) => setSorotanGenerateCount(parseInt(e.target.value))}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs"
                disabled={sorotanGenerating === sorotanData.keywordId}
              >
                <option value={1}>1 sorotan</option>
                <option value={2}>2 sorotan (~2 menit)</option>
                <option value={3}>3 sorotan (~3 menit)</option>
                <option value={5}>5 sorotan (~5 menit)</option>
              </select>
              <button
                onClick={() => generateSorotan(sorotanData.keywordId, sorotanGenerateCount)}
                disabled={sorotanGenerating === sorotanData.keywordId}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {sorotanGenerating === sorotanData.keywordId ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate {sorotanGenerateCount} Sorotan
              </button>
            </div>
            {sorotanGenerateCount > 3 && (
              <div className="rounded-[6px] border border-yellow-200 bg-yellow-50 p-2 mb-3">
                <p className="text-[11px] text-yellow-800">
                  ⚠️ Generate &gt; 3 sorotan untuk 1 keyword berisiko duplicate content. Lebih baik <strong>Bulk Sorotan SEO</strong> ke banyak keyword berbeda.
                </p>
              </div>
            )}

            <h3 className="text-sm font-semibold text-txt-primary mb-2">📄 Sorotan Existing ({sorotanData.total})</h3>
            {sorotanData.sorotanList.length === 0 ? (
              <p className="text-center py-8 text-sm text-txt-muted">Belum ada sorotan. Klik tombol di atas untuk generate.</p>
            ) : (
              <div className="space-y-2">
                {sorotanData.sorotanList.map((s) => (
                  <div key={s.id} className="rounded-[8px] border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-txt-primary line-clamp-2">{s.title}</p>
                      <div className="flex gap-1 shrink-0">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-txt-secondary hover:bg-surface-secondary"
                        >
                          <ExternalLink size={10} /> Lihat
                        </a>
                        <button
                          onClick={() => deleteSorotan(sorotanData.keywordId, s.id)}
                          className="inline-flex items-center rounded-full border border-red-200 px-2 py-1 text-[11px] text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-txt-muted">
                      {s.relatedCount} artikel terkait · Index: {s.indexStatus || "pending"} · {new Date(s.createdAt).toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Sorotan SEO Modal */}
      {bulkSorotanModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => !bulkSorotanLoading && setBulkSorotanModal(false)}>
          <div className="bg-surface rounded-[12px] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-card-hover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-txt-primary flex items-center gap-2">
                  <FileText size={20} className="text-emerald-600" /> Bulk Generate Sorotan SEO
                </h2>
                <p className="text-sm text-txt-muted">
                  Generate 1 sorotan SEO untuk SETIAP keyword aktif yang punya bestArticle.
                </p>
              </div>
              {!bulkSorotanLoading && (
                <button onClick={() => setBulkSorotanModal(false)} className="text-2xl text-txt-muted hover:text-txt-primary">×</button>
              )}
            </div>

            <div className="rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 mb-4">
              <h3 className="text-sm font-semibold text-emerald-900 mb-2">📋 Cara Kerja Bulk</h3>
              <ul className="text-xs text-emerald-900 space-y-0.5 list-disc list-inside">
                <li>Process 5 keyword per batch (untuk timeout safety)</li>
                <li>Setiap keyword: 1 sorotan unik (angle &ldquo;panduan-lengkap&rdquo; default)</li>
                <li>Skip keyword yang sudah punya sorotan</li>
                <li>Total durasi: ±1-2 menit per keyword</li>
                <li>Jangan tutup tab — UI loop call sampai semua selesai</li>
              </ul>
            </div>

            {bulkSorotanProgress ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-txt-primary">
                    Progress: {bulkSorotanProgress.processed}/{bulkSorotanProgress.total}
                  </span>
                  <span className="text-txt-muted">
                    ✓ {bulkSorotanProgress.generated} · ✗ {bulkSorotanProgress.failed}
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${bulkSorotanProgress.total ? (bulkSorotanProgress.processed / bulkSorotanProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="rounded-[6px] border border-border bg-black/5 p-3 max-h-[40vh] overflow-y-auto">
                  <pre className="text-[11px] text-txt-secondary whitespace-pre-wrap font-mono">
                    {bulkSorotanProgress.log.join("\n")}
                  </pre>
                </div>
                {!bulkSorotanLoading && (
                  <button
                    onClick={() => { setBulkSorotanModal(false); setBulkSorotanProgress(null); }}
                    className="rounded-full bg-goto-green px-4 py-2 text-sm text-white hover:bg-goto-dark"
                  >
                    Selesai
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={bulkGenerateAllSorotan}
                  disabled={bulkSorotanLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {bulkSorotanLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Mulai Bulk Generate (Semua Active Keyword)
                </button>
                <button onClick={() => setBulkSorotanModal(false)} className="text-sm text-txt-secondary px-3 py-2 rounded-full hover:bg-surface-secondary">
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Help */}
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Cara Pakai</h3>
        <ol className="text-xs text-blue-900 space-y-1">
          <li><strong>1. Tambah keyword</strong> — set priority (HIGH untuk yg paling penting) + target posisi</li>
          <li><strong>2. Klik &ldquo;Sync GSC Sekarang&rdquo;</strong> — pull posisi terkini dari Google Search Console</li>
          <li><strong>3. Klik &ldquo;Analyze&rdquo;</strong> per keyword — lihat artikel mana yang bisa dioptimasi + action plan</li>
          <li><strong>4. Klik &ldquo;Boost&rdquo;</strong> — auto submit ke Google Indexing API + purge cache</li>
          <li><strong>5. Klik <Wand2 size={11} className="inline" /> per keyword</strong> — AI generate seoTitle + seoDescription baru</li>
          <li><strong>6. Tunggu 3-7 hari</strong> — sync ulang, lihat pergerakan posisi</li>
        </ol>
        <p className="text-xs text-blue-800 mt-2">
          <strong>AI Tools (atas)</strong>: <strong>Auto-Disable Generic</strong> bersih-bersih keyword tidak realistis · <strong>Suggest Long-Tail</strong> AI rekomendasi keyword baru.
        </p>
      </div>
    </div>
  );
}
