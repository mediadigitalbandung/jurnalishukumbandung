"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Sparkles, Cpu, Hash, Users, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

interface AILog {
  id: string;
  userId: string;
  userName: string;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  articleTitle: string | null;
  createdAt: string;
}

interface UserStat {
  userId: string;
  name: string;
  tokens: number;
  requests: number;
}

interface Stats {
  totalTokens: number;
  totalRequests: number;
  byUser: UserStat[];
  byFeature: { feature: string; tokens: number; requests: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const FEATURE_LABELS: Record<string, string> = {
  tags: "Generate Tag",
  summary: "Ringkasan",
  seo_title: "SEO Title",
  meta_description: "Meta Description",
  image_caption: "Caption Gambar",
};

function featureLabel(feature: string): { label: string; failed: boolean } {
  const failed = feature.endsWith(":FAILED");
  const baseKey = failed ? feature.slice(0, -":FAILED".length) : feature;
  return { label: FEATURE_LABELS[baseKey] || baseKey, failed };
}

export default function AIPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const userRole = session?.user?.role || "";

  const [logs, setLogs] = useState<AILog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filterUser, setFilterUser] = useState("");
  const [logLoading, setLogLoading] = useState(true);

  // Redirect non-allowed roles — done in effect, never call redirect() during render
  useEffect(() => {
    if (sessionStatus === "loading" || !session) return;
    if (userRole !== "SUPER_ADMIN" && userRole !== "EDITOR") {
      router.replace("/panel/dashboard");
    }
  }, [sessionStatus, session, userRole, router]);

  const fetchLogs = useCallback(
    async (page: number) => {
      setLogLoading(true);
      try {
        const params = new URLSearchParams({ page: page.toString(), limit: "20" });
        if (filterUser) params.set("userId", filterUser);
        const res = await fetch(`/api/ai/usage?${params}`);
        if (res.ok) {
          const json = await res.json();
          setLogs(json.data.logs);
          setPagination(json.data.pagination);
          setStats(json.data.stats);
        }
      } catch { /* ignore */ } finally {
        setLogLoading(false);
      }
    },
    [filterUser]
  );

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatNumber = (n: number) => n.toLocaleString("id-ID");

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-goto-green border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-txt-primary flex items-center gap-2">
          <Sparkles size={24} className="text-goto-green" />
          AI Tools
        </h1>
        <p className="text-base text-txt-secondary mt-1">Monitor penggunaan AI di seluruh fitur</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-goto-light">
                <Cpu size={20} className="text-goto-green" />
              </div>
              <div>
                <p className="text-xs text-txt-muted">Total Token</p>
                <p className="text-xl font-bold text-txt-primary">{formatNumber(stats.totalTokens)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
                <Hash size={20} className="text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-txt-muted">Total Request</p>
                <p className="text-xl font-bold text-txt-primary">{formatNumber(stats.totalRequests)}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Users size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-txt-muted">Pengguna Aktif</p>
                <p className="text-xl font-bold text-txt-primary">{stats.byUser.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per User */}
      {stats && stats.byUser.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-txt-primary">Penggunaan Per Pengguna</h2>
          <div className="space-y-2">
            {stats.byUser.map((u) => (
              <div key={u.userId} className="flex items-center justify-between rounded-lg bg-surface-secondary px-4 py-2.5">
                <button
                  onClick={() => setFilterUser(filterUser === u.userId ? "" : u.userId)}
                  className={`text-sm font-medium transition-colors ${filterUser === u.userId ? "text-goto-green" : "text-txt-primary hover:text-goto-green"}`}
                >
                  {u.name}
                </button>
                <div className="flex items-center gap-4 text-xs text-txt-muted">
                  <span>{formatNumber(u.requests)} req</span>
                  <span>{formatNumber(u.tokens)} token</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filterUser && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-txt-secondary">Filter: {stats?.byUser.find((u) => u.userId === filterUser)?.name}</span>
          <button onClick={() => setFilterUser("")} className="text-xs text-goto-green hover:underline">Hapus filter</button>
        </div>
      )}

      {/* Log Table */}
      {logLoading ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-goto-green border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface shadow-card overflow-x-auto">
          <table className="w-full min-w-[320px]">
            <thead>
              <tr className="border-b border-border bg-surface-secondary">
                <th scope="col" className="px-3 sm:px-5 py-3.5 text-left text-sm font-medium text-txt-secondary">Waktu</th>
                <th scope="col" className="hidden sm:table-cell px-5 py-3.5 text-left text-sm font-medium text-txt-secondary">Pengguna</th>
                <th scope="col" className="px-3 sm:px-5 py-3.5 text-left text-sm font-medium text-txt-secondary">Fitur</th>
                <th scope="col" className="px-3 sm:px-5 py-3.5 text-right text-sm font-medium text-txt-secondary">Token</th>
                <th scope="col" className="hidden md:table-cell px-5 py-3.5 text-left text-sm font-medium text-txt-secondary">Artikel</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-base text-txt-muted">Belum ada data penggunaan AI</td>
                </tr>
              ) : (
                logs.map((log) => {
                  const { label, failed } = featureLabel(log.feature);
                  return (
                    <tr key={log.id} className="border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-3 sm:px-5 py-4 text-xs sm:text-sm text-txt-secondary whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      <td className="hidden sm:table-cell px-5 py-4 text-sm text-txt-primary">{log.userName}</td>
                      <td className="px-3 sm:px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            failed
                              ? "bg-red-50 text-red-600"
                              : "bg-goto-light text-goto-green"
                          }`}
                        >
                          {failed && <AlertCircle size={11} />}
                          {label}
                          {failed && " (gagal)"}
                        </span>
                      </td>
                      <td className="px-3 sm:px-5 py-4 text-right text-sm font-medium text-txt-primary">{formatNumber(log.totalTokens)}</td>
                      <td
                        className="hidden md:table-cell px-5 py-4 text-sm text-txt-secondary max-w-[200px] truncate"
                        title={log.articleTitle || ""}
                      >
                        {log.articleTitle || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-txt-muted">
            Halaman {pagination.page} dari {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page <= 1} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
