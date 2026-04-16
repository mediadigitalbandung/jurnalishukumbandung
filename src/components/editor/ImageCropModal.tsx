"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Crop, Move, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCropModalProps {
  src: string;
  currentStyle?: string;
  onSave: (style: string) => void;
  onClose: () => void;
}

const RATIOS = [
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "1:1", value: 1 },
  { label: "3:4", value: 3 / 4 },
  { label: "Bebas", value: 0 },
];

export default function ImageCropModal({ src, currentStyle, onSave, onClose }: ImageCropModalProps) {
  const [ratio, setRatio] = useState(16 / 9);
  const [frameHeight, setFrameHeight] = useState(300);
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0, posX: 50, posY: 50 });

  // Parse existing style
  useEffect(() => {
    if (!currentStyle) return;
    const posMatch = currentStyle.match(/object-position:\s*([\d.]+)%\s*([\d.]+)%/);
    if (posMatch) {
      setPosX(parseFloat(posMatch[1]));
      setPosY(parseFloat(posMatch[2]));
    }
    const heightMatch = currentStyle.match(/height:\s*([\d.]+)px/);
    if (heightMatch) setFrameHeight(parseInt(heightMatch[1]));
  }, [currentStyle]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startRef.current = { x: e.clientX, y: e.clientY, posX, posY };
  }, [posX, posY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - startRef.current.x) / rect.width) * -100;
    const deltaY = ((e.clientY - startRef.current.y) / rect.height) * -100;
    setPosX(Math.max(0, Math.min(100, startRef.current.posX + deltaX)));
    setPosY(Math.max(0, Math.min(100, startRef.current.posY + deltaY)));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    startRef.current = { x: touch.clientX, y: touch.clientY, posX, posY };
  }, [posX, posY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !frameRef.current) return;
    const touch = e.touches[0];
    const rect = frameRef.current.getBoundingClientRect();
    const deltaX = ((touch.clientX - startRef.current.x) / rect.width) * -100;
    const deltaY = ((touch.clientY - startRef.current.y) / rect.height) * -100;
    setPosX(Math.max(0, Math.min(100, startRef.current.posX + deltaX)));
    setPosY(Math.max(0, Math.min(100, startRef.current.posY + deltaY)));
  }, [isDragging]);

  const frameWidth = ratio > 0 ? frameHeight * ratio : "100%";

  const save = () => {
    const style = `width: 100%; height: ${frameHeight}px; object-fit: cover; object-position: ${posX.toFixed(1)}% ${posY.toFixed(1)}%`;
    onSave(style);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchEnd={() => setIsDragging(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Crop size={18} className="text-goto-green" />
            <h3 className="text-lg font-bold text-txt-primary">Crop & Posisi Gambar</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-txt-secondary hover:bg-surface-secondary">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Aspect Ratio buttons */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-txt-primary">Rasio Frame</label>
            <div className="flex gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRatio(r.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    (ratio === r.value) ? "bg-goto-green text-white" : "bg-surface-secondary text-txt-secondary hover:bg-surface-tertiary"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Height slider */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-txt-primary">
              Tinggi Frame: {frameHeight}px
            </label>
            <input
              type="range"
              min={150}
              max={600}
              value={frameHeight}
              onChange={(e) => setFrameHeight(parseInt(e.target.value))}
              className="w-full accent-goto-green"
            />
          </div>

          {/* Preview frame — draggable */}
          <div className="mb-3 flex justify-center">
            <div
              ref={frameRef}
              className={cn(
                "relative overflow-hidden rounded-[12px] border-2 border-dashed",
                isDragging ? "border-goto-green cursor-grabbing" : "border-border cursor-grab"
              )}
              style={{
                width: typeof frameWidth === "number" ? `${Math.min(frameWidth, 580)}px` : frameWidth,
                height: `${frameHeight}px`,
                maxWidth: "100%",
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              <img
                src={src}
                alt="Crop preview"
                draggable={false}
                className="h-full w-full select-none"
                style={{
                  objectFit: "cover",
                  objectPosition: `${posX}% ${posY}%`,
                }}
              />
              {/* Drag indicator */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/10">
                <div className="rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity hover:opacity-100">
                  <Move size={14} className="mr-1 inline" /> Geser gambar
                </div>
              </div>
              {/* Position indicator */}
              <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                {posX.toFixed(0)}%, {posY.toFixed(0)}%
              </div>
            </div>
          </div>
          <p className="mb-4 text-center text-xs text-txt-muted">
            Klik dan geser gambar untuk memilih bagian yang ditampilkan
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary"
          >
            Batal
          </button>
          <button
            onClick={save}
            className="inline-flex items-center gap-1.5 rounded-full bg-goto-green px-5 py-2 text-sm font-medium text-white hover:bg-goto-green-dark"
          >
            <Check size={14} /> Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}
