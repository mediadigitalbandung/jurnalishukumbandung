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
} from "lucide-react";

type Status = "idle" | "preview" | "connecting" | "live" | "stopping" | "error";

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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal akses kamera/mic";
      setError(`Gagal akses kamera/mic: ${msg}. Pastikan izin sudah diberikan di browser.`);
      setStatus("error");
      onError?.(msg);
    }
  }, [selectedCamera, selectedMic, refreshDevices, onError]);

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
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
            <button
              onClick={startPreview}
              className="flex items-center gap-2 bg-goto-green hover:bg-goto-green-dark px-6 py-3 rounded-full font-semibold"
            >
              <Camera className="h-5 w-5" />
              Aktifkan Kamera & Mic
            </button>
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

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
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
