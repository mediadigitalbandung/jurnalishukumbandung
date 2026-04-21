"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Megaphone,
  XCircle,
  Send,
  BarChart3,
  Layers,
  CalendarClock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  AlertCircle,
  Sparkles,
  Bot,
} from "lucide-react";

import { CREATOR_ROLES, EDITOR_ROLES } from "@/lib/roles";
import { statusColors, statusLabels } from "@/lib/article-status";
import type { Article, StatsItem } from "./_components/types";
import { formatNumber, formatDate, getTimeAgo } from "./_components/types";
import LoadingSkeleton from "./_components/LoadingSkeleton";
import RecentActivity from "./_components/RecentActivity";
import WeeklyArticleTrend from "./_components/WeeklyArticleTrend";
import CategoryPerformance from "./_components/CategoryPerformance";

// Top articles ranked by views with horizontal bar
function ViewsRanking({ articles }: { articles: Article[] }) {
  const data = useMemo(() => {
    return [...articles]
      .filter((a) => a.status === "PUBLISHED")
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 10);
  }, [articles]);

  const totalViews = articles.filter(a => a.status === "PUBLISHED").reduce((s, a) => s + (a.viewCount || 0), 0);
  const publishedCount = articles.filter(a => a.status === "PUBLISHED").length;
  const avgViews = publishedCount > 0 ? Math.round(totalViews / publishedCount) : 0;
  const maxViews = data[0]?.viewCount || 1;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-txt-primary">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-goto-light">
            <TrendingUp size={16} className="text-goto-green" />
          </div>
          Statistik Tayangan
        </h2>
      </div>
      <div className="p-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-surface-secondary p-4">
            <p className="text-xs text-txt-muted mb-1">Total Tayangan</p>
            <p className="text-2xl font-extrabold text-txt-primary">{formatNumber(totalViews)}</p>
          </div>
          <div className="rounded-xl bg-surface-secondary p-4">
            <p className="text-xs text-txt-muted mb-1">Artikel Terpublikasi</p>
            <p className="text-2xl font-extrabold text-txt-primary">{formatNumber(publishedCount)}</p>
          </div>
          <div className="rounded-xl bg-surface-secondary p-4">
            <p className="text-xs text-txt-muted mb-1">Rata-rata/Artikel</p>
            <p className="text-2xl font-extrabold text-txt-primary">{formatNumber(avgViews)}</p>
          </div>
        </div>

        {/* Ranked bar list */}
        <p className="text-sm font-semibold text-txt-secondary mb-3">Top 10 Artikel Terpopuler</p>
        {data.length === 0 ? (
          <p className="text-sm text-txt-muted py-4 text-center">Belum ada artikel terpublikasi.</p>
        ) : (
          <div className="space-y-3">
            {data.map((article, i) => {
              const pct = (article.viewCount / maxViews) * 100;
              return (
                <Link
                  key={article.id}
                  href={`/panel/artikel/${article.id}/edit`}
                  className="block group"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                      i < 3 ? "bg-goto-green text-white" : "bg-surface-tertiary text-txt-secondary"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-txt-primary truncate group-hover:text-goto-green transition-colors">
                      {article.title}
                    </span>
                    <span className="text-sm font-bold text-txt-primary shrink-0">
                      {formatNumber(article.viewCount)}
                    </span>
                  </div>
                  <div className="ml-9 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i === 0 ? "bg-goto-green" : i < 3 ? "bg-goto-green/70" : "bg-goto-green/30"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Creator-specific stats component
function MyArticleStats({ articles }: { articles: Article[] }) {
  const totalViews = articles.reduce((s, a) => s + (a.viewCount || 0), 0);
  const avgViews = articles.length > 0 ? Math.round(totalViews / articles.length) : 0;
  const totalArticles = articles.length;

  // Top 5 articles by views
  const top5 = useMemo(() => {
    return [...articles]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5);
  }, [articles]);
  const maxViews = top5[0]?.viewCount || 1;

  // Status breakdown
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    articles.forEach((a) => {
      map.set(a.status, (map.get(a.status) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [articles]);

  // Monthly productivity (last 6 months)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { label: string; count: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
      const monthNum = d.getMonth();
      const yearNum = d.getFullYear();
      const count = articles.filter((a) => {
        const created = new Date(a.createdAt);
        return created.getMonth() === monthNum && created.getFullYear() === yearNum;
      }).length;
      months.push({ label, count });
    }
    return months;
  }, [articles]);
  const maxMonthly = Math.max(...monthlyData.map((m) => m.count), 1);

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
      <div className="border-b border-border px-6 py-5">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-txt-primary">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-goto-light">
            <TrendingUp size={16} className="text-goto-green" />
          </div>
          Statistik Artikel Saya
        </h2>
      </div>
      <div className="p-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-surface-secondary p-4">
            <p className="text-xs text-txt-muted mb-1">Total Views Saya</p>
            <p className="text-2xl font-extrabold text-txt-primary">{formatNumber(totalViews)}</p>
          </div>
          <div className="rounded-xl bg-surface-secondary p-4">
            <p className="text-xs text-txt-muted mb-1">Rata-rata Views/Artikel</p>
            <p className="text-2xl font-extrabold text-txt-primary">{formatNumber(avgViews)}</p>
          </div>
          <div className="rounded-xl bg-surface-secondary p-4">
            <p className="text-xs text-txt-muted mb-1">Total Artikel Saya</p>
            <p className="text-2xl font-extrabold text-txt-primary">{formatNumber(totalArticles)}</p>
          </div>
        </div>

        {/* Status breakdown */}
        {statusBreakdown.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold text-txt-secondary mb-3">Artikel per Status</p>
            <div className="flex flex-wrap gap-2">
              {statusBreakdown.map(([status, count]) => (
                <span key={status} className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[status] || "bg-surface-tertiary text-txt-secondary"}`}>
                  {statusLabels[status] || status}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Top 5 articles by views */}
        <p className="text-sm font-semibold text-txt-secondary mb-3">Top 5 Artikel Saya</p>
        {top5.length === 0 ? (
          <p className="text-sm text-txt-muted py-4 text-center">Belum ada artikel.</p>
        ) : (
          <div className="space-y-3 mb-6">
            {top5.map((article, i) => {
              const pct = (article.viewCount / maxViews) * 100;
              return (
                <Link
                  key={article.id}
                  href={`/panel/artikel/${article.id}/edit`}
                  className="block group"
                >
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                      i < 3 ? "bg-goto-green text-white" : "bg-surface-tertiary text-txt-secondary"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-txt-primary truncate group-hover:text-goto-green transition-colors">
                      {article.title}
                    </span>
                    <span className="text-sm font-bold text-txt-primary shrink-0">
                      {formatNumber(article.viewCount)}
                    </span>
                  </div>
                  <div className="ml-9 h-2 rounded-full bg-surface-tertiary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i === 0 ? "bg-goto-green" : i < 3 ? "bg-goto-green/70" : "bg-goto-green/30"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Monthly productivity */}
        <p className="text-sm font-semibold text-txt-secondary mb-3">Produktivitas Bulanan</p>
        <div className="space-y-2">
          {monthlyData.map((month, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-20 text-xs text-txt-secondary text-right shrink-0 font-medium">
                {month.label}
              </span>
              <div className="flex-1 h-5 bg-surface-secondary rounded-md overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-goto-green to-goto-dark rounded-md transition-all duration-500 flex items-center justify-end pr-1.5"
                  style={{ width: `${(month.count / maxMonthly) * 100}%`, minWidth: month.count > 0 ? "24px" : "0px" }}
                >
                  {month.count > 0 && (
                    <span className="text-xs font-bold text-white">{month.count}</span>
                  )}
                </div>
              </div>
              {month.count === 0 && (
                <span className="w-4 text-xs text-txt-muted text-right">0</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function ArticleCalendar({ articles }: { articles: Article[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  // Map: day number -> articles for that day
  const dayArticles = useMemo(() => {
    const map = new Map<number, Article[]>();
    articles.forEach((a) => {
      const dateStr = a.publishedAt || a.scheduledAt || a.createdAt;
      if (!dateStr) return;
      const d = new Date(dateStr);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        const arr = map.get(day) || [];
        arr.push(a);
        map.set(day, arr);
      }
    });
    return map;
  }, [articles, year, month]);

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  }

  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedArticles = selectedDay ? dayArticles.get(selectedDay) || [] : [];

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
      <div className="border-b border-border px-5 py-3.5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-txt-primary">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-goto-light">
            <Calendar size={14} className="text-goto-green" />
          </div>
          Kalender Artikel
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn-ghost rounded-lg p-3" aria-label="Bulan sebelumnya">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-txt-primary min-w-[140px] text-center">{monthName}</span>
          <button onClick={nextMonth} className="btn-ghost rounded-lg p-3" aria-label="Bulan berikutnya">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row">
        {/* Calendar grid — left side */}
        <div className="p-4 lg:w-1/2 lg:border-r lg:border-border">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {dayNames.map((dn) => (
              <div key={dn} className="text-center text-xs font-semibold text-txt-muted uppercase tracking-wider py-1">
                {dn}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} className="h-10" />;
              const count = dayArticles.get(day)?.length || 0;
              const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
              const isSelected = selectedDay === day;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-sm font-medium transition-colors ${
                    isSelected ? "bg-goto-green text-white" : isToday ? "bg-goto-light text-goto-green font-bold" : count > 0 ? "bg-surface-secondary text-txt-primary hover:bg-goto-light" : "text-txt-muted hover:bg-surface-secondary"
                  }`}
                  aria-label={`${day} ${monthName}${count > 0 ? `, ${count} artikel` : ""}`}
                >
                  {day}
                  {count > 0 && (
                    <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isSelected ? "bg-white" : "bg-goto-green"}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Article list — right side, scrollable */}
        <div className="lg:w-1/2 border-t lg:border-t-0 border-border">
          <div className="px-4 py-3 border-b border-border bg-surface-secondary/50">
            <p className="text-xs font-semibold text-txt-secondary">
              {selectedDay ? `Artikel tanggal ${selectedDay} ${monthName}` : "Klik tanggal untuk lihat artikel"}
              {selectedDay !== null && selectedArticles.length > 0 && (
                <span className="ml-2 text-goto-green">({selectedArticles.length} artikel)</span>
              )}
            </p>
          </div>
          <div className="max-h-[280px] overflow-y-auto">
            {selectedDay === null ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-txt-muted">
                <div className="text-center">
                  <Calendar size={32} className="mx-auto text-border mb-2" />
                  <p>Pilih tanggal di kalender</p>
                </div>
              </div>
            ) : selectedArticles.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-txt-muted">
                Tidak ada artikel pada tanggal ini.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {selectedArticles.map((a) => (
                  <Link
                    key={a.id}
                    href={`/panel/artikel/${a.id}/edit`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-secondary/50 transition-colors"
                  >
                    <span className={`h-2 w-2 rounded-full shrink-0 ${
                      a.status === "PUBLISHED" ? "bg-goto-green" : a.status === "APPROVED" ? "bg-blue-500" : a.status === "IN_REVIEW" ? "bg-yellow-500" : "bg-gray-400"
                    }`} />
                    <span className="flex-1 text-sm font-medium text-txt-primary truncate">{a.title}</span>
                    <span className={`shrink-0 text-xs rounded px-2 py-0.5 font-semibold ${statusColors[a.status] || "bg-surface-tertiary text-txt-secondary"}`}>
                      {statusLabels[a.status] || a.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || "";
  const userId = session?.user?.id || "";
  const isCreator = CREATOR_ROLES.includes(userRole);
  const isEditorRole = EDITOR_ROLES.includes(userRole);
  const isAdmin = userRole === "SUPER_ADMIN";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsItem[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]);
  const [alerts, setAlerts] = useState<{ type: "warning" | "info" | "success"; message: string; icon: React.ElementType }[]>([]);

  const fetchData = useCallback(async () => {
      if (!session?.user) return;
      try {
        setLoading(true);
        setError(null);

        // Creators fetch only their articles; editors/admins fetch all
        // Limit reduced from 1000 -> 100 to avoid memory/bandwidth bloat (audit fix)
        const articlesUrl = isCreator
          ? `/api/articles?limit=100&status=ALL&authorId=${userId}`
          : `/api/articles?limit=100&status=ALL`;

        const fetches: Promise<Response>[] = [fetch(articlesUrl)];
        // Only admins/editors see reports + sorotan/auto counts
        if (!isCreator) {
          fetches.push(fetch("/api/reports"));
          fetches.push(fetch("/api/seo/generate-sorotan-single?counts=true").catch(() => new Response(JSON.stringify({ success: false }))));
        }

        const results = await Promise.all(fetches);

        let fetchedArticles: Article[] = [];
        let reportsPending = 0;
        let sorotanTotal = 0;

        if (results[0].ok) {
          const articlesJson = await results[0].json();
          fetchedArticles = articlesJson.data?.articles || [];
        }

        if (!isCreator && results[1]?.ok) {
          const reportsJson = await results[1].json();
          reportsPending = reportsJson.data?.pendingCount || 0;
        }

        if (!isCreator && results[2]?.ok) {
          const sorotanJson = await results[2].json();
          const counts = sorotanJson.data?.counts || {};
          sorotanTotal = Object.values(counts).reduce((sum: number, c: any) => sum + (c || 0), 0);
        }

        // Count auto-generated articles (isAutoGenerated = true)
        const autoArticleCount = fetchedArticles.filter((a: any) => a.isAutoGenerated).length;

        // Store all articles for analytics
        setAllArticles(fetchedArticles);

        // Build stats based on role (check isAdmin first since SUPER_ADMIN is also in EDITOR_ROLES)
        if (isAdmin) {
          // Admin (SUPER_ADMIN): full stats
          const totalArticles = fetchedArticles.length;
          const totalViews = fetchedArticles.reduce((sum, a) => sum + (a.viewCount || 0), 0);
          const pendingReview = fetchedArticles.filter((a) => a.status === "IN_REVIEW").length;
          const published = fetchedArticles.filter((a) => a.status === "PUBLISHED").length;
          const scheduled = fetchedArticles.filter((a) => a.scheduledAt && a.status === "APPROVED").length;
          const today = new Date().toDateString();
          const todayViews = fetchedArticles
            .filter((a) => a.publishedAt && new Date(a.publishedAt).toDateString() === today)
            .reduce((sum, a) => sum + (a.viewCount || 0), 0);

          setStats([
            { label: "Total Artikel", value: formatNumber(totalArticles), icon: FileText, color: "text-blue-500 bg-blue-50", cardBg: "bg-blue-50/40", borderColor: "border-l-blue-500" },
            { label: "Total Tayangan", value: formatNumber(totalViews), icon: Eye, color: "text-goto-green bg-goto-light", cardBg: "bg-emerald-50/40", borderColor: "border-l-goto-green" },
            { label: "Menunggu Review", value: pendingReview.toString(), icon: Clock, color: "text-yellow-500 bg-yellow-50", cardBg: "bg-amber-50/40", borderColor: "border-l-yellow-500" },
            { label: "Dipublikasi", value: formatNumber(published), icon: CheckCircle, color: "text-goto-green bg-goto-light", cardBg: "bg-emerald-50/40", borderColor: "border-l-goto-green" },
            { label: "Sorotan SEO", value: formatNumber(sorotanTotal), icon: Sparkles, color: "text-pink-500 bg-pink-50", cardBg: "bg-pink-50/40", borderColor: "border-l-pink-500" },
            { label: "Auto-Artikel", value: formatNumber(autoArticleCount), icon: Bot, color: "text-indigo-500 bg-indigo-50", cardBg: "bg-indigo-50/40", borderColor: "border-l-indigo-500" },
            { label: "Dijadwalkan", value: scheduled.toString(), icon: CalendarClock, color: "text-blue-500 bg-blue-50", cardBg: "bg-indigo-50/40", borderColor: "border-l-indigo-500" },
            { label: "Laporan Masuk", value: reportsPending.toString(), icon: AlertTriangle, color: "text-red-500 bg-red-50", cardBg: "bg-red-50/40", borderColor: "border-l-red-500" },
            { label: "Tayangan Hari Ini", value: formatNumber(todayViews), icon: TrendingUp, color: "text-purple-500 bg-purple-50", cardBg: "bg-purple-50/40", borderColor: "border-l-purple-500" },
          ]);

          const sorted = [...fetchedArticles].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setRecentArticles(sorted.slice(0, 5));

          // Build alerts
          const newAlerts: typeof alerts = [];
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const thisWeekArticles = fetchedArticles.filter(
            (a) => a.status === "PUBLISHED" && a.publishedAt && new Date(a.publishedAt) >= weekAgo
          );
          if (thisWeekArticles.length < 5) {
            newAlerts.push({
              type: "warning",
              icon: AlertCircle,
              message: `Hanya ${thisWeekArticles.length} artikel dipublikasi minggu ini. Target minimal 5 artikel/minggu untuk menjaga traffic.`,
            });
          }
          if (thisWeekArticles.length === 0) {
            newAlerts.push({
              type: "warning",
              icon: AlertTriangle,
              message: "Belum ada artikel baru minggu ini! Segera publish artikel untuk menjaga konsistensi.",
            });
          }
          // Viral articles (>50 views)
          const viralArticles = fetchedArticles
            .filter((a) => a.status === "PUBLISHED" && a.viewCount >= 50)
            .sort((a, b) => b.viewCount - a.viewCount);
          if (viralArticles.length > 0) {
            newAlerts.push({
              type: "info",
              icon: Flame,
              message: `${viralArticles.length} artikel sedang viral! "${viralArticles[0].title.substring(0, 50)}..." (${viralArticles[0].viewCount} views)`,
            });
          }
          // Pending review alert
          if (pendingReview > 0) {
            newAlerts.push({
              type: "warning",
              icon: Clock,
              message: `${pendingReview} artikel menunggu review. Segera review agar tidak menumpuk.`,
            });
          }
          setAlerts(newAlerts);

        } else if (isCreator) {
          // Creator stats: my articles, my drafts, pending review, published
          const myTotal = fetchedArticles.length;
          const myDrafts = fetchedArticles.filter((a) => a.status === "DRAFT").length;
          const myPendingReview = fetchedArticles.filter((a) => a.status === "IN_REVIEW").length;
          const myPublished = fetchedArticles.filter((a) => a.status === "PUBLISHED").length;

          setStats([
            { label: "Artikel Saya", value: formatNumber(myTotal), icon: FileText, color: "text-blue-500 bg-blue-50", cardBg: "bg-blue-50/40", borderColor: "border-l-blue-500" },
            { label: "Draf Saya", value: myDrafts.toString(), icon: FileText, color: "text-surface-tertiary bg-surface-secondary", cardBg: "bg-gray-50/40", borderColor: "border-l-gray-400" },
            { label: "Menunggu Review", value: myPendingReview.toString(), icon: Clock, color: "text-yellow-500 bg-yellow-50", cardBg: "bg-amber-50/40", borderColor: "border-l-yellow-500" },
            { label: "Dipublikasi", value: formatNumber(myPublished), icon: CheckCircle, color: "text-goto-green bg-goto-light", cardBg: "bg-emerald-50/40", borderColor: "border-l-goto-green" },
          ]);

          // Recent: my articles sorted by createdAt
          const sorted = [...fetchedArticles].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setRecentArticles(sorted.slice(0, 5));

          // Creator alerts
          const creatorAlerts: typeof alerts = [];
          const now2 = new Date();
          const weekAgo2 = new Date(now2.getTime() - 7 * 24 * 60 * 60 * 1000);
          const myWeekArticles = fetchedArticles.filter(
            (a) => a.status === "PUBLISHED" && a.publishedAt && new Date(a.publishedAt) >= weekAgo2
          );
          if (myWeekArticles.length < 2) {
            creatorAlerts.push({
              type: "warning",
              icon: AlertCircle,
              message: `Anda baru publish ${myWeekArticles.length} artikel minggu ini. Ayo tulis lebih banyak!`,
            });
          }
          const myViral = fetchedArticles.filter((a) => a.viewCount >= 50).sort((a, b) => b.viewCount - a.viewCount);
          if (myViral.length > 0) {
            creatorAlerts.push({
              type: "info",
              icon: Flame,
              message: `Artikel Anda "${myViral[0].title.substring(0, 50)}..." sedang viral! (${myViral[0].viewCount} views)`,
            });
          }
          setAlerts(creatorAlerts);

        } else if (isEditorRole) {
          // Editor stats: review queue, approved today, rejected, total
          const reviewQueue = fetchedArticles.filter((a) => a.status === "IN_REVIEW").length;
          const today = new Date().toDateString();
          const approvedToday = fetchedArticles.filter(
            (a) => a.status === "APPROVED" || (a.status === "PUBLISHED" && a.publishedAt && new Date(a.publishedAt).toDateString() === today)
          ).length;
          const rejected = fetchedArticles.filter((a) => a.status === "REJECTED").length;
          const totalArticles = fetchedArticles.length;

          setStats([
            { label: "Antrean Review", value: reviewQueue.toString(), icon: Clock, color: "text-yellow-500 bg-yellow-50", cardBg: "bg-amber-50/40", borderColor: "border-l-yellow-500" },
            { label: "Disetujui Hari Ini", value: approvedToday.toString(), icon: CheckCircle, color: "text-goto-green bg-goto-light", cardBg: "bg-emerald-50/40", borderColor: "border-l-goto-green" },
            { label: "Ditolak", value: rejected.toString(), icon: XCircle, color: "text-red-500 bg-red-50", cardBg: "bg-red-50/40", borderColor: "border-l-red-500" },
            { label: "Total Artikel", value: formatNumber(totalArticles), icon: FileText, color: "text-blue-500 bg-blue-50", cardBg: "bg-blue-50/40", borderColor: "border-l-blue-500" },
          ]);

          // Recent: IN_REVIEW first, then by createdAt
          const sorted = [...fetchedArticles].sort((a, b) => {
            if (a.status === "IN_REVIEW" && b.status !== "IN_REVIEW") return -1;
            if (a.status !== "IN_REVIEW" && b.status === "IN_REVIEW") return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          setRecentArticles(sorted.slice(0, 5));
        }
      } catch (err) {
        setError("Gagal memuat data dashboard. Silakan coba lagi.");
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
  }, [session?.user, isCreator, isEditorRole, isAdmin, userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-txt-primary">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-txt-secondary">
            Selamat datang kembali, {session?.user?.name}!
          </p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-txt-primary">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-txt-secondary">
            Selamat datang kembali, {session?.user?.name}!
          </p>
        </div>
        <div className="rounded-[12px] border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-3 rounded-[12px] bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            aria-label="Coba muat ulang data"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-txt-primary">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-txt-secondary">
          Selamat datang kembali, {session?.user?.name}!
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, i) => {
            const Icon = alert.icon;
            const colors = alert.type === "warning"
              ? "bg-yellow-50 border-yellow-200 text-yellow-800"
              : alert.type === "info"
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-goto-light border-goto-green/30 text-goto-green";
            const iconColor = alert.type === "warning" ? "text-yellow-500" : alert.type === "info" ? "text-blue-500" : "text-goto-green";
            return (
              <div key={i} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${colors}`}>
                <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} />
                <p className="text-sm">{alert.message}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats grid */}
      <div className={`mb-8 grid grid-cols-2 gap-2 sm:gap-3 lg:gap-4 sm:grid-cols-3 ${isAdmin ? "md:grid-cols-4 xl:grid-cols-7" : "md:grid-cols-4"}`}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-[12px] border border-border border-l-[3px] ${stat.borderColor} ${stat.cardBg} p-3 sm:p-4 shadow-card overflow-hidden transition-all hover:shadow-md`}
            >
              <div className={`inline-flex rounded-[12px] p-1.5 sm:p-2 ${stat.color}`}>
                <Icon size={16} />
              </div>
              <p className="mt-1.5 text-lg sm:text-2xl xl:text-3xl font-extrabold text-txt-primary truncate">
                {stat.value}
              </p>
              <p className="text-xs sm:text-xs text-txt-secondary truncate">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions FIRST */}
      <div className="mb-6 rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-5">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-txt-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-goto-light">
              <Layers size={16} className="text-goto-green" />
            </div>
            Aksi Cepat
          </h2>
        </div>
          <div className="grid grid-cols-2 gap-3 p-5">
            <Link
              href="/panel/artikel/baru"
              className="flex flex-col items-center gap-2 rounded-[12px] border-2 border-dashed border-border p-6 text-center transition-colors hover:border-goto-green hover:bg-goto-50"
              aria-label="Tulis artikel baru"
            >
              <FileText size={24} className="text-goto-green" />
              <span className="text-sm font-medium text-txt-secondary">
                Tulis Artikel Baru
              </span>
            </Link>
            {(isEditorRole || isAdmin) && (
              <Link
                href="/panel/artikel"
                className="flex flex-col items-center gap-2 rounded-[12px] border-2 border-dashed border-border p-6 text-center transition-colors hover:border-goto-green hover:bg-goto-50"
                aria-label="Review artikel"
              >
                <Clock size={24} className="text-yellow-500" />
                <span className="text-sm font-medium text-txt-secondary">
                  Review Artikel
                </span>
              </Link>
            )}
            {isCreator && (
              <Link
                href="/panel/artikel"
                className="flex flex-col items-center gap-2 rounded-[12px] border-2 border-dashed border-border p-6 text-center transition-colors hover:border-goto-green hover:bg-goto-50"
                aria-label="Lihat artikel saya"
              >
                <Send size={24} className="text-blue-500" />
                <span className="text-sm font-medium text-txt-secondary">
                  Artikel Saya
                </span>
              </Link>
            )}
            {!isCreator && (
              <Link
                href="/panel/laporan"
                className="flex flex-col items-center gap-2 rounded-[12px] border-2 border-dashed border-border p-6 text-center transition-colors hover:border-goto-green hover:bg-goto-50"
                aria-label="Cek laporan masuk"
              >
                <AlertTriangle size={24} className="text-red-500" />
                <span className="text-sm font-medium text-txt-secondary">
                  Cek Laporan
                </span>
              </Link>
            )}
            {(isAdmin || userRole === "EDITOR") && (
              <>
                <Link
                  href="/panel/pengguna"
                  className="flex flex-col items-center gap-2 rounded-[12px] border-2 border-dashed border-border p-6 text-center transition-colors hover:border-goto-green hover:bg-goto-50"
                  aria-label="Kelola pengguna"
                >
                  <Users size={24} className="text-purple-500" />
                  <span className="text-sm font-medium text-txt-secondary">
                    Kelola Pengguna
                  </span>
                </Link>
                <Link
                  href="/panel/iklan"
                  className="flex flex-col items-center gap-2 rounded-[12px] border-2 border-dashed border-border p-6 text-center transition-colors hover:border-goto-green hover:bg-goto-50"
                  aria-label="Kelola iklan"
                >
                  <Megaphone size={24} className="text-blue-500" />
                  <span className="text-sm font-medium text-txt-secondary">
                    Kelola Iklan
                  </span>
                </Link>
              </>
            )}
          </div>
      </div>

      {/* Recent articles - full width, rich info */}
      <div className="mb-6 rounded-2xl border border-border bg-surface shadow-card overflow-hidden">
        <div className="border-b border-border px-6 py-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-txt-primary">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <FileText size={16} className="text-blue-500" />
            </div>
            {isCreator ? "Artikel Saya Terbaru" : isEditorRole ? "Antrean Review" : "Artikel Terbaru"}
          </h2>
          <Link href="/panel/artikel" className="text-sm font-semibold text-goto-green hover:text-goto-dark transition-colors">
            Lihat Semua &rarr;
          </Link>
        </div>
        {recentArticles.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText size={40} className="mx-auto text-border mb-3" />
            <p className="text-base text-txt-secondary">
              {isCreator ? "Anda belum memiliki artikel." : "Belum ada artikel."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentArticles.map((article) => (
              <Link
                key={article.id}
                href={`/panel/artikel/${article.id}/edit`}
                className="block px-6 py-5 hover:bg-surface-secondary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-txt-primary mb-2 line-clamp-1">
                      {article.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      {article.author?.name && (
                        <span className="flex items-center gap-1.5 text-sm text-txt-secondary">
                          <Users size={14} className="text-blue-500" />
                          <span className="text-txt-muted">Penulis:</span> {article.author.name}
                        </span>
                      )}
                      {article.reviewerName && (
                        <span className="flex items-center gap-1.5 text-sm text-txt-secondary">
                          <CheckCircle size={14} className="text-goto-green" />
                          <span className="text-txt-muted">Editor:</span> {article.reviewerName}
                        </span>
                      )}
                      {article.category?.name && (
                        <span className="flex items-center gap-1.5 text-sm text-txt-secondary">
                          <Layers size={14} className="text-purple-500" />
                          <span className="text-txt-muted">Kategori:</span> {article.category.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-sm text-txt-secondary">
                        <CalendarClock size={14} className="text-txt-muted" />
                        <span className="text-txt-muted">Tanggal:</span> {formatDate(article.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`badge text-sm ${statusColors[article.status] || "bg-surface-tertiary text-txt-secondary"}`}>
                      {statusLabels[article.status] || article.status}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-txt-muted">
                      <Eye size={14} />
                      {formatNumber(article.viewCount)} tayangan
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Analytics Section */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {isCreator ? (
          <MyArticleStats articles={allArticles} />
        ) : (
          <ViewsRanking articles={allArticles} />
        )}
        <RecentActivity articles={allArticles} />
        <WeeklyArticleTrend articles={allArticles} />
        <CategoryPerformance articles={allArticles} />
        <div className="lg:col-span-2">
          <ArticleCalendar articles={allArticles} />
        </div>
      </div>

      {/* Editorial checklist reminder */}
      <div className="mt-6 rounded-[12px] border border-goto-green/20 bg-goto-50 p-5">
        <h3 className="flex items-center gap-2 font-semibold text-goto-dark">
          <CheckCircle size={18} />
          Pengingat Standar Jurnalistik
        </h3>
        <ul className="mt-2 space-y-1 text-sm text-goto-green">
          <li>&#10003; Pastikan setiap artikel memiliki minimal 1 sumber terverifikasi</li>
          <li>&#10003; Judul tidak clickbait atau sensasional berlebihan</li>
          <li>&#10003; Cover both sides — berikan perspektif berimbang</li>
          <li>&#10003; Tidak mengandung unsur SARA</li>
          <li>&#10003; Gunakan bahasa sesuai PUEBI</li>
        </ul>
      </div>
    </div>
  );
}
