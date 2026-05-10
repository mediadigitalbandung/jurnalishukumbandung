"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import HlsPlayer from "@/components/live/HlsPlayer";
import { Eye } from "lucide-react";

interface Props {
  sessionId: string;
  slug: string;
  initialStatus: string;
  src: string;
  poster?: string;
  isLive: boolean;
}

/**
 * Client-side wrapper untuk player + live status polling.
 * Auto-refresh halaman saat live berakhir & recording siap.
 */
export default function LiveWatchClient({
  sessionId,
  slug,
  initialStatus,
  src,
  poster,
  isLive,
}: Props) {
  const router = useRouter();
  const [currentViewers, setCurrentViewers] = useState(0);
  const [statusNow, setStatusNow] = useState(initialStatus);
  const pingedRef = useRef(false);

  // Ping viewer count sekali saat mount (kalau lagi LIVE)
  useEffect(() => {
    if (!isLive || pingedRef.current) return;
    pingedRef.current = true;
    fetch(`/api/live/${sessionId}/status`, { method: "POST" }).catch(() => null);
  }, [isLive, sessionId]);

  // Poll status tiap 15 detik kalau lagi live
  useEffect(() => {
    if (!isLive) return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live/${sessionId}/status`);
        const json = await res.json();
        if (json.success) {
          setCurrentViewers(json.data.currentViewers || 0);
          // Kalau status berubah dari LIVE → ENDED/ARCHIVED, refresh halaman
          if (json.data.status !== "LIVE" && statusNow === "LIVE") {
            setStatusNow(json.data.status);
            // Reload setelah delay supaya recording URL sudah ada
            setTimeout(() => router.refresh(), 5000);
          }
        }
      } catch {
        /* ignore */
      }
    };
    const interval = setInterval(tick, 15000);
    return () => clearInterval(interval);
  }, [isLive, sessionId, statusNow, router]);

  return (
    <div className="space-y-2">
      <HlsPlayer
        src={src}
        poster={poster}
        isLive={isLive}
        autoPlay={isLive}
        className="aspect-video rounded-[12px]"
      />
      {isLive && currentViewers > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-txt-secondary">
          <Eye className="h-4 w-4" />
          <span className="font-medium">{currentViewers.toLocaleString("id-ID")}</span> menonton sekarang
        </div>
      )}
    </div>
  );
}
