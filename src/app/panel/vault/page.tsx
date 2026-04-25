"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  BookOpen,
  RefreshCw,
  FileText,
  Calendar,
  Hash,
  Users,
  Scale,
  PenLine,
  Loader2,
  Play,
  Download,
  Upload,
  Info,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

type SyncAction = {
  action: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: "green" | "blue" | "orange" | "purple";
  variant: "pull" | "push" | "generate";
};

const SYNC_ACTIONS: SyncAction[] = [
  {
    action: "daily-log",
    label: "Generate Daily Log",
    description: "Buat editorial log untuk hari ini dari aktivitas DB",
    icon: PenLine,
    color: "green",
    variant: "generate",
  },
  {
    action: "daily-log-7days",
    label: "Generate 7 Hari Daily Log",
    description: "Batch buat 7 daily log terakhir sekaligus",
    icon: Calendar,
    color: "green",
    variant: "generate",
  },
  {
    action: "sidang-upcoming",
    label: "Pull Sidang Upcoming",
    description: "Pull jadwal sidang yang akan datang ke 06-Sidang/",
    icon: Scale,
    color: "blue",
    variant: "pull",
  },
  {
    action: "sidang",
    label: "Pull Semua Sidang",
    description: "Pull seluruh CourtSchedule (lampau + akan datang)",
    icon: Scale,
    color: "blue",
    variant: "pull",
  },
  {
    action: "keywords-pull",
    label: "Pull Keywords",
    description: "Pull TargetKeyword dari DB → Keywords.md (overwrite)",
    icon: Download,
    color: "blue",
    variant: "pull",
  },
  {
    action: "keywords-push",
    label: "Push Keywords",
    description: "Push perubahan di Keywords.md → DB (insert/activate/deactivate)",
    icon: Upload,
    color: "orange",
    variant: "push",
  },
  {
    action: "keywords-status",
    label: "Status Keywords",
    description: "Compare diff DB vs vault — preview saja, tidak ubah apa-apa",
    icon: Info,
    color: "purple",
    variant: "generate",
  },
  {
    action: "narasumber-frequent",
    label: "Pull Narasumber (≥3 mentions)",
    description: "Pull narasumber dari Source table yg muncul di ≥ 3 artikel",
    icon: Users,
    color: "blue",
    variant: "pull",
  },
  {
    action: "narasumber",
    label: "Pull Semua Narasumber",
    description: "Pull semua narasumber unique dari Source table",
    icon: Users,
    color: "blue",
    variant: "pull",
  },
];

type FolderStatus = { count: number; latest: string | null };
type VaultStatus = {
  exists: boolean;
  vaultPath?: string;
  totalFiles?: number;
  lastSync?: string | null;
  folders?: Record<string, FolderStatus>;
};

