"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { EDITOR_ROLES } from "@/lib/roles";

// Lazy-load recharts (reuses webpack chunk if user also visited /panel/statistik)
const rechartsLoader = () =>
  import(/* webpackChunkName: "recharts" */ "recharts");
const AreaChart = dynamic(
  () => rechartsLoader().then((m) => m.AreaChart),
  { ssr: false }
);
const Area = dynamic(() => rechartsLoader().then((m) => m.Area), { ssr: false });
const XAxis = dynamic(() => rechartsLoader().then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => rechartsLoader().then((m) => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(
  () => rechartsLoader().then((m) => m.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(() => rechartsLoader().then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => rechartsLoader().then((m) => m.Legend), { ssr: false });
const ResponsiveContainer = dynamic(
  () => rechartsLoader().then((m) => m.ResponsiveContainer),
  { ssr: false }
);

type StatsResponse = {
  period: { days: number; since: string; until: string };
  summary: {
    totalReview: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number;
    rejectionRate: number;
    pendingRate: number;
    avgPerDay: number;
  };
  reviewsPerDay: { date: string; approved: number; rejected: number; total: number }[];
  recentReviews: {
    id: string;
    title: string;
    slug: string;
    status: string;
    reviewNote: string | null;
    reviewedAt: string | null;
    authorName: string | null;
  }[];
};

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "danger" | "warn" | "neutral" }> = {
  APPROVED: { label: "Disetujui", tone: "success" },
  PUBLISHED: { label: "Disetujui (Tayang)", tone: "success" },
  REJECTED: { label: "Ditolak", tone: "danger" },
  IN_REVIEW: { label: "Pending", tone: "warn" },
  DRAFT: { label: "Draft", tone: "neutral" },
  ARCHIVED: { label: "Arsip", tone: "neutral" },
};

const TONE_CLASS: Record<"success" | "danger" | "warn" | "neutral", string> = {
  success: "bg-goto-light text-goto-green",
  danger: "bg-red-50 text-red-600",
  warn: "bg-orange-50 text-orange-600",
  neutral: "bg-surface-tertiary text-txt-secondary",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function StatistikEditorPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const userRole = session?.user?.role || "";
  const userId = session?.user?.id || "";

  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Redirect non-editor (done inside effect — never call redirect() during render)
  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session) return;
    if (!EDITOR_ROLES.includes(userRole)) {
      router.replace("/panel/dashboard");
    }
  }, [sessionStatus, session, userRole, router]);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/stats/editor?days=${days}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Gagal memuat data");
      }
      setData(json.data as StatsResponse);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("[statistik-editor] fetch failed:", e);
      setError(
        e instanceof Error ? e.message : "Gagal memuat statistik. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }, [userId, days]);

  useEffect(() => {
    if (userId && EDITOR_ROLES.includes(userRole)) {
      fetchData();
    }
  }, [userId, userRole, fetchData]);

  // Auth loading / unauthorized — show spinner (effect will redirect)
  if (sessionStatus === "loading" || (session && !EDITOR_ROLES.includes(userRole))) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-goto-green border-t-transparent" />
      </div>
    );
  }

  const summary = data?.summary;
  const chartData = (data?.reviewsPerDay || []).map((d) => ({
    date: shortDate(d.date),
    Disetujui: d.approved,
    Ditolak: d.rejected,
  }));

  return (
    <div className="space-y-6">
      {/* Header — judul + period selector + refresh */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={26} className="text-goto-green" />
            <h1 className="text-xl font-bold text-txt-primary sm:text-2xl">
              Statistik Editor
            </h1>
          </div>
          <p className="mt-1 text-sm text-txt-secondary">
            Ringkasan performa review Anda
            {lastUpdated &&
              ` · diperbarui ${lastUpdated.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            disabled={loading}
            className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-txt-primary focus:border-goto-green focus:outline-none disabled:opacity-60"
            aria-label="Periode statistik"
          >
            <option value={7}>7 hari terakhir</option>
            <option value={30}>30 hari terakhir</option>
            <option value={60}>60 hari terakhir</option>
            <option value={90}>90 hari terakhir</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-goto-dark disabled:opacity-60"
            aria-label="Muat ulang statistik"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          <p>{error}</p>
          <button
            onClick={fetchData}
            className="mt-2 rounded-full bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          value={summary?.totalReview ?? 0}
          label="Total Review"
          loading={loading && !data}
        />
        <StatCard
          icon={CheckCircle}
          iconBg="bg-goto-light"
          iconColor="text-goto-green"
          value={summary?.approved ?? 0}
          valueColor="text-goto-green"
          label="Disetujui"
          loading={loading && !data}
        />
        <StatCard
          icon={XCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          value={summary?.rejected ?? 0}
          valueColor="text-red-600"
          label="Ditolak"
          loading={loading && !data}
        />
        <StatCard
          icon={TrendingUp}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          value={summary?.avgPerDay ?? 0}
          label="Rata-rata Review/Hari"
          loading={loading && !data}
        />
      </div>

      {/* Daily reviews chart */}
      <section className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-txt-primary sm:text-lg">
          Aktivitas Review {days} Hari Terakhir
        </h2>
        {loading && !data ? (
          <div className="h-[240px] animate-pulse rounded-[10px] bg-surface-tertiary" />
        ) : (summary?.totalReview ?? 0) === 0 ? (
          <p className="py-12 text-center text-sm text-txt-muted">
            Belum ada aktivitas review pada periode ini.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00AA13" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00AA13" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF3B30" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                interval={Math.max(1, Math.floor(chartData.length / 8))}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="Disetujui"
                stroke="#00AA13"
                fill="url(#gradApproved)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Ditolak"
                stroke="#FF3B30"
                fill="url(#gradRejected)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* Review Breakdown */}
      <section className="rounded-[12px] border border-border bg-surface p-5 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-txt-primary sm:text-lg">
          Review Breakdown
        </h2>
        {loading && !data ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="mb-2 h-4 w-1/3 rounded bg-surface-tertiary" />
                <div className="h-3 w-full rounded-full bg-surface-tertiary" />
              </div>
            ))}
          </div>
        ) : (summary?.totalReview ?? 0) === 0 ? (
          <p className="text-sm text-txt-muted">Belum ada data review.</p>
        ) : (
          <div className="space-y-4">
            <BreakdownBar
              label="Disetujui"
              percent={summary?.approvalRate ?? 0}
              count={summary?.approved ?? 0}
              color="bg-goto-green"
              textColor="text-goto-green"
            />
            <BreakdownBar
              label="Ditolak"
              percent={summary?.rejectionRate ?? 0}
              count={summary?.rejected ?? 0}
              color="bg-red-500"
              textColor="text-red-600"
            />
            {(summary?.pending ?? 0) > 0 && (
              <BreakdownBar
                label="Pending"
                percent={summary?.pendingRate ?? 0}
                count={summary?.pending ?? 0}
                color="bg-orange-500"
                textColor="text-orange-600"
              />
            )}
          </div>
        )}
      </section>

      {/* Recent Reviews Table */}
      <section className="overflow-hidden rounded-[12px] border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-border bg-surface-secondary px-5 py-4">
          <h2 className="text-base font-semibold text-txt-primary">Review Terbaru</h2>
          <Link
            href="/panel/riwayat-review"
            className="text-sm font-medium text-goto-green hover:text-goto-dark"
          >
            Lihat semua →
          </Link>
        </div>
        {loading && !data ? (
          <div className="space-y-2 p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse gap-3">
                <div className="h-4 flex-1 rounded bg-surface-tertiary" />
                <div className="h-4 w-20 rounded bg-surface-tertiary" />
                <div className="h-4 w-24 rounded bg-surface-tertiary" />
              </div>
            ))}
          </div>
        ) : (data?.recentReviews?.length ?? 0) === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-txt-secondary">
              Belum ada artikel yang di-review pada periode ini.
            </p>
            <Link
              href="/panel/artikel?status=IN_REVIEW"
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-goto-green px-4 py-2 text-sm font-semibold text-white hover:bg-goto-dark"
            >
              Mulai Review Artikel
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-secondary">
                <tr>
                  <th scope="col" className="px-5 py-3 text-left font-medium text-txt-secondary">
                    Judul
                  </th>
                  <th scope="col" className="px-5 py-3 text-left font-medium text-txt-secondary">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 text-left font-medium text-txt-secondary">
                    Catatan
                  </th>
                  <th scope="col" className="px-5 py-3 text-left font-medium text-txt-secondary">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data!.recentReviews.map((article) => {
                  const meta = STATUS_LABEL[article.status] || {
                    label: article.status,
                    tone: "neutral" as const,
                  };
                  const isApproved = meta.tone === "success";
                  const isRejected = meta.tone === "danger";
                  return (
                    <tr key={article.id} className="hover:bg-surface-secondary">
                      <td className="max-w-[280px] px-5 py-3">
                        <p className="truncate font-medium text-txt-primary" title={article.title}>
                          {article.title}
                        </p>
                        {article.authorName && (
                          <p className="truncate text-xs text-txt-muted">
                            oleh {article.authorName}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[meta.tone]}`}
                        >
                          {isApproved ? (
                            <CheckCircle size={12} />
                          ) : isRejected ? (
                            <XCircle size={12} />
                          ) : null}
                          {meta.label}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-5 py-3">
                        <p
                          className="truncate text-xs text-txt-secondary"
                          title={article.reviewNote || undefined}
                        >
                          {article.reviewNote || "—"}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-txt-secondary">
                        {article.reviewedAt ? formatDate(article.reviewedAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ───── Sub-components ─────

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  value,
  valueColor = "text-txt-primary",
  label,
  loading,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: number;
  valueColor?: string;
  label: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card sm:p-5">
      <div className={`inline-flex rounded-[12px] p-2 ${iconBg} ${iconColor}`}>
        <Icon size={20} />
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-16 animate-pulse rounded bg-surface-tertiary" />
      ) : (
        <p className={`mt-2 text-2xl font-extrabold sm:text-3xl ${valueColor}`}>{value}</p>
      )}
      <p className="mt-0.5 text-sm font-medium text-txt-secondary">{label}</p>
    </div>
  );
}

function BreakdownBar({
  label,
  percent,
  count,
  color,
  textColor,
}: {
  label: string;
  percent: number;
  count: number;
  color: string;
  textColor: string;
}) {
  const safePct = Math.max(0, Math.min(100, percent));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-txt-primary">
          {label} <span className="text-txt-muted">({count})</span>
        </span>
        <span className={`text-sm font-semibold ${textColor}`}>{percent}%</span>
      </div>
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-surface-tertiary"
        role="progressbar"
        aria-valuenow={safePct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percent}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${safePct}%` }}
        />
      </div>
    </div>
  );
}
