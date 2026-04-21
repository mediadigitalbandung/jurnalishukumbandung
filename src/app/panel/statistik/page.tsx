"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  FileText,
  Eye,
  MessageCircle,
  Hash,
  Users,
  TrendingUp,
  Globe,
  Search,
  BarChart3,
  Cloud,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Settings,
  Wifi,
  WifiOff,
  Download,
  X as XIcon,
} from "lucide-react";
import Link from "next/link";

// Consolidated Recharts imports — single webpack chunk instead of 15 separate chunks
const rechartsLoader = () => import(/* webpackChunkName: "recharts" */ "recharts");
const AreaChart = dynamic(() => rechartsLoader().then((m) => m.AreaChart), { ssr: false });
const BarChart = dynamic(() => rechartsLoader().then((m) => m.BarChart), { ssr: false });
const PieChart = dynamic(() => rechartsLoader().then((m) => m.PieChart), { ssr: false });
const LineChart = dynamic(() => rechartsLoader().then((m) => m.LineChart), { ssr: false });
const Area = dynamic(() => rechartsLoader().then((m) => m.Area), { ssr: false });
const Bar = dynamic(() => rechartsLoader().then((m) => m.Bar), { ssr: false });
const Pie = dynamic(() => rechartsLoader().then((m) => m.Pie), { ssr: false });
const Line = dynamic(() => rechartsLoader().then((m) => m.Line), { ssr: false });
const Cell = dynamic(() => rechartsLoader().then((m) => m.Cell), { ssr: false });
const XAxis = dynamic(() => rechartsLoader().then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => rechartsLoader().then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => rechartsLoader().then((m) => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => rechartsLoader().then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => rechartsLoader().then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => rechartsLoader().then((m) => m.ResponsiveContainer), { ssr: false });

const TABS = ["overview", "internal", "search-console", "analytics", "cloudflare"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, { label: string; icon: React.ElementType }> = {
  overview: { label: "Overview", icon: BarChart3 },
  internal: { label: "Internal", icon: FileText },
  "search-console": { label: "Search Console", icon: Search },
  analytics: { label: "Google Analytics", icon: TrendingUp },
  cloudflare: { label: "Cloudflare", icon: Cloud },
};

const PIE_COLORS = ["#00AA13", "#0088CC", "#FF9500", "#FF3B30", "#AF52DE", "#5856D6", "#34C759", "#FF6B00"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}rb`;
  return n.toString();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "green",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "green" | "blue" | "orange" | "red" | "purple";
}) {
  const colorMap = {
    green: "bg-green-50 text-goto-green",
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-500",
    red: "bg-red-50 text-red-500",
    purple: "bg-purple-50 text-purple-600",
  };
  return (
    <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${colorMap[color]}`}>
          <Icon size={22} />
        </div>
        <div>
          <p className="text-sm text-txt-secondary">{label}</p>
          <p className="text-2xl font-bold text-txt-primary">{value}</p>
          {sub && <p className="text-xs text-txt-muted mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function UnconfiguredCard({ title, keys }: { title: string; keys: string[] }) {
  return (
    <div className="rounded-[12px] border border-dashed border-border bg-surface-secondary p-8 text-center">
      <WifiOff size={40} className="mx-auto text-txt-muted mb-3" />
      <h3 className="text-lg font-semibold text-txt-primary mb-1">{title} Belum Dikonfigurasi</h3>
      <p className="text-sm text-txt-secondary mb-4">
        Masukkan credentials ke tabel <code className="bg-border px-1 rounded text-xs">system_settings</code> untuk mengaktifkan.
      </p>
      <div className="inline-block text-left bg-surface border border-border rounded-[10px] p-4 text-sm">
        <p className="font-semibold text-txt-primary mb-2">Keys yang dibutuhkan:</p>
        {keys.map((k) => (
          <div key={k} className="flex items-center gap-2 py-1">
            <Settings size={13} className="text-txt-muted flex-shrink-0" />
            <code className="text-xs text-goto-green">{k}</code>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Link
          href="/panel/pengaturan"
          className="inline-flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-medium text-white hover:bg-goto-dark transition-colors"
        >
          <Settings size={14} />
          Buka Pengaturan
        </Link>
      </div>
    </div>
  );
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ───── TABS ─────

function OverviewTab({
  internal,
  gsc,
  ga,
  cf,
}: {
  internal: Record<string, unknown> | null;
  gsc: Record<string, unknown> | null;
  ga: Record<string, unknown> | null;
  cf: Record<string, unknown> | null;
}) {
  const sum = (internal as { summary?: Record<string, number> } | null)?.summary;
  const gscTotals = (gsc as { totals?: Record<string, number> } | null)?.totals;
  const gaSummary = (ga as { summary?: Record<string, number> } | null)?.summary;
  const cfTotals = (cf as { totals?: Record<string, number> } | null)?.totals;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Artikel" value={formatNumber(sum?.publishedArticles || 0)} sub={`${sum?.draftArticles || 0} draft`} color="green" />
        <StatCard icon={Eye} label="Total Views" value={formatNumber(sum?.totalViews || 0)} color="blue" />
        <StatCard icon={MessageCircle} label="Komentar" value={formatNumber(sum?.totalComments || 0)} color="orange" />
        <StatCard icon={Users} label="Pengguna" value={formatNumber(sum?.totalUsers || 0)} sub={`${sum?.totalTags || 0} tags`} color="purple" />
      </div>

      {/* External sources summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Console */}
        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Search size={18} className="text-blue-500" />
            <h3 className="font-semibold text-txt-primary">Google Search Console</h3>
            {gsc && (gsc as { configured?: boolean }).configured !== false
              ? <CheckCircle size={14} className="text-goto-green ml-auto" />
              : <WifiOff size={14} className="text-txt-muted ml-auto" />}
          </div>
          {gscTotals ? (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div><p className="text-xl font-bold text-txt-primary">{formatNumber(gscTotals.clicks || 0)}</p><p className="text-xs text-txt-muted">Klik</p></div>
              <div><p className="text-xl font-bold text-txt-primary">{formatNumber(gscTotals.impressions || 0)}</p><p className="text-xs text-txt-muted">Impresi</p></div>
              <div><p className="text-xl font-bold text-txt-primary">{(gscTotals.avgCtr || 0).toFixed(1)}%</p><p className="text-xs text-txt-muted">CTR</p></div>
              <div><p className="text-xl font-bold text-txt-primary">#{(gscTotals.avgPosition || 0).toFixed(1)}</p><p className="text-xs text-txt-muted">Posisi</p></div>
            </div>
          ) : (
            <p className="text-sm text-txt-muted text-center py-4">Belum dikonfigurasi</p>
          )}
        </div>

        {/* GA4 */}
        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-orange-500" />
            <h3 className="font-semibold text-txt-primary">Google Analytics</h3>
            {ga && (ga as { configured?: boolean }).configured !== false
              ? <CheckCircle size={14} className="text-goto-green ml-auto" />
              : <WifiOff size={14} className="text-txt-muted ml-auto" />}
          </div>
          {gaSummary ? (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div><p className="text-xl font-bold text-txt-primary">{formatNumber(gaSummary.sessions || 0)}</p><p className="text-xs text-txt-muted">Sesi</p></div>
              <div><p className="text-xl font-bold text-txt-primary">{formatNumber(gaSummary.pageViews || 0)}</p><p className="text-xs text-txt-muted">Pageview</p></div>
              <div><p className="text-xl font-bold text-txt-primary">{(gaSummary.bounceRate || 0).toFixed(1)}%</p><p className="text-xs text-txt-muted">Bounce</p></div>
              <div><p className="text-xl font-bold text-txt-primary">{formatDuration(gaSummary.avgSessionDuration || 0)}</p><p className="text-xs text-txt-muted">Durasi</p></div>
            </div>
          ) : (
            <p className="text-sm text-txt-muted text-center py-4">Belum dikonfigurasi</p>
          )}
        </div>

        {/* Cloudflare */}
        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Cloud size={18} className="text-orange-400" />
            <h3 className="font-semibold text-txt-primary">Cloudflare</h3>
            {cf && (cf as { configured?: boolean }).configured !== false
              ? <CheckCircle size={14} className="text-goto-green ml-auto" />
              : <WifiOff size={14} className="text-txt-muted ml-auto" />}
          </div>
          {cfTotals ? (
            <div className="grid grid-cols-2 gap-3 text-center">
              <div><p className="text-xl font-bold text-txt-primary">{formatNumber((cfTotals as { requests?: number }).requests || 0)}</p><p className="text-xs text-txt-muted">Request</p></div>
              <div><p className="text-xl font-bold text-txt-primary">{formatBytes((cfTotals as { bytes?: number }).bytes || 0)}</p><p className="text-xs text-txt-muted">Bandwidth</p></div>
              <div><p className="text-xl font-bold text-txt-primary">{formatNumber((cfTotals as { uniques?: number }).uniques || 0)}</p><p className="text-xs text-txt-muted">Pengunjung</p></div>
              <div><p className="text-xl font-bold text-txt-primary">{(cfTotals as { cacheRatio?: number }).cacheRatio || 0}%</p><p className="text-xs text-txt-muted">Cache</p></div>
            </div>
          ) : (
            <p className="text-sm text-txt-muted text-center py-4">Belum dikonfigurasi</p>
          )}
        </div>
      </div>
    </div>
  );
}

function InternalTab({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <div className="text-center py-16 text-txt-muted">Memuat data...</div>;

  const articlesPerDay = (data.articlesPerDay as { date: string; count: number }[]) || [];
  const commentsPerDay = (data.commentsPerDay as { date: string; count: number }[]) || [];
  const categoryStats = (data.categoryStats as { name: string; count: number }[]) || [];
  const topTags = (data.topTags as { name: string; count: number }[]) || [];
  const topArticles = (data.topArticlesByViews as { title: string; slug: string; views: number; category: string }[]) || [];
  const summary = (data.summary as Record<string, number>) || {};

  const combined = articlesPerDay.map((d, i) => ({
    date: shortDate(d.date),
    artikel: d.count,
    komentar: commentsPerDay[i]?.count || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="Terbit" value={formatNumber(summary.publishedArticles || 0)} color="green" />
        <StatCard icon={FileText} label="Draft" value={formatNumber(summary.draftArticles || 0)} color="blue" />
        <StatCard icon={AlertCircle} label="Review" value={formatNumber(summary.reviewArticles || 0)} color="orange" />
        <StatCard icon={Hash} label="Total Tags" value={formatNumber(summary.totalTags || 0)} color="purple" />
      </div>

      {/* Artikel + Komentar per hari */}
      <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
        <h3 className="font-semibold text-txt-primary mb-4">Aktivitas 30 Hari Terakhir</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={combined} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradArtikel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00AA13" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#00AA13" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradKomentar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0088CC" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0088CC" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="artikel" stroke="#00AA13" fill="url(#gradArtikel)" strokeWidth={2} name="Artikel Terbit" />
            <Area type="monotone" dataKey="komentar" stroke="#0088CC" fill="url(#gradKomentar)" strokeWidth={2} name="Komentar" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category distribution */}
        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <h3 className="font-semibold text-txt-primary mb-4">Artikel per Kategori</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryStats} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {categoryStats.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top tags */}
        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <h3 className="font-semibold text-txt-primary mb-4">Top 20 Tags</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topTags.slice(0, 12)} layout="vertical" margin={{ left: 5, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#00AA13" radius={[0, 4, 4, 0]} name="Artikel" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top articles by views */}
      <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
        <h3 className="font-semibold text-txt-primary mb-4">Top 10 Artikel Terbanyak Dibaca</h3>
        <div className="space-y-2">
          {topArticles.map((a, i) => (
            <div key={a.slug} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <span className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-secondary text-sm font-bold text-txt-secondary flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-txt-primary truncate">{a.title}</p>
                <p className="text-xs text-txt-muted">{a.category}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Eye size={13} className="text-txt-muted" />
                <span className="text-sm font-semibold text-txt-primary">{formatNumber(a.views)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchConsoleTab({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <div className="text-center py-16 text-txt-muted">Memuat data...</div>;
  if ((data as { configured?: boolean }).configured === false) {
    return (
      <UnconfiguredCard
        title="Google Search Console"
        keys={["google_service_account", "search_console_site_url"]}
      />
    );
  }

  const totals = (data.totals as Record<string, number>) || {};
  const dailyData = (data.dailyData as { date: string; clicks: number; impressions: number; ctr: number; position: number }[]) || [];
  const topQueries = (data.topQueries as { query: string; clicks: number; impressions: number; ctr: number; position: number }[]) || [];
  const topPages = (data.topPages as { page: string; clicks: number; impressions: number }[]) || [];

  const chartData = dailyData.map((d) => ({ ...d, date: shortDate(d.date) }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Eye} label="Total Klik" value={formatNumber(totals.clicks || 0)} color="green" />
        <StatCard icon={Globe} label="Impresi" value={formatNumber(totals.impressions || 0)} color="blue" />
        <StatCard icon={TrendingUp} label="CTR Rata-rata" value={`${(totals.avgCtr || 0).toFixed(1)}%`} color="orange" />
        <StatCard icon={Search} label="Posisi Rata-rata" value={`#${(totals.avgPosition || 0).toFixed(1)}`} color="purple" />
      </div>

      {/* Clicks + Impressions trend */}
      <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
        <h3 className="font-semibold text-txt-primary mb-4">Klik & Impresi Harian</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#00AA13" strokeWidth={2} dot={false} name="Klik" />
            <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#0088CC" strokeWidth={2} dot={false} name="Impresi" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top queries — FULL TABLE dengan filter */}
      <KeywordsTable queries={topQueries} />

      {/* Top pages */}
      <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
        <h3 className="font-semibold text-txt-primary mb-4">Top Halaman</h3>
        <div className="space-y-2">
          {topPages.map((p, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
              <span className="w-6 text-xs text-txt-muted text-right flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-txt-primary truncate">{p.page.replace("https://jurnalishukumbandung.com", "")}</p>
                <p className="text-xs text-txt-muted">{formatNumber(p.impressions)} impresi</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-txt-primary">{formatNumber(p.clicks)}</p>
                <p className="text-xs text-txt-muted">klik</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───── KeywordsTable — List lengkap kata kunci dengan filter rank range + search + sort ─────

type Keyword = { query: string; clicks: number; impressions: number; ctr: number; position: number };
type RankRange = "all" | "1-3" | "4-10" | "11-20" | "21-50" | "51-100" | "100+";
type SortKey = "clicks" | "impressions" | "ctr" | "position";

const RANK_RANGES: { value: RankRange; label: string; min?: number; max?: number }[] = [
  { value: "all", label: "Semua" },
  { value: "1-3", label: "Top 3", min: 1, max: 3 },
  { value: "4-10", label: "4-10", min: 4, max: 10 },
  { value: "11-20", label: "11-20", min: 11, max: 20 },
  { value: "21-50", label: "21-50", min: 21, max: 50 },
  { value: "51-100", label: "51-100", min: 51, max: 100 },
  { value: "100+", label: "100+", min: 100.5 },
];

const SORT_OPTIONS: { value: SortKey; label: string; desc: boolean }[] = [
  { value: "clicks", label: "Klik (terbanyak)", desc: true },
  { value: "impressions", label: "Impresi (terbanyak)", desc: true },
  { value: "ctr", label: "CTR (tertinggi)", desc: true },
  { value: "position", label: "Posisi (terbaik)", desc: false },
];

function exportKeywordsCSV(keywords: Keyword[]) {
  const header = ["Kata Kunci", "Klik", "Impresi", "CTR (%)", "Posisi"];
  const rows = keywords.map(k => [
    `"${k.query.replace(/"/g, '""')}"`,
    k.clicks,
    k.impressions,
    k.ctr,
    k.position,
  ]);
  const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `keywords-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function KeywordsTable({ queries }: { queries: Keyword[] }) {
  const [rankFilter, setRankFilter] = useState<RankRange>("all");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("clicks");
  const [visibleCount, setVisibleCount] = useState(20);

  // Count per range (untuk badge di filter buttons)
  const countsByRange: Record<RankRange, number> = {
    all: queries.length,
    "1-3": queries.filter(q => q.position >= 1 && q.position <= 3).length,
    "4-10": queries.filter(q => q.position > 3 && q.position <= 10).length,
    "11-20": queries.filter(q => q.position > 10 && q.position <= 20).length,
    "21-50": queries.filter(q => q.position > 20 && q.position <= 50).length,
    "51-100": queries.filter(q => q.position > 50 && q.position <= 100).length,
    "100+": queries.filter(q => q.position > 100).length,
  };

  // Filter + search
  const filtered = queries.filter(q => {
    // Rank filter
    const range = RANK_RANGES.find(r => r.value === rankFilter);
    if (range?.min !== undefined && q.position < range.min) return false;
    if (range?.max !== undefined && q.position > range.max) return false;
    // Search filter
    if (searchText.trim() && !q.query.toLowerCase().includes(searchText.toLowerCase().trim())) return false;
    return true;
  });

  // Sort
  const sortOption = SORT_OPTIONS.find(s => s.value === sortBy)!;
  const sorted = [...filtered].sort((a, b) => {
    const diff = (b[sortBy] as number) - (a[sortBy] as number);
    return sortOption.desc ? diff : -diff;
  });

  const visible = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > visibleCount;

  return (
    <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h3 className="font-semibold text-txt-primary">
          Kata Kunci <span className="text-sm font-normal text-txt-muted">({sorted.length.toLocaleString("id-ID")} dari {queries.length.toLocaleString("id-ID")})</span>
        </h3>
        <button
          onClick={() => exportKeywordsCSV(sorted)}
          disabled={sorted.length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-goto-green px-3 py-1.5 text-xs font-medium text-white hover:bg-goto-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Filter rank range */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-xs text-txt-secondary">Rank:</span>
        {RANK_RANGES.map(r => (
          <button
            key={r.value}
            onClick={() => { setRankFilter(r.value); setVisibleCount(20); }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              rankFilter === r.value
                ? "bg-goto-green text-white"
                : "bg-surface-secondary text-txt-secondary hover:bg-border"
            }`}
          >
            {r.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              rankFilter === r.value ? "bg-white/20" : "bg-border text-txt-muted"
            }`}>
              {countsByRange[r.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => { setSearchText(e.target.value); setVisibleCount(20); }}
            placeholder="Cari kata kunci..."
            className="w-full rounded-full border border-border bg-surface pl-9 pr-9 py-2 text-sm focus:border-goto-green focus:outline-none"
          />
          {searchText && (
            <button
              onClick={() => setSearchText("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-primary"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm focus:border-goto-green focus:outline-none"
        >
          {SORT_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[40px_1fr_80px_80px_70px_70px] gap-3 pb-2 mb-1 border-b border-border text-xs font-medium text-txt-muted uppercase tracking-wide">
        <span className="text-right">#</span>
        <span>Kata Kunci</span>
        <span className="text-right">Klik</span>
        <span className="text-right">Impresi</span>
        <span className="text-right">CTR</span>
        <span className="text-right">Posisi</span>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-txt-muted">
          {queries.length === 0 ? "Belum ada data kata kunci" : "Tidak ada kata kunci yang cocok dengan filter"}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((q, i) => (
            <div key={`${q.query}-${i}`} className="grid grid-cols-[40px_1fr_80px_80px_70px_70px] gap-3 py-2.5 items-center text-sm">
              <span className="text-right text-xs text-txt-muted">{i + 1}</span>
              <span className="text-txt-primary truncate" title={q.query}>{q.query}</span>
              <span className="text-right font-semibold text-txt-primary">{formatNumber(q.clicks)}</span>
              <span className="text-right text-txt-secondary">{formatNumber(q.impressions)}</span>
              <span className="text-right text-txt-secondary">{q.ctr.toFixed(1)}%</span>
              <span className={`text-right font-medium ${
                q.position <= 3 ? "text-goto-green" :
                q.position <= 10 ? "text-blue-600" :
                q.position <= 20 ? "text-orange-500" :
                "text-txt-muted"
              }`}>#{q.position.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisibleCount(c => c + 50)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-4 py-2 text-xs font-medium text-txt-secondary hover:bg-border transition-colors"
          >
            Muat {Math.min(50, sorted.length - visibleCount)} lagi ({sorted.length - visibleCount} tersisa)
          </button>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <div className="text-center py-16 text-txt-muted">Memuat data...</div>;
  if ((data as { configured?: boolean }).configured === false) {
    return (
      <UnconfiguredCard
        title="Google Analytics GA4"
        keys={["google_service_account", "ga4_property_id"]}
      />
    );
  }

  const summary = (data.summary as Record<string, number> | null);
  const dailyData = (data.dailyData as { date: string; sessions: number; pageViews: number; newUsers: number }[]) || [];
  const deviceData = (data.deviceData as { device: string; sessions: number; pageViews: number }[]) || [];
  const countryData = (data.countryData as { country: string; sessions: number }[]) || [];

  const chartData = dailyData.map((d) => ({ ...d, date: shortDate(d.date) }));
  const totalSessionsForPercent = deviceData.reduce((a, d) => a + d.sessions, 0);

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={Users} label="Sesi" value={formatNumber(summary.sessions || 0)} color="green" />
          <StatCard icon={Eye} label="Pageview" value={formatNumber(summary.pageViews || 0)} color="blue" />
          <StatCard icon={TrendingUp} label="User Baru" value={formatNumber(summary.newUsers || 0)} color="orange" />
          <StatCard icon={Globe} label="Total User" value={formatNumber(summary.totalUsers || 0)} color="purple" />
          <StatCard icon={AlertCircle} label="Bounce Rate" value={`${(summary.bounceRate || 0).toFixed(1)}%`} color="red" />
          <StatCard icon={CheckCircle} label="Durasi/Sesi" value={formatDuration(summary.avgSessionDuration || 0)} color="green" />
        </div>
      )}

      {/* Sessions + Pageviews trend */}
      <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
        <h3 className="font-semibold text-txt-primary mb-4">Sesi & Pageview Harian</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00AA13" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00AA13" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradPageviews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0088CC" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0088CC" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="sessions" stroke="#00AA13" fill="url(#gradSessions)" strokeWidth={2} name="Sesi" />
            <Area type="monotone" dataKey="pageViews" stroke="#0088CC" fill="url(#gradPageviews)" strokeWidth={2} name="Pageview" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device breakdown */}
        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <h3 className="font-semibold text-txt-primary mb-4">Perangkat Pengunjung</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={deviceData} dataKey="sessions" nameKey="device" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {deviceData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {deviceData.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="capitalize text-txt-primary">{d.device}</span>
                </div>
                <span className="text-txt-secondary">{totalSessionsForPercent > 0 ? Math.round((d.sessions / totalSessionsForPercent) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top countries */}
        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <h3 className="font-semibold text-txt-primary mb-4">Asal Pengunjung (Top 10)</h3>
          <div className="space-y-2">
            {countryData.map((c, i) => {
              const maxSessions = countryData[0]?.sessions || 1;
              const pct = Math.round((c.sessions / maxSessions) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-txt-muted text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm text-txt-primary">{c.country}</span>
                      <span className="text-sm font-semibold text-txt-primary">{formatNumber(c.sessions)}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-secondary overflow-hidden">
                      <div className="h-full bg-goto-green rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CloudflareTab({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <div className="text-center py-16 text-txt-muted">Memuat data...</div>;
  if ((data as { configured?: boolean }).configured === false) {
    return (
      <UnconfiguredCard
        title="Cloudflare"
        keys={["cloudflare_api_token", "cloudflare_zone_id"]}
      />
    );
  }

  const totals = (data.totals as Record<string, number> | null);
  const dailyData = (data.dailyData as { date: string; requests: number; pageViews: number; bytes: number; uniques: number; threats: number }[]) || [];
  const chartData = dailyData.map((d) => ({ ...d, date: shortDate(d.date), bandwidth: Math.round(d.bytes / 1048576) }));

  return (
    <div className="space-y-6">
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={Globe} label="Total Request" value={formatNumber(totals.requests || 0)} color="orange" />
          <StatCard icon={Wifi} label="Bandwidth" value={formatBytes(totals.bytes || 0)} color="blue" />
          <StatCard icon={Users} label="Pengunjung Unik" value={formatNumber(totals.uniques || 0)} color="green" />
          <StatCard icon={CheckCircle} label="Cache Ratio" value={`${totals.cacheRatio || 0}%`} color="purple" />
        </div>
      )}

      {/* Requests trend */}
      <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
        <h3 className="font-semibold text-txt-primary mb-4">Traffic Harian (Requests)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRequests" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF9500" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF9500" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradUniques" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00AA13" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00AA13" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="requests" stroke="#FF9500" fill="url(#gradRequests)" strokeWidth={2} name="Request" />
            <Area type="monotone" dataKey="uniques" stroke="#00AA13" fill="url(#gradUniques)" strokeWidth={2} name="Pengunjung Unik" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bandwidth + threats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <h3 className="font-semibold text-txt-primary mb-4">Bandwidth Harian (MB)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} MB`, "Bandwidth"]} />
              <Bar dataKey="bandwidth" fill="#0088CC" radius={[3, 3, 0, 0]} name="Bandwidth (MB)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <h3 className="font-semibold text-txt-primary mb-4">Ancaman Terblokir Harian</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="threats" fill="#FF3B30" radius={[3, 3, 0, 0]} name="Ancaman" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ───── MAIN PAGE ─────

export default function StatistikPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [internalData, setInternalData] = useState<Record<string, unknown> | null>(null);
  const [gscData, setGscData] = useState<Record<string, unknown> | null>(null);
  const [gaData, setGaData] = useState<Record<string, unknown> | null>(null);
  const [cfData, setCfData] = useState<Record<string, unknown> | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [intRes, gscRes, gaRes, cfRes] = await Promise.all([
        fetch("/api/stats/internal"),
        fetch(`/api/stats/google-search?days=${days}`),
        fetch(`/api/stats/google-analytics?days=${days}`),
        fetch(`/api/stats/cloudflare?days=${days}`),
      ]);
      const [intJson, gscJson, gaJson, cfJson] = await Promise.all([
        intRes.json(),
        gscRes.json(),
        gaRes.json(),
        cfRes.json(),
      ]);
      setInternalData(intJson.data || null);
      setGscData(gscJson.data || null);
      setGaData(gaJson.data || null);
      setCfData(cfJson.data || null);
      setLastUpdated(new Date());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-txt-primary">Statistik Website</h1>
          <p className="text-sm text-txt-secondary mt-0.5">
            {lastUpdated
              ? `Diperbarui: ${lastUpdated.toLocaleTimeString("id-ID")}`
              : "Memuat data..."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-txt-primary focus:outline-none focus:ring-2 focus:ring-goto-green"
          >
            <option value={7}>7 hari</option>
            <option value={30}>30 hari</option>
            <option value={60}>60 hari</option>
            <option value={90}>90 hari</option>
          </select>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-medium text-white hover:bg-goto-dark transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto rounded-[12px] bg-surface-secondary p-1 border border-border">
        {TABS.map((tab) => {
          const { label, icon: Icon } = TAB_LABELS[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-[10px] px-4 py-2.5 text-sm font-medium transition-colors flex-shrink-0 ${
                activeTab === tab
                  ? "bg-surface text-txt-primary shadow-card"
                  : "text-txt-secondary hover:text-txt-primary"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-txt-muted">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-goto-green border-t-transparent" />
          Memuat data...
        </div>
      )}

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab internal={internalData} gsc={gscData} ga={gaData} cf={cfData} />
      )}
      {activeTab === "internal" && <InternalTab data={internalData} />}
      {activeTab === "search-console" && <SearchConsoleTab data={gscData} />}
      {activeTab === "analytics" && <AnalyticsTab data={gaData} />}
      {activeTab === "cloudflare" && <CloudflareTab data={cfData} />}
    </div>
  );
}
