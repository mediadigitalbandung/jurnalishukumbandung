"use client";

/**
 * VideoCanvas — unified multi-layer editor untuk TikTok video.
 * Preview 9:16 dengan clip background + layers yang bisa di-drag/resize/rotate:
 *   - Text overlay per-clip (stored as clip.textX/Y + text)
 *   - Custom PNG overlay (frameStyle="custom")
 *   - Subtitle mock (prototype; wired to ffmpeg later)
 *
 * Interactions:
 *   - Click clip background → deselect
 *   - Click layer → select, show handles (move/resize/rotate)
 *   - Drag → update position (debounced save via parent)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Trash2, Eye, Lock, Type, Image as ImageIcon, Subtitles, ZoomIn, ZoomOut, Maximize, Minimize, AlertTriangle, Film, Pencil } from "lucide-react";

// ─── Public types ──────────────────────────────────────────────────────

export interface ClipData {
  id: string;
  type: "video" | "image";
  sourceUrl: string;
  textOverlay: string | null;
  textColor: string | null;
  textX: number | null;   // 0-100 (%)
  textY: number | null;   // 0-100 (%)
  textFontSize: number | null;
  textRotation: number | null;
}

export interface OverlayPos {
  x: number;       // 0-1 center
  y: number;       // 0-1 center
  scale: number;   // 0.1-3
  rotation: number; // -180-180
  opacity: number;  // 0-1
}

export interface SubtitlePos {
  y: number;       // 0-1 (vertical position)
  fontSize: number; // px
  show: boolean;
}

export type SelectedLayer =
  | { kind: "none" }
  | { kind: "text"; clipId: string }
  | { kind: "overlay" }
  | { kind: "subtitle" };

interface Props {
  selectedClip: ClipData | null;
  overlayUrl: string | null;
  overlayPos: OverlayPos;
  subtitlePreview: string;        // text to show in subtitle preview
  subtitlePos: SubtitlePos;
  selected: SelectedLayer;
  onSelectLayer: (s: SelectedLayer) => void;
  onTextMove: (clipId: string, xPct: number, yPct: number) => void;
  onOverlayChange: (pos: OverlayPos) => void;
  onSubtitleMove: (y: number) => void;
  onUploadOverlay: (file: File) => Promise<void>;
  onRemoveOverlay: () => void;
  uploadingOverlay?: boolean;
  // Final rendered video URL — when set, user can toggle between edit mode and rendered preview
  renderedUrl?: string | null;
}

// ─── Component ─────────────────────────────────────────────────────────

export default function VideoCanvas({
  selectedClip,
  overlayUrl,
  overlayPos,
  subtitlePreview,
  subtitlePos,
  selected,
  onSelectLayer,
  onTextMove,
  onOverlayChange,
  onSubtitleMove,
  onUploadOverlay,
  onRemoveOverlay,
  uploadingOverlay = false,
  renderedUrl = null,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [overlayImgSize, setOverlayImgSize] = useState({ w: 200, h: 200 });
  const [overlayImgError, setOverlayImgError] = useState<string | null>(null);
  const [dragMode, setDragMode] = useState<"none" | "move-text" | "move-overlay" | "resize-overlay" | "rotate-overlay" | "move-subtitle">("none");

  // Zoom state: percentage scale of canvas vs base size (100% = fills container)
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);

  // Preview mode: "rendered" shows final video; "edit" shows per-clip + draggable layers
  // Default to "rendered" if rendered video exists, else "edit"
  const [previewMode, setPreviewMode] = useState<"rendered" | "edit">(renderedUrl ? "rendered" : "edit");

  // When renderedUrl arrives or changes, snap to rendered mode
  useEffect(() => {
    if (renderedUrl) setPreviewMode("rendered");
  }, [renderedUrl]);

  const showRenderedVideo = previewMode === "rendered" && !!renderedUrl;

  // Observe canvas size for coord conversion
  useEffect(() => {
    if (!canvasRef.current) return;
    const update = () => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) setCanvasSize({ w: rect.width, h: rect.height });
    };
    update();
    const obs = new ResizeObserver(update);
    obs.observe(canvasRef.current);
    return () => obs.disconnect();
  }, []);

  // ESC exits fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // Load overlay dims + detect load errors (CORS, 404, etc)
  useEffect(() => {
    if (!overlayUrl) {
      setOverlayImgError(null);
      return;
    }
    setOverlayImgError(null);
    const img = new Image();
    img.onload = () => {
      setOverlayImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setOverlayImgError(null);
    };
    img.onerror = () => {
      setOverlayImgError("Gagal load overlay — cek URL / CORS");
    };
    img.src = overlayUrl;
  }, [overlayUrl]);

  // Global pointer handlers for dragging
  useEffect(() => {
    if (dragMode === "none") return;

    const handleMove = (e: PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;

      if (dragMode === "move-text" && selectedClip) {
        const xPct = Math.max(0, Math.min(100, (px / w) * 100));
        const yPct = Math.max(0, Math.min(100, (py / h) * 100));
        onTextMove(selectedClip.id, xPct, yPct);
      } else if (dragMode === "move-overlay") {
        onOverlayChange({
          ...overlayPos,
          x: Math.max(0, Math.min(1, px / w)),
          y: Math.max(0, Math.min(1, py / h)),
        });
      } else if (dragMode === "resize-overlay") {
        const cx = overlayPos.x * w;
        const cy = overlayPos.y * h;
        const dist = Math.hypot(px - cx, py - cy);
        const baseRadius = (0.3 * w) / 2;
        const newScale = Math.max(0.1, Math.min(3, dist / baseRadius));
        onOverlayChange({ ...overlayPos, scale: newScale });
      } else if (dragMode === "rotate-overlay") {
        const cx = overlayPos.x * w;
        const cy = overlayPos.y * h;
        const angle = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
        onOverlayChange({ ...overlayPos, rotation: Math.round(angle + 90) });
      } else if (dragMode === "move-subtitle") {
        const yN = Math.max(0.05, Math.min(0.95, py / h));
        onSubtitleMove(yN);
      }
    };

    const handleUp = () => setDragMode("none");

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragMode, selectedClip, overlayPos, onTextMove, onOverlayChange, onSubtitleMove]);

  const onFileSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) { alert("PNG/JPG saja"); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Max 2MB"); return; }
    await onUploadOverlay(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Render ──────────────────────────────────────────────────────────

  const textX = selectedClip?.textX ?? 50;
  const textY = selectedClip?.textY ?? 50;
  const textColor = selectedClip?.textColor ?? "#FFFFFF";
  const textFontSizePx = selectedClip?.textFontSize ?? 54;
  // Scale font size down to canvas (assuming 1080w native → canvas w)
  const canvasFontSize = canvasSize.w > 0 ? (textFontSizePx / 1080) * canvasSize.w : 24;

  // Overlay display dimensions
  const overlayDisplayW = canvasSize.w > 0 ? 0.3 * canvasSize.w * overlayPos.scale : 100;
  const overlayAspect = overlayImgSize.h / overlayImgSize.w;
  const overlayDisplayH = overlayDisplayW * overlayAspect;

  const isTextSelected = selected.kind === "text" && selected.clipId === selectedClip?.id;
  const isOverlaySelected = selected.kind === "overlay";
  const isSubtitleSelected = selected.kind === "subtitle";

  // Zoom controls
  const zoomIn = () => setZoom((z) => Math.min(200, z + 25));
  const zoomOut = () => setZoom((z) => Math.max(25, z - 25));
  const zoomReset = () => setZoom(100);

  // Canvas height: base = min(78vh, fits viewport), then scale by zoom
  const baseHeight = fullscreen ? "92vh" : "min(78vh, 85vw * 16/9)";

  const canvasWrapperClass = fullscreen
    ? "fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 p-4"
    : "flex h-full flex-col";

  return (
    <div className={canvasWrapperClass}>
      {/* Toolbar */}
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <p className={`text-xs font-semibold ${fullscreen ? "text-white" : "text-txt-secondary"}`}>
            {showRenderedVideo ? (
              <>🎞️ <span className="text-pink-600">Hasil Render Final</span> · semua clip + overlay</>
            ) : selectedClip ? (
              <>
                Clip <span className="text-pink-600">#{selectedClip.id.slice(-4)}</span> · edit mode
              </>
            ) : (
              "Pilih clip atau render video dulu"
            )}
          </p>

          {/* Mode toggle — only show if rendered video exists */}
          {renderedUrl && (
            <div className={`inline-flex rounded-full border ${fullscreen ? "border-white/20 bg-black/40" : "border-border bg-surface-secondary"} p-0.5`}>
              <button
                onClick={() => setPreviewMode("rendered")}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  showRenderedVideo
                    ? "bg-pink-600 text-white"
                    : fullscreen ? "text-white/60 hover:text-white" : "text-txt-muted hover:text-txt-primary"
                }`}
                title="Tampilkan hasil render final (semua clip+overlay sudah jadi 1)"
              >
                <Film size={10} /> Final
              </button>
              <button
                onClick={() => setPreviewMode("edit")}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  !showRenderedVideo
                    ? "bg-pink-600 text-white"
                    : fullscreen ? "text-white/60 hover:text-white" : "text-txt-muted hover:text-txt-primary"
                }`}
                title="Edit mode — drag overlay/text per clip"
              >
                <Pencil size={10} /> Edit
              </button>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1 ${fullscreen ? "text-white/70" : "text-txt-muted"}`}>
          <button
            onClick={zoomOut}
            disabled={zoom <= 25}
            className={`rounded p-1 transition-colors disabled:opacity-30 ${fullscreen ? "hover:bg-white/10" : "hover:bg-surface-secondary"}`}
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={zoomReset}
            className={`min-w-[40px] rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors ${fullscreen ? "hover:bg-white/10" : "hover:bg-surface-secondary"}`}
            title="Reset zoom"
          >
            {zoom}%
          </button>
          <button
            onClick={zoomIn}
            disabled={zoom >= 200}
            className={`rounded p-1 transition-colors disabled:opacity-30 ${fullscreen ? "hover:bg-white/10" : "hover:bg-surface-secondary"}`}
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
          <div className={`mx-1 h-3 w-px ${fullscreen ? "bg-white/20" : "bg-border"}`} />
          <button
            onClick={() => setFullscreen((f) => !f)}
            className={`rounded p-1 transition-colors ${fullscreen ? "hover:bg-white/10" : "hover:bg-surface-secondary"}`}
            title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
          >
            {fullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
          </button>
          <span className={`ml-1 text-[10px] ${fullscreen ? "text-white/50" : ""}`}>
            {canvasSize.w > 0 && <>{Math.round(canvasSize.w)}×{Math.round(canvasSize.h)}</>}
          </span>
        </div>
      </div>

      {/* Canvas container — centered with zoom */}
      <div
        className={`flex flex-1 items-center justify-center ${zoom > 100 ? "overflow-auto" : "overflow-hidden"}`}
        style={{ minHeight: "200px" }}
      >
        <div
          ref={canvasRef}
          className="relative overflow-hidden rounded-xl border-2 border-border bg-black shadow-xl transition-[transform] duration-150"
          style={{
            aspectRatio: "9 / 16",
            height: baseHeight,
            maxHeight: fullscreen ? "92vh" : "78vh",
            transform: `scale(${zoom / 100})`,
            transformOrigin: "center",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onSelectLayer({ kind: "none" });
          }}
        >
          {/* Background — rendered video (final preview) OR per-clip preview */}
          {showRenderedVideo ? (
            <video
              key={renderedUrl}
              src={renderedUrl!}
              className="absolute inset-0 h-full w-full object-contain bg-black"
              controls
              loop
              playsInline
              preload="metadata"
            />
          ) : selectedClip ? (
            selectedClip.type === "video" ? (
              <video
                key={selectedClip.sourceUrl}
                src={selectedClip.sourceUrl}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                muted
                loop
                autoPlay
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedClip.sourceUrl}
                alt="Preview"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
            )
          ) : (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-white/40">
              <Eye size={40} className="mb-2" />
              <p className="text-xs">Upload clip & render untuk preview final</p>
            </div>
          )}

          {/* Center/edge guidelines (during drag) */}
          {dragMode.startsWith("move") && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-pink-500/40" />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-pink-500/40" />
            </>
          )}

          {/* Text overlay layer — hide in Final mode (already burned into video) */}
          {!showRenderedVideo && selectedClip?.textOverlay && (
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectLayer({ kind: "text", clipId: selectedClip.id });
                setDragMode("move-text");
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: `${textX}%`,
                top: `${textY}%`,
                transform: `translate(-50%, -50%) rotate(${selectedClip.textRotation ?? 0}deg)`,
                color: textColor,
                fontSize: `${canvasFontSize}px`,
                fontWeight: 900,
                textShadow: "0 0 12px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.9)",
                fontFamily: "system-ui, -apple-system, sans-serif",
                cursor: "move",
                userSelect: "none",
                whiteSpace: "pre-wrap",
                maxWidth: "90%",
                textAlign: "center",
                lineHeight: 1.15,
                padding: "4px 8px",
                outline: isTextSelected ? "2px dashed #ec4899" : "none",
                outlineOffset: "2px",
                touchAction: "none",
              }}
            >
              {selectedClip.textOverlay}
            </div>
          )}

          {/* Custom PNG overlay layer — hide in Final mode */}
          {!showRenderedVideo && overlayUrl && canvasSize.w > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: overlayPos.x * canvasSize.w - overlayDisplayW / 2,
                top: overlayPos.y * canvasSize.h - overlayDisplayH / 2,
                width: overlayDisplayW,
                height: overlayDisplayH,
                transform: `rotate(${overlayPos.rotation}deg)`,
                opacity: overlayPos.opacity,
                touchAction: "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={overlayUrl}
                alt="Overlay"
                draggable={false}
                className="pointer-events-none h-full w-full select-none"
              />
              <div
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectLayer({ kind: "overlay" });
                  setDragMode("move-overlay");
                }}
                className={`absolute inset-0 cursor-move ${isOverlaySelected ? "border-2 border-dashed border-pink-500" : "border-2 border-transparent hover:border-pink-300/60"}`}
              />
              {isOverlaySelected && (
                <>
                  {/* Resize handle */}
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setDragMode("resize-overlay");
                    }}
                    className="absolute -bottom-2 -right-2 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-full bg-pink-600 text-white shadow-md hover:bg-pink-700"
                    title="Resize"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 1M5 9H9V5" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </div>
                  {/* Rotate handle */}
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setDragMode("rotate-overlay");
                    }}
                    style={{ top: "-28px", left: "50%", transform: "translateX(-50%)" }}
                    className="absolute flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700"
                    title="Rotate"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 5a4 4 0 108-1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M9 1L9 5L5 5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
                  </div>
                  <div style={{ top: "-22px", left: "50%", transform: "translateX(-50%)" }} className="pointer-events-none absolute h-5 w-px bg-blue-600" />
                </>
              )}
            </div>
          )}

          {/* Subtitle layer — hide in Final mode */}
          {!showRenderedVideo && subtitlePos.show && (
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectLayer({ kind: "subtitle" });
                setDragMode("move-subtitle");
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                left: "50%",
                top: `${subtitlePos.y * 100}%`,
                transform: "translate(-50%, -50%)",
                color: "white",
                fontSize: canvasSize.w > 0 ? `${(subtitlePos.fontSize / 1080) * canvasSize.w}px` : "16px",
                fontWeight: 800,
                textShadow: "0 0 8px rgba(0,0,0,0.95), 0 2px 4px rgba(0,0,0,0.9)",
                fontFamily: "system-ui, sans-serif",
                cursor: "move",
                userSelect: "none",
                whiteSpace: "pre-wrap",
                maxWidth: "85%",
                textAlign: "center",
                lineHeight: 1.2,
                padding: "4px 10px",
                backgroundColor: "rgba(0,0,0,0.3)",
                borderRadius: "4px",
                outline: isSubtitleSelected ? "2px dashed #10b981" : "none",
                outlineOffset: "2px",
                touchAction: "none",
              }}
            >
              {subtitlePreview || "Contoh subtitle akan muncul di sini"}
            </div>
          )}

          {/* Empty state hint */}
          {!overlayUrl && selectedClip && !overlayImgError && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-lg bg-black/70 px-3 py-2 text-center text-xs text-white">
              💡 Upload overlay PNG di tombol bawah-kanan untuk mulai editing
            </div>
          )}

          {/* Overlay load error banner */}
          {overlayImgError && (
            <div className="absolute inset-x-4 bottom-4 flex items-start gap-2 rounded-lg bg-red-600/95 px-3 py-2 text-xs text-white shadow-lg">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Overlay gagal load</p>
                <p className="mt-0.5 text-white/80">{overlayImgError}</p>
                <p className="mt-0.5 break-all text-white/70 text-[10px]">URL: {overlayUrl}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom layers legend */}
      <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-[11px]">
        <LayerChip
          icon={Type}
          label="Text"
          color="pink"
          active={!!selectedClip?.textOverlay}
          selected={isTextSelected}
          onClick={() => selectedClip && onSelectLayer({ kind: "text", clipId: selectedClip.id })}
        />
        <LayerChip
          icon={ImageIcon}
          label="Overlay PNG"
          color="purple"
          active={!!overlayUrl}
          selected={isOverlaySelected}
          onClick={() => overlayUrl && onSelectLayer({ kind: "overlay" })}
        />
        <LayerChip
          icon={Subtitles}
          label="Subtitle"
          color="emerald"
          active={subtitlePos.show}
          selected={isSubtitleSelected}
          onClick={() => onSelectLayer({ kind: "subtitle" })}
        />
        <div className="ml-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            onChange={(e) => onFileSelected(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingOverlay}
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-600 bg-white px-3 py-1 text-[11px] font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-50"
          >
            <Upload size={11} />
            {uploadingOverlay ? "Uploading..." : overlayUrl ? "Ganti PNG" : "Upload PNG Overlay"}
          </button>
          {overlayUrl && (
            <button
              onClick={onRemoveOverlay}
              className="ml-1 inline-flex items-center rounded-full border border-border bg-white p-1 text-red-600 hover:bg-red-50"
              title="Hapus overlay"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LayerChip({
  icon: Icon,
  label,
  color,
  active,
  selected,
  onClick,
}: {
  icon: typeof Type;
  label: string;
  color: "pink" | "purple" | "emerald";
  active: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  const colorMap = {
    pink: selected ? "border-pink-600 bg-pink-50 text-pink-700" : active ? "border-pink-300 text-pink-600" : "border-border text-txt-muted",
    purple: selected ? "border-purple-600 bg-purple-50 text-purple-700" : active ? "border-purple-300 text-purple-600" : "border-border text-txt-muted",
    emerald: selected ? "border-emerald-600 bg-emerald-50 text-emerald-700" : active ? "border-emerald-300 text-emerald-600" : "border-border text-txt-muted",
  };
  return (
    <button
      onClick={onClick}
      disabled={!active}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium transition-colors ${colorMap[color]} ${active ? "cursor-pointer hover:bg-opacity-80" : "cursor-not-allowed opacity-40"}`}
    >
      <Icon size={10} />
      {label}
      {!active && <Lock size={9} className="ml-0.5" />}
    </button>
  );
}
