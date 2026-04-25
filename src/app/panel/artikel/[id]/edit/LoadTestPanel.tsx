"use client";

/**
 * LoadTestPanel — UI untuk run capacity test pengunjung concurrent ke halaman artikel.
 * Dipakai sebelum boost artikel via sosmed untuk pastiin halaman tahan beban.
 *
 * Pakai header X-Load-Test → server SKIP increment viewCount.
 */

import { useCallback, useEffect, useState } from "react";
import { Activity, Play, Loader2, History, AlertCircle, CheckCircle, AlertTriangle, Zap } from "lucide-react";

interface LoadTestRun {
  id: string;
  articleId: string;
  articleSlug: string;
  articleTitle: string;
  initiatedByName: string;
  concurrency: number;
  totalRequests: number;
  status: string;
  errorReason: string | null;
  successCount: number;
  errorCount: number;
  avgMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  maxMs: number | null;
  minMs: number | null;
  statusCodes: Record<string, number> | null;
  errorMessages: Array<{ count: number; message: string }> | null;
  totalDurationMs: number | null;
  startedAt: string;
  completedAt: string | null;
}

interface Props {
  articleId: string;
  articleStatus: string;
}

const CONCURRENCY_OPTIONS = [
  { value: 5, label: "5 visitor (smoke test)" },
  { value: 10, label: "10 visitor" },
  { value: 25, label: "25 visitor" },
  { value: 50, label: "50 visitor (stress test)" },
];

const TOTAL_OPTIONS = [
  { value: 25, label: "25 requests (cepat)" },
  { value: 50, label: "50 requests" },
  { value: 100, label: "100 requests" },
  { value: 200, label: "200 requests (full)" },
];

