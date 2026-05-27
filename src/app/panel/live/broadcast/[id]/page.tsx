"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import {
  ChevronLeft,
  Loader2,
  Radio,
  ExternalLink,
  Copy,
  Eye,
  AlertCircle,
} from "lucide-react";
import WhipBroadcaster from "@/components/live/WhipBroadcaster";

type WhipInfo = {
  sessionId: string;
  slug: string;
  streamKey: string;
  whipUrl: string;
  hlsUrl: string;
  iceServers: RTCIceServer[];
  title: string;
};

type LiveSession = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  isPublic: boolean;
  currentViewers: number;
  startedAt: string | null;
  broadcaster: { id: string; name: string };
};

export default function BroadcastPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { confirm } = useConfirm();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [whip, setWhip] = useState<WhipInfo | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  // Real broadcaster state (dari child WhipBroadcaster) — SOURCE OF TRUTH untuk
  // "apakah benar2 sedang broadcasting?". DB session.status bisa stale.
  const [broadcasterStatus, setBroadcasterStatus] = useState<
    "idle" | "preview" | "connecting" | "live" | "stopping" | "error"
  >("idle");
  const isActivelyBroadcasting = broadcasterStatus === "live";

  // Load session — silent mode untuk background refresh (jangan unmount UI!)
  const loadSession = useCallback(
    async (silent = false) => {
      if (!silent) setInitialLoading(true);
      try {
        const res = await fetch(`/api/live/${params.id}`);
        const json = await res.json();
        if (!json.success) {
          if (!silent) setErrorMsg(json.error || "Gagal load session");
          return;
        }
        setSession(json.data);
      } catch (e) {
        if (!silent) setErrorMsg(e instanceof Error ? e.message : "Network error");
      } finally {
        if (!silent) setInitialLoading(false);
      }
    },
    [params.id]
  );

  useEffect(() => {
    loadSession(false);
  }, [loadSession]);

  // Polling viewer count + session status (SILENT — jangan trigger loading state
  // yang nge-unmount WhipBroadcaster & break WebRTC connection).
  // Hanya update viewer count, ga ganggu UI.
  useEffect(() => {
    if (!isActivelyBroadcasting) return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live/${params.id}/status`);
        const json = await res.json();
        if (json.success) {
          // Update viewer count saja, jangan replace whole session object
          setSession((prev) =>
            prev ? { ...prev, currentViewers: json.data.currentViewers || 0 } : prev
          );
        }
      } catch {
        /* ignore */
      }
    };
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, [isActivelyBroadcasting, params.id]);

  const handleStart = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${params.id}/start`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        showError(json.error || "Gagal start");
        return;
      }
      setWhip(json.data);
      // Silent refresh session — JANGAN trigger loading state (akan unmount WhipBroadcaster!)
      loadSession(true);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
  }, [params.id, showError, loadSession]);

  const handleEnd = useCallback(async () => {
    const ok = await confirm({
      title: "Akhiri live broadcast?",
      message:
        "Stream akan diakhiri. Recording akan diproses & tersedia di halaman live setelah beberapa menit.",
      confirmText: "Ya, akhiri",
      variant: "warning",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/live/${params.id}/end`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        success(json.data?.message || "Live diakhiri");
        setTimeout(() => {
          router.push("/panel/live");
        }, 1500);
      } else {
        // Kalau "Live ini sudah ended", treat sebagai success (idempotent)
        if (json.error?.includes("sudah")) {
          success("Live sudah diakhiri sebelumnya");
          loadSession(true); // refresh state
        } else {
          showError(json.error || "Gagal akhiri");
        }
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
  }, [params.id, confirm, success, showError, router, loadSession]);

  const copyViewerLink = () => {
    if (!session) return;
    const url = `${window.location.origin}/live/${session.slug}`;
    navigator.clipboard.writeText(url);
    success("Link viewer dicopy ke clipboard");
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-goto-green" />
      </div>
    );
  }

  if (errorMsg || !session) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <div className="text-lg font-semibold mb-2">Tidak bisa load session</div>
        <div className="text-txt-secondary mb-4">{errorMsg}</div>
        <Link href="/panel/live" className="btn-secondary">
          Kembali
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/panel/live"
            className="inline-flex items-center gap-1 text-sm text-txt-secondary hover:text-goto-green mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> Live Streaming
          </Link>
          <h1 className="text-2xl font-bold text-txt-primary flex items-center gap-2">
            <Radio className="h-6 w-6 text-red-600" /> Broadcast: {session.title}
          </h1>
          {session.description && (
            <p className="text-sm text-txt-secondary mt-1">{session.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isActivelyBroadcasting && (
            <span className="inline-flex items-center gap-1 bg-green-50 text-goto-green border border-green-200 px-3 py-1.5 rounded-full text-sm font-semibold">
              <Eye className="h-4 w-4" /> {session.currentViewers} viewer
            </span>
          )}
          <Link
            href={`/live/${session.slug}`}
            target="_blank"
            className="btn-secondary inline-flex items-center gap-1.5 text-sm"
          >
            <ExternalLink className="h-4 w-4" />
            Buka halaman viewer
          </Link>
          <button onClick={copyViewerLink} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
            <Copy className="h-4 w-4" />
            Copy link
          </button>
        </div>
      </div>

      {/* Status card — source of truth: broadcasterStatus (child) + session.status (DB) */}
      {(() => {
        // Derived display status — prefer child state when active
        let dot = "bg-gray-400";
        let label = "Belum mulai";
        let desc = "Klik tombol di bawah untuk persiapkan broadcast.";
        let showEndButton = false;
        if (isActivelyBroadcasting) {
          dot = "bg-red-500 animate-pulse";
          label = "Sedang Live";
          desc = `Stream aktif. Viewer bisa lihat di /live/${session.slug}`;
          showEndButton = true;
        } else if (broadcasterStatus === "connecting") {
          dot = "bg-yellow-500 animate-pulse";
          label = "Menyambungkan ke server...";
          desc = "Tunggu beberapa detik sampai koneksi WebRTC terbentuk.";
        } else if (broadcasterStatus === "preview") {
          dot = "bg-blue-500";
          label = "Preview kamera aktif";
          desc = "Klik 'Mulai Live Broadcast' untuk mulai siaran.";
        } else if (broadcasterStatus === "error") {
          dot = "bg-orange-500";
          label = "Ada error broadcaster";
          desc = "Lihat panel error di bawah untuk detail.";
        } else if (session.status === "SCHEDULED") {
          dot = "bg-blue-500";
          label = "Siap Broadcast";
          desc = "Klik 'Persiapkan Broadcast' untuk mulai.";
        } else if (session.status === "ENDED") {
          dot = "bg-gray-500";
          label = "Selesai";
          desc = "Broadcast sebelumnya sudah berakhir. Klik 'Persiapkan Broadcast' untuk mulai lagi (akan auto-reset).";
        } else if (session.status === "ARCHIVED") {
          dot = "bg-green-500";
          label = "Recording tersedia";
          desc = "Live sebelumnya sudah selesai & recording tersimpan. Buat session baru untuk broadcast lagi.";
        } else if (session.status === "FAILED") {
          dot = "bg-red-400";
          label = "Gagal";
          desc = "Broadcast sebelumnya gagal. Coba mulai lagi.";
        }
        return (
          <div className="card p-4 flex items-start gap-3">
            <div className={`mt-1 w-3 h-3 rounded-full ${dot}`} />
            <div className="flex-1">
              <div className="font-semibold">Status: {label}</div>
              <div className="text-sm text-txt-secondary mt-0.5">{desc}</div>
            </div>
            {showEndButton && (
              <button
                onClick={handleEnd}
                className="!px-4 !py-2 inline-flex items-center gap-1.5 text-sm rounded-full bg-gray-800 hover:bg-black text-white font-semibold"
              >
                Akhiri Live
              </button>
            )}
          </div>
        );
      })()}

      {/* Broadcaster UI */}
      {whip ? (
        <StableBroadcasterWrapper
          whip={whip}
          loadSession={loadSession}
          onSuccess={success}
          onError={showError}
          onStatusChange={setBroadcasterStatus}
        />
      ) : (
        <div className="card p-8 text-center space-y-4">
          <Radio className="h-12 w-12 text-red-600 mx-auto" />
          <div className="text-lg font-semibold">
            {session.status === "ENDED" || session.status === "FAILED"
              ? "Mulai broadcast lagi?"
              : "Siap broadcast?"}
          </div>
          <div className="text-sm text-txt-secondary max-w-md mx-auto">
            {session.status === "ENDED" || session.status === "FAILED"
              ? "Klik tombol di bawah — session akan auto-reset & broadcast bisa dimulai ulang."
              : "Klik tombol di bawah untuk dapatkan akses kamera & mic, lalu mulai siaran live."}
          </div>
          <button
            onClick={handleStart}
            disabled={session.status === "ARCHIVED"}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3"
          >
            <Radio className="h-5 w-5" />
            {session.status === "ARCHIVED"
              ? "Session sudah selesai (buat baru)"
              : "Persiapkan Broadcast"}
          </button>
        </div>
      )}

      {/* Tech info */}
      {whip && (
        <details className="card p-4 text-xs">
          <summary className="cursor-pointer font-semibold text-txt-secondary">
            Info teknis (untuk debug)
          </summary>
          <div className="mt-3 space-y-1 font-mono text-txt-muted">
            <div>Stream key: <code className="bg-surface-secondary px-1.5 py-0.5 rounded">{whip.streamKey}</code></div>
            <div>WHIP URL: <code className="bg-surface-secondary px-1.5 py-0.5 rounded break-all">{whip.whipUrl}</code></div>
            <div>HLS URL: <code className="bg-surface-secondary px-1.5 py-0.5 rounded break-all">{whip.hlsUrl}</code></div>
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * Wrapper untuk WhipBroadcaster dengan props yang STABLE (memoized).
 * Parent page kadang re-render karena polling viewer count — kalau props
 * berubah reference tiap render, child WhipBroadcaster bisa restart unexpectedly.
 * Memoize semua callback + iceServers di sini supaya child stable.
 */
function StableBroadcasterWrapper({
  whip,
  loadSession,
  onSuccess,
  onError,
  onStatusChange,
}: {
  whip: WhipInfo;
  loadSession: (silent?: boolean) => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  onStatusChange: (
    status: "idle" | "preview" | "connecting" | "live" | "stopping" | "error"
  ) => void;
}) {
  const stableIceServers = useMemo(() => whip.iceServers, [whip.iceServers]);

  const handleStarted = useCallback(() => {
    onSuccess("Broadcast dimulai!");
    // SILENT refresh — JANGAN unmount UI (akan break WebRTC)
    loadSession(true);
  }, [onSuccess, loadSession]);

  const handleStopped = useCallback(() => {
    onSuccess("Broadcast dihentikan");
    loadSession(true);
  }, [onSuccess, loadSession]);

  const handleError = useCallback(
    (msg: string) => {
      onError(`Broadcast error: ${msg}`);
    },
    [onError]
  );

  return (
    <WhipBroadcaster
      whipUrl={whip.whipUrl}
      iceServers={stableIceServers}
      onStarted={handleStarted}
      onStopped={handleStopped}
      onError={handleError}
      onStatusChange={onStatusChange}
    />
  );
}
