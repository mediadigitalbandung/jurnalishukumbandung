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
  };
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
                {Object.entries(analyzeResult.bestArticle.signals).map(([k, v]) => (
                  <div key={k} className={v ? "text-goto-green" : "text-red-600"}>
                    {v ? "✓" : "✗"} {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </div>
                ))}
              </div>
            </div>

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

            <h3 className="text-sm font-semibold text-txt-primary mb-2">📰 Related Articles ({analyzeResult.relatedArticles.length})</h3>
            <div className="space-y-1 mb-4">
              {analyzeResult.relatedArticles.slice(0, 5).map((a) => (
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

      {/* Help */}
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Cara Pakai</h3>
        <ol className="text-xs text-blue-900 space-y-1">
          <li><strong>1. Tambah keyword</strong> — set priority (HIGH untuk yg paling penting) + target posisi</li>
          <li><strong>2. Klik "Sync GSC Sekarang"</strong> — pull posisi terkini dari Google Search Console</li>
          <li><strong>3. Klik "Analyze"</strong> per keyword — lihat artikel mana yang bisa dioptimasi + action plan</li>
          <li><strong>4. Klik "Boost"</strong> — auto submit ke Google Indexing API + purge cache</li>
          <li><strong>5. Tunggu 3-7 hari</strong> — sync ulang, lihat pergerakan posisi</li>
        </ol>
        <p className="text-xs text-blue-800 mt-2"><strong>Auto-sync</strong>: cron daily. Manual sync kapan saja via tombol di atas.</p>
      </div>
    </div>
  );
}