export default function LoadTestPanel({ articleId, articleStatus }: Props) {
  const [open, setOpen] = useState(false);
  const [concurrency, setConcurrency] = useState(10);
  const [totalRequests, setTotalRequests] = useState(50);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<LoadTestRun | null>(null);
  const [history, setHistory] = useState<LoadTestRun[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const isPublishable = articleStatus === "PUBLISHED";

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${articleId}/load-test`);
      const json = await res.json();
      if (json.success) setHistory(json.data?.runs || []);
    } catch { /* ignore */ }
  }, [articleId]);

  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  const runTest = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/articles/${articleId}/load-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concurrency, totalRequests }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      setLatestResult(json.data);
      loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal jalankan test");
    } finally {
      setRunning(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={!isPublishable}
        className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-purple-600 bg-white px-4 py-2 text-sm font-semibold text-purple-600 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed"
        title={isPublishable ? "Test capacity halaman artikel" : "Hanya artikel PUBLISHED yang bisa di-test"}
      >
        <Activity size={14} />
        Load Test Pengunjung
      </button>
    );
  }

  return (
    <div className="rounded-[12px] border-2 border-purple-500 bg-surface p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-purple-700">
          <Activity size={14} /> Load Test Pengunjung
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-txt-secondary hover:text-txt-primary"
        >
          Tutup ✕
        </button>
      </div>

      <p className="text-xs text-txt-secondary leading-relaxed">
        Simulasi <strong>{concurrency} visitor concurrent</strong> total <strong>{totalRequests} requests</strong> ke halaman artikel ini. Pakai sebelum boost artikel via sosmed untuk pastiin tahan beban. <strong>ViewCount tidak naik</strong> (pakai header X-Load-Test).
      </p>

      {/* Form */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-txt-secondary">Concurrency</label>
          <select
            value={concurrency}
            onChange={(e) => setConcurrency(parseInt(e.target.value))}
            disabled={running}
            className="input w-full text-xs"
          >
            {CONCURRENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-txt-secondary">Total Requests</label>
          <select
            value={totalRequests}
            onChange={(e) => setTotalRequests(parseInt(e.target.value))}
            disabled={running}
            className="input w-full text-xs"
          >
            {TOTAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Run button */}
      <button
        onClick={runTest}
        disabled={running}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {running ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Testing... (max 60s)
          </>
        ) : (
          <>
            <Zap size={14} />
            Mulai Test
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-1.5 rounded-lg bg-red-50 p-2 text-[11px] text-red-800">
          <AlertCircle size={11} className="shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}

      {/* Latest result */}
      {latestResult && <ResultCard run={latestResult} />}

      {/* History toggle */}
      <button
        onClick={() => setShowHistory((s) => !s)}
        className="flex w-full items-center justify-center gap-1 rounded border border-border bg-surface-secondary px-3 py-1.5 text-[11px] font-medium text-txt-secondary hover:bg-surface-tertiary"
      >
        <History size={11} />
        {showHistory ? "Sembunyikan" : "Lihat"} History ({history.length})
      </button>

      {showHistory && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-[10px] text-txt-muted text-center py-2">Belum ada test history</p>
          ) : (
            history.map((run) => (
              <HistoryRow key={run.id} run={run} onClick={() => setLatestResult(run)} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Result Card ─────────────────────────────────────────────────────────

function ResultCard({ run }: { run: LoadTestRun }) {
  const errRate = run.totalRequests > 0
    ? Math.round((run.errorCount / run.totalRequests) * 100)
    : 0;
  const isHealthy = errRate < 5 && (run.p95Ms ?? 0) < 3000;
  const isWarning = errRate < 20 && (run.p95Ms ?? 0) < 8000;

  return (
    <div className={`rounded-lg border-2 p-3 ${isHealthy ? "border-green-500 bg-green-50" : isWarning ? "border-yellow-500 bg-yellow-50" : "border-red-500 bg-red-50"}`}>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        {isHealthy ? (
          <><CheckCircle size={12} className="text-green-600" /> <span className="text-green-700">Health: BAIK</span></>
        ) : isWarning ? (
          <><AlertTriangle size={12} className="text-yellow-600" /> <span className="text-yellow-700">Health: WARNING</span></>
        ) : (
          <><AlertCircle size={12} className="text-red-600" /> <span className="text-red-700">Health: KRITIS</span></>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
        <Metric label="Sukses" value={`${run.successCount}/${run.totalRequests}`} color={errRate < 5 ? "green" : "red"} />
        <Metric label="Error Rate" value={`${errRate}%`} color={errRate < 5 ? "green" : errRate < 20 ? "yellow" : "red"} />
        <Metric label="Avg Response" value={fmt(run.avgMs, "ms")} />
        <Metric label="p95 Response" value={fmt(run.p95Ms, "ms")} color={run.p95Ms && run.p95Ms < 3000 ? "green" : run.p95Ms && run.p95Ms < 8000 ? "yellow" : "red"} />
      </div>

      {/* Detail metrics */}
      <details className="text-[10px]">
        <summary className="cursor-pointer text-purple-700 font-medium">Detail metrik</summary>
        <div className="mt-1.5 grid grid-cols-2 gap-1 text-txt-secondary">
          <div>min: <strong>{fmt(run.minMs, "ms")}</strong></div>
          <div>max: <strong>{fmt(run.maxMs, "ms")}</strong></div>
          <div>p50: <strong>{fmt(run.p50Ms, "ms")}</strong></div>
          <div>p99: <strong>{fmt(run.p99Ms, "ms")}</strong></div>
          <div className="col-span-2">durasi total: <strong>{fmt(run.totalDurationMs, "ms")}</strong></div>
        </div>

        {/* Status codes */}
        {run.statusCodes && Object.keys(run.statusCodes).length > 0 && (
          <div className="mt-1.5">
            <p className="font-semibold text-txt-secondary">Status codes:</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {Object.entries(run.statusCodes).map(([code, count]) => {
                const isOk = code.startsWith("2") || code.startsWith("3");
                return (
                  <span
                    key={code}
                    className={`rounded-full px-2 py-0.5 text-[9px] font-mono ${isOk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {code}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Errors */}
        {run.errorMessages && run.errorMessages.length > 0 && (
          <div className="mt-1.5">
            <p className="font-semibold text-red-600">Errors:</p>
            <ul className="mt-0.5 space-y-0.5 text-red-700">
              {run.errorMessages.map((e, i) => (
                <li key={i} className="break-all">• <strong>{e.count}×</strong> {e.message}</li>
              ))}
            </ul>
          </div>
        )}
      </details>

      <p className="mt-2 text-[9px] text-txt-muted">
        {new Date(run.startedAt).toLocaleString("id-ID")} · oleh {run.initiatedByName}
      </p>
    </div>
  );
}

// ─── History Row ─────────────────────────────────────────────────────────

function HistoryRow({ run, onClick }: { run: LoadTestRun; onClick: () => void }) {
  const errRate = run.totalRequests > 0
    ? Math.round((run.errorCount / run.totalRequests) * 100)
    : 0;
  const dotColor = errRate < 5 ? "bg-green-500" : errRate < 20 ? "bg-yellow-500" : "bg-red-500";
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded border border-border bg-surface px-2 py-1.5 text-left text-[10px] hover:bg-surface-secondary"
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      <span className="flex-1 min-w-0">
        <span className="font-mono">{run.concurrency}c × {run.totalRequests}r</span>
        <span className="text-txt-muted"> · {fmt(run.avgMs, "ms")}</span>
      </span>
      <span className="text-txt-muted whitespace-nowrap">
        {errRate}% err
      </span>
      <span className="text-txt-muted whitespace-nowrap">
        {new Date(run.startedAt).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
      </span>
    </button>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function Metric({ label, value, color = "default" }: { label: string; value: string; color?: "green" | "yellow" | "red" | "default" }) {
  const colorClass = color === "green" ? "text-green-700" : color === "yellow" ? "text-yellow-700" : color === "red" ? "text-red-700" : "text-txt-primary";
  return (
    <div>
      <p className="text-txt-muted">{label}</p>
      <p className={`text-sm font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

function fmt(n: number | null | undefined, unit: string): string {
  if (n === null || n === undefined) return "—";
  return `${Math.round(n)}${unit}`;
}
