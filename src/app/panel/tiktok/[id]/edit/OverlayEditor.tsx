"use client";

/**
 * OverlayEditor — video editor-like canvas untuk drag/resize/rotate overlay PNG
 * di atas preview 9:16 (TikTok aspect ratio).
 *
 * Props:
 * - firstClipUrl: URL clip pertama sebagai background preview
 * - overlayUrl: PNG dengan transparency yang di-overlay
 * - position: { x, y, scale, rotation, opacity } normalisasi 0-1
 * - onChange: callback saat user drag/resize/rotate
 * - onUploadOverlay: trigger upload dialog
 * - onRemoveOverlay: hapus overlay
 */

import { useEffect, useRef, useState, useCallback, MouseEvent, TouchEvent } from "react";
import { Upload, Trash2, Move, RotateCw, Maximize2, Eye } from "lucide-react";

export interface OverlayPosition {
  x: number;          // 0-1 (center)
  y: number;          // 0-1 (center)
  scale: number;      // 0.1-3.0
  rotation: number;   // -180 to 180
  opacity: number;    // 0-1
}

interface Props {
  firstClipUrl: string | null;
  firstClipType?: "video" | "image";
  overlayUrl: string | null;
  position: OverlayPosition;
  onChange: (pos: OverlayPosition) => void;
  onUploadOverlay: (file: File) => Promise<void>;
  onRemoveOverlay: () => void;
  uploading?: boolean;
}

type DragMode = "none" | "move" | "resize" | "rotate";

