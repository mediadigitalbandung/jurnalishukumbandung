"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Loader2, Play } from "lucide-react";

interface Props {
  src: string; // HLS .m3u8 URL atau MP4 URL untuk recording
  poster?: string;
  isLive?: boolean;
  autoPlay?: boolean;
  className?: string;
  onError?: (msg: string) => void;
}

/**
 * Universal player — handle HLS (.m3u8) untuk live & MP4 untuk recording.
 * Pakai hls.js untuk browser yang ga native (Chrome, FF). Safari pake native HLS.
 */
export default function HlsPlayer({
  src,
  poster,
  isLive = false,
  autoPlay = false,
  className = "",
  onError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLoading(true);
    setError(null);

    const isHls = src.endsWith(".m3u8") || src.includes(".m3u8?");
    const isMp4 = src.endsWith(".mp4") || src.includes(".mp4?");

    // MP4 recording — set src langsung
    if (isMp4) {
      video.src = src;
      video.load();
      const onLoaded = () => setLoading(false);
      const onErr = () => {
        setError("Gagal load video recording");
        setLoading(false);
        onError?.("MP4 load failed");
      };
      video.addEventListener("loadeddata", onLoaded);
      video.addEventListener("error", onErr);
      return () => {
        video.removeEventListener("loadeddata", onLoaded);
        video.removeEventListener("error", onErr);
      };
    }

    if (!isHls) {
      // Fallback — set as-is
      video.src = src;
      setLoading(false);
      return;
    }

    // HLS playback
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = src;
      const onLoaded = () => setLoading(false);
      video.addEventListener("loadeddata", onLoaded);
      return () => video.removeEventListener("loadeddata", onLoaded);
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        // Live tuning
        liveSyncDuration: isLive ? 4 : undefined,
        liveMaxLatencyDuration: isLive ? 12 : undefined,
        lowLatencyMode: isLive,
        backBufferLength: isLive ? 30 : 90,
        // Recovery
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 6,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Live belum mulai atau koneksi putus — retry
              if (isLive) {
                setError("Stream belum tersedia / koneksi putus, retry...");
                setTimeout(() => {
                  hls.startLoad();
                }, 3000);
              } else {
                setError("Tidak bisa load video");
                onError?.(`Network error: ${data.details}`);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError("Error media — recovering...");
              hls.recoverMediaError();
              break;
            default:
              setError("Player error fatal");
              hls.destroy();
              onError?.(`Fatal: ${data.details}`);
              break;
          }
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    // Browser tidak support HLS sama sekali
    setError("Browser tidak support HLS playback");
    setLoading(false);
  }, [src, isLive, onError]);

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        controls
        playsInline
        autoPlay={autoPlay}
        muted={autoPlay}
        poster={poster}
        className="w-full h-full"
      />
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4 text-center">
          <Play className="h-10 w-10 opacity-50 mb-3" />
          <div className="text-sm">{error}</div>
        </div>
      )}
      {isLive && !error && !loading && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg pointer-events-none">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
      )}
    </div>
  );
}