type SyncResult = {
  action: string;
  label: string;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

const colorClass = {
  green: { bg: "bg-green-50", text: "text-goto-green", btn: "bg-goto-green hover:bg-goto-dark" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", btn: "bg-blue-600 hover:bg-blue-700" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", btn: "bg-orange-500 hover:bg-orange-600" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", btn: "bg-purple-600 hover:bg-purple-700" },
};

export default function VaultPanelPage() {
  const { success, error: showError } = useToast();

  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/vault/status");
      const json = await res.json();
      if (json.success) setStatus(json.data);
    } catch { showError("Gagal load status vault"); }
    setLoadingStatus(false);
  }, [showError]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const runSync = async (action: string) => {
    setRunningAction(action);
    setLastResult(null);
    try {
      const res = await fetch("/api/vault/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.success) {
        setLastResult(json.data);
        if (json.data.success) {
          success(`${json.data.label} — selesai (${(json.data.durationMs / 1000).toFixed(1)}s)`);
          loadStatus();
        } else {
          showError(`${json.data.label} — exit ${json.data.exitCode}`);
        }
      } else {
        showError(json.error || "Gagal jalankan sync");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
    setRunningAction(null);
  };

  const FOLDER_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
    kasus: { label: "Kasus", icon: Scale },
    narasumber: { label: "Narasumber", icon: Users },
    pasal: { label: "Pasal", icon: Hash },
    yurisprudensi: { label: "Yurisprudensi", icon: BookOpen },
    topik: { label: "Topik Riset", icon: Hash },
    dailyLog: { label: "Daily Log", icon: Calendar },
    sidang: { label: "Sidang", icon: Scale },
    drafts: { label: "Drafts", icon: PenLine },
    sosmed: { label: "Sosmed Plan", icon: FileText },
    templates: { label: "Templates", icon: FileText },
  };

  return (
    <div className="container-main py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-goto-light">
            <BookOpen size={22} className="text-goto-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-txt-primary">Obsidian Vault</h1>
            <p className="text-sm text-txt-secondary">Editorial knowledge base — sync DB ↔ vault</p>
          </div>
        </div>
        <button
          onClick={loadStatus}
          disabled={loadingStatus}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary disabled:opacity-50"
        >
          <RefreshCw size={14} className={loadingStatus ? "animate-spin" : ""} />
          Refresh Status
        </button>
      </div>

      {/* Vault Status Cards */}
      <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-txt-primary">Status Vault</h2>
          {status?.lastSync && (
            <p className="text-xs text-txt-muted flex items-center gap-1">
              <Clock size={12} /> Last update: {new Date(status.lastSync).toLocaleString("id-ID")}
            </p>
          )}
        </div>

        {loadingStatus ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-goto-green" />
          </div>
        ) : !status?.exists ? (
          <div className="py-12 text-center">
            <BookOpen size={40} className="mx-auto mb-3 text-txt-muted" />
            <p className="text-sm text-txt-muted">Vault belum ada di <code className="bg-border px-1 rounded text-xs">docs/vault/</code></p>
            <p className="text-xs text-txt-muted mt-2">Buat dengan: <code className="bg-border px-1 rounded">git pull</code> lalu setup Obsidian</p>
          </div>
        ) : (
          <>
            <p className="text-3xl font-bold text-txt-primary mb-4">
              {(status.totalFiles || 0).toLocaleString("id-ID")} <span className="text-base font-normal text-txt-muted">total file</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(status.folders || {}).map(([key, f]) => {
                const meta = FOLDER_LABELS[key];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <div key={key} className="rounded-[8px] border border-border bg-surface-secondary p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon size={14} className="text-txt-muted" />
                      <span className="text-xs font-medium text-txt-secondary">{meta.label}</span>
                    </div>
                    <p className="text-xl font-bold text-txt-primary">{f.count}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Sync Actions */}
      <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
        <h2 className="text-lg font-semibold text-txt-primary mb-1">Sync Actions</h2>
        <p className="text-xs text-txt-muted mb-5">Trigger sync vault ↔ DB tanpa SSH. Cron auto-sync tiap 23:00 WIB.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SYNC_ACTIONS.map((sa) => {
            const Icon = sa.icon;
            const colors = colorClass[sa.color];
            const isRunning = runningAction === sa.action;
            const isDisabled = !!runningAction && !isRunning;
            return (
              <div key={sa.action} className="flex items-start gap-3 rounded-[8px] border border-border p-4 hover:border-goto-green transition-colors">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors.bg}`}>
                  <Icon size={18} className={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-txt-primary">{sa.label}</h3>
                  <p className="text-xs text-txt-secondary mt-0.5 mb-3">{sa.description}</p>
                  <button
                    onClick={() => runSync(sa.action)}
                    disabled={isDisabled || isRunning}
                    className={`inline-flex items-center gap-1.5 rounded-full ${colors.btn} px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                  >
                    {isRunning ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    {isRunning ? "Running..." : "Run"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Last Result Output */}
      {lastResult && (
        <div className="rounded-[12px] bg-surface border border-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {lastResult.success
                ? <CheckCircle size={18} className="text-goto-green" />
                : <XCircle size={18} className="text-red-500" />}
              <h2 className="text-base font-semibold text-txt-primary">
                {lastResult.label}
              </h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${lastResult.success ? "bg-green-50 text-goto-green" : "bg-red-50 text-red-600"}`}>
                {lastResult.success ? "Success" : `Exit ${lastResult.exitCode}`}
              </span>
            </div>
            <span className="text-xs text-txt-muted">{(lastResult.durationMs / 1000).toFixed(2)}s</span>
          </div>

          {lastResult.stdout && (
            <details open className="mb-2">
              <summary className="text-xs font-medium text-txt-secondary cursor-pointer mb-1">stdout</summary>
              <pre className="text-xs bg-surface-secondary border border-border rounded-[6px] p-3 overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto">{lastResult.stdout}</pre>
            </details>
          )}
          {lastResult.stderr && (
            <details>
              <summary className="text-xs font-medium text-red-600 cursor-pointer mb-1">stderr</summary>
              <pre className="text-xs bg-red-50 border border-red-200 rounded-[6px] p-3 overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">{lastResult.stderr}</pre>
            </details>
          )}
        </div>
      )}

      {/* Help / Docs */}
      <div className="rounded-[12px] border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 space-y-1">
            <p className="font-medium">Tentang Obsidian Vault</p>
            <p>Vault tersimpan di <code className="bg-white px-1 rounded">docs/vault/</code> dalam repo. Buka Obsidian → Open folder as vault → pilih folder ini.</p>
            <p>Setup detail: <code className="bg-white px-1 rounded">docs/vault/SETUP.md</code></p>
            <p>Workflow editorial: <code className="bg-white px-1 rounded">docs/vault/README.md</code></p>
            <p>Cron auto-sync jam 23:00 WIB. Manual sync di sini kapan saja.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