export default function OverlayEditor({
  firstClipUrl,
  firstClipType = "video",
  overlayUrl,
  position,
  onChange,
  onUploadOverlay,
  onRemoveOverlay,
  uploading = false,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>("none");
  const [imgSize, setImgSize] = useState({ w: 200, h: 200 });
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  // Track canvas size for coordinate conversion
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

  // Load overlay natural dimensions for scale calculations
  useEffect(() => {
    if (!overlayUrl) return;
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = overlayUrl;
  }, [overlayUrl]);

  /** Convert canvas pixel position → normalized 0-1 */
  const pxToNorm = useCallback((px: number, py: number) => {
    if (canvasSize.w === 0 || canvasSize.h === 0) return { x: 0.5, y: 0.5 };
    return {
      x: Math.max(0, Math.min(1, px / canvasSize.w)),
      y: Math.max(0, Math.min(1, py / canvasSize.h)),
    };
  }, [canvasSize]);

  /** Get mouse/touch position relative to canvas */
  const getCanvasPos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  // Dragging overlay (move)
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (dragMode === "none" || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (dragMode === "move") {
      const norm = pxToNorm(px, py);
      onChange({ ...position, x: norm.x, y: norm.y });
    } else if (dragMode === "resize") {
      // Distance from center = scale indicator
      const cx = position.x * canvasSize.w;
      const cy = position.y * canvasSize.h;
      const dist = Math.hypot(px - cx, py - cy);
      // Base overlay width at scale=1 is 30% of canvas width
      const baseRadius = (0.3 * canvasSize.w) / 2;
      const newScale = Math.max(0.1, Math.min(3, dist / baseRadius));
      onChange({ ...position, scale: newScale });
    } else if (dragMode === "rotate") {
      const cx = position.x * canvasSize.w;
      const cy = position.y * canvasSize.h;
      const angle = (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
      // Rotate handle is at top (angle=-90), so add 90 to normalize
      onChange({ ...position, rotation: Math.round(angle + 90) });
    }
  }, [dragMode, position, canvasSize, pxToNorm, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragMode("none");
  }, []);

  useEffect(() => {
    if (dragMode === "none") return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragMode, handlePointerMove, handlePointerUp]);

  const onFileSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      alert("Harap upload file PNG/JPG");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Maksimal 2MB");
      return;
    }
    await onUploadOverlay(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Compute displayed overlay dimensions (30% canvas width at scale=1)
  const displayWidth = 0.3 * canvasSize.w * position.scale;
  const aspectRatio = imgSize.h / imgSize.w;
  const displayHeight = displayWidth * aspectRatio;

  const overlayLeft = position.x * canvasSize.w - displayWidth / 2;
  const overlayTop = position.y * canvasSize.h - displayHeight / 2;

  return (
    <div className="space-y-3">
      {/* Canvas preview */}
      <div
        ref={canvasRef}
        className="relative mx-auto overflow-hidden rounded-xl border-2 border-border bg-black"
        style={{ aspectRatio: "9 / 16", maxWidth: "320px", width: "100%" }}
      >
        {/* Background: first clip */}
        {firstClipUrl ? (
          firstClipType === "video" ? (
            <video
              src={firstClipUrl}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={firstClipUrl}
              alt="Preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-xs text-white/50">
            <Eye size={24} className="mb-1" />
            Upload clip dulu untuk preview
          </div>
        )}

        {/* Center lines (show on hover/drag) */}
        {dragMode === "move" && (
          <>
            <div className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-px bg-pink-500/50" />
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px bg-pink-500/50" />
          </>
        )}

        {/* Overlay image with drag handles */}
        {overlayUrl && canvasSize.w > 0 && (
          <div
            style={{
              position: "absolute",
              left: overlayLeft,
              top: overlayTop,
              width: displayWidth,
              height: displayHeight,
              transform: `rotate(${position.rotation}deg)`,
              opacity: position.opacity,
              touchAction: "none",
            }}
          >
            {/* Image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={overlayUrl}
              alt="Overlay"
              draggable={false}
              className="pointer-events-none h-full w-full select-none"
            />

            {/* Move handle (full area) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                setDragMode("move");
              }}
              className="absolute inset-0 cursor-move border-2 border-dashed border-pink-500 hover:border-pink-400"
              title="Drag untuk pindah"
            />

            {/* Resize handle (bottom-right) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                setDragMode("resize");
              }}
              className="absolute -bottom-2 -right-2 flex h-5 w-5 cursor-se-resize items-center justify-center rounded-full bg-pink-600 text-white shadow-md hover:bg-pink-700"
              title="Drag untuk ubah ukuran"
            >
              <Maximize2 size={10} />
            </div>

            {/* Rotate handle (top-center, outside frame) */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                setDragMode("rotate");
              }}
              style={{ top: "-28px", left: "50%", transform: "translateX(-50%)" }}
              className="absolute flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700"
              title="Drag untuk putar"
            >
              <RotateCw size={10} />
            </div>

            {/* Connecting line from top to rotate handle */}
            <div
              style={{ top: "-22px", left: "50%", transform: "translateX(-50%)" }}
              className="pointer-events-none absolute h-5 w-px bg-blue-600"
            />
          </div>
        )}

        {/* Empty state hint */}
        {!overlayUrl && firstClipUrl && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-lg bg-black/70 px-3 py-2 text-center text-xs text-white">
            Upload overlay PNG untuk mulai editing
          </div>
        )}
      </div>

      {/* Upload + Remove */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          onChange={(e) => onFileSelected(e.target.files)}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-pink-600 bg-white px-3 py-2 text-xs font-semibold text-pink-600 hover:bg-pink-50 disabled:opacity-50"
        >
          <Upload size={14} />
          {uploading ? "Uploading..." : overlayUrl ? "Ganti Overlay" : "Upload Overlay (PNG)"}
        </button>
        {overlayUrl && (
          <button
            onClick={onRemoveOverlay}
            className="flex items-center justify-center rounded-lg border border-border bg-white px-3 py-2 text-xs text-red-600 hover:bg-red-50"
            title="Hapus overlay"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Manual sliders (optional fine-tune) */}
      {overlayUrl && (
        <div className="space-y-2 rounded-lg border border-border bg-surface-secondary p-3">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-medium text-txt-secondary flex items-center gap-1">
                <Maximize2 size={10} /> Ukuran
              </label>
              <span className="text-[11px] font-semibold text-txt-primary">
                {Math.round(position.scale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.05}
              value={position.scale}
              onChange={(e) => onChange({ ...position, scale: parseFloat(e.target.value) })}
              className="w-full accent-pink-600"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-medium text-txt-secondary flex items-center gap-1">
                <RotateCw size={10} /> Rotasi
              </label>
              <span className="text-[11px] font-semibold text-txt-primary">
                {position.rotation}°
              </span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={position.rotation}
              onChange={(e) => onChange({ ...position, rotation: parseInt(e.target.value) })}
              className="w-full accent-pink-600"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[11px] font-medium text-txt-secondary flex items-center gap-1">
                <Eye size={10} /> Opacity
              </label>
              <span className="text-[11px] font-semibold text-txt-primary">
                {Math.round(position.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={position.opacity}
              onChange={(e) => onChange({ ...position, opacity: parseFloat(e.target.value) })}
              className="w-full accent-pink-600"
            />
          </div>

          <p className="border-t border-border pt-2 text-[10px] text-txt-muted leading-relaxed">
            💡 <strong>Tips:</strong> Drag kotak pink untuk pindah posisi. Handle pink kanan-bawah untuk ubah ukuran. Handle biru atas untuk putar.
          </p>
        </div>
      )}
    </div>
  );
}
