"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/live/${params.id}`);
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Gagal load session");
        setLoading(false);
        return;
      }
      setSession(json.data);
      setLoading(false);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Polling viewer count saat live
  useEffect(() => {
    if (session?.status !== "LIVE") return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live/${params.id}/status`);
        const json = await res.json();
        if (json.success && session) {
          setSession({ ...session, currentViewers: json.data.currentViewers || 0 });
        }
      } catch {
        /* ignore */
      }
    };
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, [session, params.id]);

  const handleStart = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${params.id}/start`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        showError(json.error || "Gagal start");
        return;
      }
      setWhip(json.data);
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
  }, [params.id, showError]);

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
        showError(json.error || "Gagal akhiri");
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : "Network error");
    }
  }, [params.id, confirm, success, showError, router]);

  const copyViewerLink = () => {
    if (!session) return;
    const url = `${window.location.origin}/live/${session.slug}`;
    navigator.clipboard.writeText(url);
    success("Link viewer dicopy ke clipboard");
  };

  if (loading) {
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
          {session.status === "LIVE" && (
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

      {/* Status card */}
      <div className="card p-4 flex items-start gap-3">
        <div
          className={`mt-1 w-3 h-3 rounded-full ${
            session.status === "LIVE"
              ? "bg-red-500 animate-pulse"
              : session.status === "SCHEDULED"
              ? "bg-blue-500"
              : "bg-gray-400"
          }`}
        />
        <div className="flex-1">
          <div className="font-semibold">
            Status: {session.status === "LIVE" ? "Sedang Live" : session.status === "SCHEDULED" ? "Siap Broadcast" : session.status}
          </div>
          <div className="text-sm text-txt-secondary mt-0.5">
            {session.status === "LIVE"
              ? "Stream sedang aktif. Viewer bisa lihat di halaman /live/" + session.slug
              : "Klik 'Aktifkan Kamera' untuk preview, lalu 'Mulai Live Broadcast' untuk siaran."}
          </div>
        </div>
        {session.status === "LIVE" && (
          <button
            onClick={handleEnd}
            className="!px-4 !py-2 inline-flex items-center gap-1.5 text-sm rounded-full bg-gray-800 hover:bg-black text-white font-semibold"
          >
            Akhiri Live
          </button>
        )}
      </div>

      {/* Broadcaster UI */}
      {whip ? (
        <WhipBroadcaster
          whipUrl={whip.whipUrl}
          iceServers={whip.iceServers}
          onStarted={() => {
            success("Broadcast dimulai!");
            // Reload session untuk update status
            setTimeout(loadSession, 2000);
          }}
          onStopped={() => {
            // Auto-call end API setelah broadcaster stop
            handleEnd();
          }}
          onError={(msg) => showError(`Broadcast error: ${msg}`)}
        />
      ) : (
        <div className="card p-8 text-center space-y-4">
          <Radio className="h-12 w-12 text-red-600 mx-auto" />
          <div className="text-lg font-semibold">Siap broadcast?</div>
          <div className="text-sm text-txt-secondary max-w-md mx-auto">
            Klik tombol di bawah untuk dapatkan akses kamera & mic, lalu mulai siaran live ke website JHB.
          </div>
          <button
            onClick={handleStart}
            disabled={session.status === "LIVE"}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3"
          >
            <Radio className="h-5 w-5" />
            {session.status === "LIVE" ? "Sudah Live (load broadcaster...)" : "Persiapkan Broadcast"}
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
