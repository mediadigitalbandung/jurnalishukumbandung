import { randomBytes } from "crypto";

/**
 * Live streaming infrastructure config.
 * SRS jalan di VPS lokal (port 1985 API, 8080 HLS, 8000 UDP WebRTC),
 * di-proxy lewat Nginx ke jurnalishukumbandung.com path-based.
 */
export const LIVE_CONFIG = {
  // Public-facing URLs (lewat Cloudflare → Nginx → SRS)
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com",
  // SRS WHIP endpoint untuk broadcaster (browser POST SDP offer)
  whipPath: "/srs/rtc/v1/whip/",
  // SRS WHEP endpoint untuk WebRTC playback (low-latency, optional)
  whepPath: "/srs/rtc/v1/whep/",
  // SRS HLS playback prefix (viewer fetch .m3u8 + .ts)
  hlsPath: "/hls/",
  // Recording playback prefix (MP4 setelah live selesai)
  recordingPath: "/recordings/",
  // SRS app name (semua live ditaruh di app "live")
  app: "live",
  // SRS internal API (server-side only, untuk query stream status)
  internalApiUrl: "http://127.0.0.1:1985/api/v1",
  // Filesystem path recording di server
  recordingDir: "/var/www/jhb/recordings",
} as const;

/** Generate random stream key (URL-safe, 24 chars hex) */
export function generateStreamKey(): string {
  return randomBytes(12).toString("hex");
}

/** WHIP URL for broadcaster (POST SDP offer here) */
export function buildWhipUrl(streamKey: string): string {
  return `${LIVE_CONFIG.baseUrl}${LIVE_CONFIG.whipPath}?app=${LIVE_CONFIG.app}&stream=${streamKey}`;
}

/** WHEP URL for low-latency WebRTC playback */
export function buildWhepUrl(streamKey: string): string {
  return `${LIVE_CONFIG.baseUrl}${LIVE_CONFIG.whepPath}?app=${LIVE_CONFIG.app}&stream=${streamKey}`;
}

/** HLS playlist URL for viewer */
export function buildHlsUrl(streamKey: string): string {
  return `${LIVE_CONFIG.baseUrl}${LIVE_CONFIG.hlsPath}${LIVE_CONFIG.app}/${streamKey}.m3u8`;
}

/** Recording MP4 URL after live ended */
export function buildRecordingUrl(filename: string): string {
  return `${LIVE_CONFIG.baseUrl}${LIVE_CONFIG.recordingPath}${filename}`;
}

/** Slugify title untuk URL public (slug live session) */
export function slugifyLiveTitle(title: string, suffix?: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return suffix ? `${base}-${suffix}` : base;
}

/** Query SRS internal API untuk dapat status stream (server-side only) */
export async function getSrsStreamStatus(streamKey: string): Promise<{
  publishing: boolean;
  clients: number;
  bitrate?: number;
  duration?: number;
} | null> {
  try {
    const res = await fetch(`${LIVE_CONFIG.internalApiUrl}/streams/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const streams = data?.streams || [];
    const stream = streams.find(
      (s: { app?: string; name?: string }) =>
        s.app === LIVE_CONFIG.app && s.name === streamKey
    );
    if (!stream) return { publishing: false, clients: 0 };
    return {
      publishing: stream.publish?.active === true,
      clients: stream.clients || 0,
      bitrate: stream.kbps?.recv_30s,
      duration: stream.live_ms ? Math.floor(stream.live_ms / 1000) : undefined,
    };
  } catch {
    return null;
  }
}

/** Build STUN servers list for WebRTC (browser-side). */
export function getStunServers() {
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

export type LiveStatusType = "SCHEDULED" | "LIVE" | "ENDED" | "ARCHIVED" | "FAILED";

export const LIVE_STATUS_LABELS: Record<LiveStatusType, string> = {
  SCHEDULED: "Dijadwalkan",
  LIVE: "Sedang Live",
  ENDED: "Selesai",
  ARCHIVED: "Recording Tersedia",
  FAILED: "Gagal",
};

export const LIVE_STATUS_COLORS: Record<LiveStatusType, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  LIVE: "bg-red-50 text-red-700 border-red-200 animate-pulse",
  ENDED: "bg-gray-50 text-gray-700 border-gray-200",
  ARCHIVED: "bg-green-50 text-green-700 border-green-200",
  FAILED: "bg-orange-50 text-orange-700 border-orange-200",
};
