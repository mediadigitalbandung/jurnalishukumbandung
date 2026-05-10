/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Radio,
  Square,
  Loader2,
  AlertTriangle,
  Settings,
  Wifi,
  WifiOff,
  Monitor,
  Lock,
  RefreshCw,
  ShieldAlert,
  Info,
} from "lucide-react";

type Status = "idle" | "preview" | "connecting" | "live" | "stopping" | "error";

type ErrorKind =
  | "permission_denied" // user blocked camera/mic
  | "no_device" // no camera/mic found
  | "device_in_use" // camera in use by another app
  | "constraints_unsupported" // requested resolution/etc not supported
  | "insecure_context" // not HTTPS
  | "no_api" // browser tidak support getUserMedia
  | "unknown";

type DetectedBrowser = "chrome" | "edge" | "firefox" | "safari" | "other";

function detectBrowser(): DetectedBrowser {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("firefox/")) return "firefox";
  if (ua.includes("chrome/")) return "chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "safari";
  return "other";
}

function classifyMediaError(e: unknown): ErrorKind {
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure_context";
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return "no_api";
  if (!(e instanceof Error)) return "unknown";
  const name = (e as DOMException).name || "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError": // legacy
    case "SecurityError":
      return "permission_denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "no_device";
    case "NotReadableError":
    case "TrackStartError":
      return "device_in_use";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "constraints_unsupported";
    default:
      return "unknown";
  }
}

interface Props {
  whipUrl: string;
  iceServers?: RTCIceServer[];
  onStarted?: () => void;
  onStopped?: () => void;
  onError?: (msg: string) => void;
}

/**
 * Browser-based broadcaster pakai WebRTC + WHIP protocol.
 * - getUserMedia → kamera + mic
 * - RTCPeerConnection → buat offer
 * - POST offer ke /srs/rtc/v1/whip → SRS reply dengan answer
 * - Stream mulai mengalir ke server
 *
 * Untuk stop: POST DELETE ke resource URL yang dikasih SRS, atau cukup close PC.
 */
export default function WhipBroadcaster({
  whipUrl,
  iceServers = [{ urls: "stun:stun.l.google.com:19302" }],
  onStarted,
  onStopped,
  onError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resourceUrlRef = useRef<string | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [permissionState, setPermissionState] = useState<{
    camera?: PermissionState;
    microphone?: PermissionState;
  }>({});
  const [browser] = useState<DetectedBrowser>(() => detectBrowser());
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[]; mics: MediaDeviceInfo[] }>({
    cameras: [],
    mics: [],
  });
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState<{ bitrate: number; fps: number; resolution: string } | null>(
    null
  );
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef<number>(0);

  // Proactive permission check (Permissions API — Chrome/Edge/Firefox; Safari ga support)
  const checkPermissions = useCallback(async () => {
    if (!navigator.permissions?.query) return;
    try {
      const cam = await navigator.permissions
        .query({ name: "camera" as PermissionName })
        .catch(() => null);
      const mic = await navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .catch(() => null);
      setPermissionState({
        camera: cam?.state,
        microphone: mic?.state,
      });
      // Listen for permission state changes (user may grant later via address bar)
      if (cam) cam.onchange = () => setPermissionState((p) => ({ ...p, camera: cam.state }));
      if (mic) mic.onchange = () => setPermissionState((p) => ({ ...p, microphone: mic.state }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  // Enumerate devices
  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cameras = list.filter((d) => d.kind === "videoinput");
      const mics = list.filter((d) => d.kind === "audioinput");
      setDevices({ cameras, mics });
      if (!selectedCamera && cameras[0]) setSelectedCamera(cameras[0].deviceId);
      if (!selectedMic && mics[0]) setSelectedMic(mics[0].deviceId);
    } catch (e) {
      console.error("enumerateDevices failed:", e);
    }
  }, [selectedCamera, selectedMic]);

  // Start preview (request camera/mic)
  const startPreview = useCallback(async () => {
    setError("");
    setErrorKind(null);

    // Pre-flight: secure context check
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setErrorKind("insecure_context");
      setError("Halaman harus diakses via HTTPS untuk pakai kamera.");
      setStatus("error");
      return;
    }
    // Pre-flight: API available?
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorKind("no_api");
      setError("Browser kamu tidak support akses kamera/mic. Update ke Chrome/Firefox/Safari versi terbaru.");
      setStatus("error");
      return;
    }

    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          deviceId: selectedMic ? { exact: selectedMic } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus("preview");
      await refreshDevices();
      // Refresh permission state setelah grant
      await checkPermissions();
    } catch (e) {
      const kind = classifyMediaError(e);
      const rawMsg = e instanceof Error ? e.message : String(e);
      setErrorKind(kind);
      // Pesan singkat di header — detail di panel terpisah
      const friendly: Record<ErrorKind, string> = {
        permission_denied: "Akses kamera & mikrofon ditolak browser",
        no_device: "Kamera atau mikrofon tidak ditemukan",
        device_in_use: "Kamera/mic sedang dipakai aplikasi lain",
        constraints_unsupported: "Kamera tidak support resolusi yang diminta",
        insecure_context: "Halaman harus diakses via HTTPS",
        no_api: "Browser tidak support akses kamera",
        unknown: `Tidak bisa akses kamera/mic: ${rawMsg}`,
      };
      setError(friendly[kind]);
      setStatus("error");
      onError?.(rawMsg);
    }
  }, [selectedCamera, selectedMic, refreshDevices, onError, checkPermissions]);

  // Toggle camera/mic on/off
  const toggleCamera = () => {
    if (!streamRef.current) return;
    const video = streamRef.current.getVideoTracks()[0];
    if (video) {
      video.enabled = !video.enabled;
      setCameraOn(video.enabled);
    }
  };
  const toggleMic = () => {
    if (!streamRef.current) return;
    const audio = streamRef.current.getAudioTracks()[0];
    if (audio) {
      audio.enabled = !audio.enabled;
      setMicOn(audio.enabled);
    }
  };

  // Start broadcasting via WHIP
  const startBroadcast = useCallback(async () => {
    if (!streamRef.current) {
      setError("Preview kamera belum aktif");
      return;
    }
    setError("");
    setStatus("connecting");

    try {
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // Add tracks (audio + video)
      streamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current!);
      });

      // Listen for state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[WHIP] Connection state:", state);
        if (state === "connected") {
          setStatus("live");
          startTimeRef.current = Date.now();
          onStarted?.();
        } else if (state === "failed" || state === "disconnected") {
          setError(`Koneksi ${state}. Coba mulai ulang.`);
          setStatus("error");
          onError?.(state);
        }
      };

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering complete (so SDP includes all candidates)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
          // Fallback timeout 5 detik
          setTimeout(resolve, 5000);
        }
      });

      const finalOffer = pc.localDescription;
      if (!finalOffer) throw new Error("Gagal create offer");

      // POST SDP offer ke WHIP endpoint
      const res = await fetch(whipUrl, {
        method: "POST",
        headers: { "Content-Type": "application/sdp" },
        body: finalOffer.sdp,
      });

      if (!res.ok) {
        throw new Error(`WHIP server error: ${res.status} ${res.statusText}`);
      }

      // Extract resource URL untuk DELETE later (RFC 8866)
      const location = res.headers.get("Location");
      if (location) {
        try {
          resourceUrlRef.current = new URL(location, whipUrl).toString();
        } catch {
          resourceUrlRef.current = location;
        }
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      console.log("[WHIP] SDP exchange complete, waiting for ICE...");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Gagal mulai broadcast: ${msg}`);
      setStatus("error");
      onError?.(msg);
      // Cleanup
      pcRef.current?.close();
      pcRef.current = null;
    }
  }, [whipUrl, iceServers, onStarted, onError]);

  // Stop broadcasting
  const stopBroadcast = useCallback(async () => {
    setStatus("stopping");
    try {
      // Send DELETE ke resource URL kalau ada
      if (resourceUrlRef.current) {
        try {
          await fetch(resourceUrlRef.current, { method: "DELETE" });
        } catch {
          // ignore — connection mungkin sudah putus
        }
      }
      pcRef.current?.close();
      pcRef.current = null;
      resourceUrlRef.current = null;
      setStatus("preview");
      onStopped?.();
    } catch (e) {
      console.error("Stop broadcast error:", e);
      setStatus("preview");
    }
  }, [onStopped]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Stats polling saat live
  useEffect(() => {
    if (status !== "live" || !pcRef.current) return;
    const interval = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      // Update duration
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      // Stats from WebRTC
      try {
        const reports = await pc.getStats();
        let bitrate = 0;
        let fps = 0;
        let resolution = "";
        reports.forEach((r) => {
          if (r.type === "outbound-rtp" && r.kind === "video") {
            const v = r as RTCOutboundRtpStreamStats & {
              bytesSent?: number;
              framesPerSecond?: number;
              frameWidth?: number;
              frameHeight?: number;
            };
            if (v.framesPerSecond) fps = v.framesPerSecond;
            if (v.frameWidth && v.frameHeight) resolution = `${v.frameWidth}×${v.frameHeight}`;
            // Rough bitrate calculation (bytesSent diff over time would need state)
            if (v.bytesSent) bitrate = Math.round(v.bytesSent / Math.max(1, (Date.now() - startTimeRef.current) / 1000) / 125);
          }
        });
        setStats({ bitrate, fps, resolution });
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [status]);

  const fmtDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Video preview */}
      <div className="relative bg-black rounded-[12px] overflow-hidden aspect-video shadow-card">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
        />
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4 text-center">
            <button
              onClick={startPreview}
              className="flex items-center gap-2 bg-goto-green hover:bg-goto-green-dark px-6 py-3 rounded-full font-semibold"
            >
              <Camera className="h-5 w-5" />
              Aktifkan Kamera & Mic
            </button>
            {(permissionState.camera === "denied" || permissionState.microphone === "denied") && (
              <div className="mt-3 text-xs bg-orange-500/90 text-white px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Akses ditolak — klik tombol di atas untuk lihat cara izinkan
              </div>
            )}
            {permissionState.camera === "granted" && permissionState.microphone === "granted" && (
              <div className="mt-3 text-xs text-green-300 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full" />
                Izin sudah aktif — siap broadcast
              </div>
            )}
          </div>
        )}
        {status === "live" && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded shadow">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            <span className="bg-black/60 text-white text-xs font-mono px-2 py-1 rounded">
              {fmtDuration(duration)}
            </span>
            {stats && (
              <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                {stats.resolution} · {stats.fps}fps · {stats.bitrate}kbps
              </span>
            )}
          </div>
        )}
        {(status === "connecting" || status === "stopping") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">{status === "connecting" ? "Connecting..." : "Stopping..."}</span>
          </div>
        )}
      </div>

      {/* Error — basic banner untuk error generic */}
      {error && errorKind !== "permission_denied" && errorKind !== "no_device" && errorKind !== "device_in_use" && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm flex-1">{error}</div>
          <button
            onClick={() => {
              setError("");
              setErrorKind(null);
              startPreview();
            }}
            className="btn-secondary !px-3 !py-1 inline-flex items-center gap-1 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* Permission denied — panel instruksi step-by-step */}
      {errorKind === "permission_denied" && (
        <div className="rounded-[12px] border-2 border-orange-300 bg-orange-50 p-5">
          <div className="flex items-start gap-3 mb-3">
            <ShieldAlert className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-orange-900 text-base">
                Browser memblokir akses kamera & mikrofon
              </h3>
              <p className="text-sm text-orange-800 mt-1">
                Untuk broadcast live, kamu harus mengizinkan akses kamera dan mikrofon. Ikuti langkah di bawah ini sesuai browser kamu.
              </p>
            </div>
          </div>

          {browser === "chrome" || browser === "edge" ? (
            <div className="space-y-3">
              <div className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="font-semibold text-sm text-txt-primary mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-orange-600" />
                  Cara izinkan di {browser === "edge" ? "Microsoft Edge" : "Google Chrome"}:
                </div>
                <ol className="text-sm text-txt-primary space-y-2 list-decimal list-inside ml-2">
                  <li>
                    Klik ikon <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-200 rounded mx-1"><Lock className="h-3 w-3" /></span> (gembok / info) di kiri address bar
                  </li>
                  <li>Cari <strong>"Camera"</strong> & <strong>"Microphone"</strong></li>
                  <li>Pilih <strong>"Allow"</strong> untuk keduanya</li>
                  <li>Reload halaman ini, lalu klik <strong>"Coba Lagi"</strong> di bawah</li>
                </ol>
                <div className="mt-3 pt-3 border-t border-orange-100 text-xs text-txt-secondary">
                  💡 Atau buka langsung:{" "}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                    chrome://settings/content/camera
                  </code>{" "}
                  &{" "}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                    chrome://settings/content/microphone
                  </code>
                </div>
              </div>
            </div>
          ) : browser === "firefox" ? (
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="font-semibold text-sm text-txt-primary mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-orange-600" /> Cara izinkan di Firefox:
              </div>
              <ol className="text-sm text-txt-primary space-y-2 list-decimal list-inside ml-2">
                <li>Klik ikon perisai/info di kiri address bar</li>
                <li>Klik <strong>"Connection secure"</strong> → <strong>"More information"</strong></li>
                <li>Tab <strong>"Permissions"</strong> → cari <strong>"Use the Camera"</strong> & <strong>"Use the Microphone"</strong></li>
                <li>Uncheck <strong>"Use Default"</strong> → pilih <strong>"Allow"</strong></li>
                <li>Reload halaman, klik <strong>"Coba Lagi"</strong></li>
              </ol>
            </div>
          ) : browser === "safari" ? (
            <div className="bg-white rounded-lg p-4 border border-orange-200">
              <div className="font-semibold text-sm text-txt-primary mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-orange-600" /> Cara izinkan di Safari:
              </div>
              <ol className="text-sm text-txt-primary space-y-2 list-decimal list-inside ml-2">
                <li>Menu bar atas: <strong>Safari → Settings (atau Preferences)</strong></li>
                <li>Tab <strong>Websites</strong> → pilih <strong>Camera</strong> di sidebar kiri</li>
                <li>Cari <strong>jurnalishukumbandung.com</strong> → pilih <strong>Allow</strong></li>
                <li>Ulangi untuk <strong>Microphone</strong></li>
                <li>Reload halaman, klik <strong>"Coba Lagi"</strong></li>
              </ol>
              <div className="mt-3 pt-3 border-t border-orange-100 text-xs text-txt-secondary">
                💡 Di iPhone/iPad: <strong>Settings → Safari → Camera/Microphone → Allow</strong>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 border border-orange-200 text-sm text-txt-primary">
              Buka pengaturan browser kamu, cari <strong>Site Permissions / Privacy</strong>, lalu izinkan
              akses kamera & mikrofon untuk <strong>jurnalishukumbandung.com</strong>. Setelah itu reload halaman.
            </div>
          )}

          {/* Permission state info (kalau API support) */}
          {(permissionState.camera || permissionState.microphone) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className={`px-2 py-1 rounded-full border ${permissionState.camera === "granted" ? "bg-green-50 text-green-700 border-green-200" : permissionState.camera === "denied" ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-700 border-gray-200"}`}>
                <Camera className="h-3 w-3 inline mr-1" />
                Camera: {permissionState.camera || "unknown"}
              </span>
              <span className={`px-2 py-1 rounded-full border ${permissionState.microphone === "granted" ? "bg-green-50 text-green-700 border-green-200" : permissionState.microphone === "denied" ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-700 border-gray-200"}`}>
                <Mic className="h-3 w-3 inline mr-1" />
                Mic: {permissionState.microphone || "unknown"}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setError("");
                setErrorKind(null);
                startPreview();
              }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Coba Lagi
            </button>
            <button
              onClick={() => {
                checkPermissions();
              }}
              className="btn-secondary inline-flex items-center gap-2"
              title="Refresh status izin"
            >
              <Info className="h-4 w-4" />
              Cek Status Izin
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Halaman
            </button>
          </div>

          <div className="mt-3 text-xs text-orange-700/80 italic">
            ⚠️ Setelah mengizinkan di pengaturan browser, kamu perlu reload halaman supaya browser mengenali perubahan. Tombol "Coba Lagi" mungkin tidak cukup.
          </div>
        </div>
      )}

      {/* No device — kamera/mic tidak terdeteksi */}
      {errorKind === "no_device" && (
        <div className="rounded-[12px] border-2 border-red-300 bg-red-50 p-5">
          <div className="flex items-start gap-3 mb-3">
            <CameraOff className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900 text-base">
                Kamera atau mikrofon tidak terdeteksi
              </h3>
              <p className="text-sm text-red-800 mt-1">
                Browser tidak menemukan kamera atau mikrofon di device kamu.
              </p>
            </div>
          </div>
          <ul className="text-sm text-txt-primary space-y-1.5 list-disc list-inside ml-2 bg-white rounded p-3 border border-red-200">
            <li>Pastikan webcam terpasang & kabel USB tidak lepas</li>
            <li>Pastikan mikrofon (built-in atau external) berfungsi</li>
            <li>Coba close lalu buka ulang browser</li>
            <li>Coba browser lain (Chrome / Firefox)</li>
            <li>Di laptop: cek tombol fisik untuk disable webcam (kadang ada switch)</li>
          </ul>
          <button
            onClick={() => {
              setError("");
              setErrorKind(null);
              startPreview();
            }}
            className="btn-primary inline-flex items-center gap-2 mt-4"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Deteksi Lagi
          </button>
        </div>
      )}

      {/* Device in use — kamera kepake aplikasi lain */}
      {errorKind === "device_in_use" && (
        <div className="rounded-[12px] border-2 border-yellow-300 bg-yellow-50 p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle className="h-6 w-6 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-yellow-900 text-base">
                Kamera/mic sedang dipakai aplikasi lain
              </h3>
              <p className="text-sm text-yellow-800 mt-1">
                Hanya satu aplikasi yang bisa pakai kamera dalam satu waktu.
              </p>
            </div>
          </div>
          <ul className="text-sm text-txt-primary space-y-1.5 list-disc list-inside ml-2 bg-white rounded p-3 border border-yellow-200">
            <li>Tutup aplikasi yang mungkin pakai kamera: Zoom, Google Meet, Teams, OBS, Discord, Skype, dll</li>
            <li>Tutup tab browser lain yang lagi pakai kamera (cek titik merah di tab)</li>
            <li>Restart browser kalau perlu</li>
          </ul>
          <button
            onClick={() => {
              setError("");
              setErrorKind(null);
              startPreview();
            }}
            className="btn-primary inline-flex items-center gap-2 mt-4"
          >
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </button>
        </div>
      )}

      {/* Controls */}
      {status !== "idle" && status !== "error" && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={toggleCamera}
            className={`btn-secondary !px-3 !py-2 ${!cameraOn ? "!bg-red-100 !text-red-700" : ""}`}
            title={cameraOn ? "Matikan kamera" : "Hidupkan kamera"}
          >
            {cameraOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={toggleMic}
            className={`btn-secondary !px-3 !py-2 ${!micOn ? "!bg-red-100 !text-red-700" : ""}`}
            title={micOn ? "Matikan mic" : "Hidupkan mic"}
          >
            {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="btn-secondary !px-3 !py-2"
            title="Pilih kamera/mic"
          >
            <Settings className="h-4 w-4" />
          </button>

          {status === "preview" && (
            <button
              type="button"
              onClick={startBroadcast}
              className="ml-auto inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-full font-semibold shadow"
            >
              <Radio className="h-4 w-4" />
              Mulai Live Broadcast
            </button>
          )}
          {status === "live" && (
            <button
              type="button"
              onClick={stopBroadcast}
              className="ml-auto inline-flex items-center gap-2 bg-gray-800 hover:bg-black text-white px-6 py-2.5 rounded-full font-semibold shadow"
            >
              <Square className="h-4 w-4" />
              Stop Live
            </button>
          )}
          {status === "connecting" && (
            <span className="ml-auto inline-flex items-center gap-2 text-txt-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting to server...
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1 text-xs ${
              status === "live" ? "text-goto-green" : "text-txt-secondary"
            }`}
          >
            {status === "live" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {status === "live" ? "Tersambung" : status === "preview" ? "Siap" : status}
          </span>
        </div>
      )}

      {/* Device settings */}
      {showSettings && status !== "idle" && (
        <div className="card p-4 space-y-3">
          <div>
            <label className="block text-xs text-txt-secondary mb-1">
              <Camera className="h-3 w-3 inline mr-1" /> Kamera
            </label>
            <select
              value={selectedCamera}
              onChange={(e) => {
                setSelectedCamera(e.target.value);
                if (status === "preview" || status === "live") {
                  // Re-acquire stream — kalau live, harus stop dulu
                  if (status === "preview") setTimeout(() => startPreview(), 100);
                }
              }}
              className="input !py-1.5 !text-sm w-full"
            >
              {devices.cameras.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-txt-secondary mb-1">
              <Mic className="h-3 w-3 inline mr-1" /> Mikrofon
            </label>
            <select
              value={selectedMic}
              onChange={(e) => {
                setSelectedMic(e.target.value);
                if (status === "preview") setTimeout(() => startPreview(), 100);
              }}
              className="input !py-1.5 !text-sm w-full"
            >
              {devices.mics.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-txt-muted flex items-center gap-1">
            <Monitor className="h-3 w-3" /> Tip: Untuk kualitas optimal, pakai laptop/PC dengan koneksi internet stabil minimal 3 Mbps upload.
          </p>
        </div>
      )}
    </div>
  );
}
