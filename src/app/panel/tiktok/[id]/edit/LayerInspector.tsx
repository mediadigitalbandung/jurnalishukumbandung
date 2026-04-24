"use client";

/**
 * LayerInspector — sidebar kanan berisi property editor untuk layer yang dipilih.
 * Menunjukkan:
 *  - "none": info general video (frameStyle picker, render actions)
 *  - "text": edit text content, color, font size, rotation (with sliders)
 *  - "overlay": overlay transform sliders (scale, rotation, opacity)
 *  - "subtitle": subtitle display toggle, Y position, font size
 */

import { Type, Image as ImageIcon, Subtitles, Palette, Maximize2, RotateCw, Eye, Trash2 } from "lucide-react";
import type { SelectedLayer, OverlayPos, SubtitlePos, ClipData } from "./VideoCanvas";

interface Props {
  selected: SelectedLayer;
  selectedClip: ClipData | null;

  // Text overlay props
  onTextChange: (clipId: string, patch: Partial<Pick<ClipData, "textOverlay" | "textColor" | "textFontSize" | "textRotation">>) => void;

  // Overlay PNG props
  overlayPos: OverlayPos;
  onOverlayChange: (pos: OverlayPos) => void;

  // Subtitle props
  subtitlePos: SubtitlePos;
  subtitlePreview: string;
  onSubtitleChange: (patch: Partial<SubtitlePos>) => void;
  onSubtitlePreviewChange: (text: string) => void;
  onAutoSubtitle?: () => Promise<void>;
  autoSubtitleLoading?: boolean;
  autoSubtitleAvailable?: boolean;
}

export default function LayerInspector({
  selected,
  selectedClip,
  onTextChange,
  overlayPos,
  onOverlayChange,
  subtitlePos,
  subtitlePreview,
  onSubtitleChange,
  onSubtitlePreviewChange,
  onAutoSubtitle,
  autoSubtitleLoading = false,
  autoSubtitleAvailable = false,
}: Props) {
  if (selected.kind === "none") {
    return (
      <div className="rounded-[12px] border border-border bg-surface p-4 shadow-card">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-txt-muted">
          Layer Inspector
        </h3>
        <p className="text-xs text-txt-secondary leading-relaxed">
          Klik salah satu <strong>layer</strong> di preview (text, overlay PNG, atau subtitle) untuk edit propertinya di sini.
        </p>
        <div className="mt-3 space-y-2 rounded-lg bg-surface-secondary p-3 text-xs text-txt-secondary">
          <p className="flex items-center gap-2"><Type size={12} className="text-pink-500" /> <strong>Text</strong> — drag di preview untuk pindah, edit teks & color di panel ini</p>
          <p className="flex items-center gap-2"><ImageIcon size={12} className="text-purple-500" /> <strong>Overlay PNG</strong> — drag, resize (pojok pink), rotate (biru atas)</p>
          <p className="flex items-center gap-2"><Subtitles size={12} className="text-emerald-500" /> <strong>Subtitle</strong> — drag untuk atur posisi vertikal</p>
        </div>
      </div>
    );
  }

  if (selected.kind === "text" && selectedClip) {
    return (
      <div className="rounded-[12px] border-2 border-pink-500 bg-surface p-4 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-pink-600">
          <Type size={14} /> Text Overlay
        </h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-txt-secondary">Teks</label>
            <textarea
              value={selectedClip.textOverlay || ""}
              onChange={(e) => onTextChange(selectedClip.id, { textOverlay: e.target.value })}
              placeholder="Ketik teks overlay..."
              rows={3}
              maxLength={240}
              className="input w-full resize-none text-sm"
            />
            <p className="mt-0.5 text-[10px] text-txt-muted text-right">{(selectedClip.textOverlay || "").length}/240</p>
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between text-xs font-semibold text-txt-secondary">
              <span className="flex items-center gap-1"><Palette size={10} /> Warna</span>
              <span className="font-mono text-[10px] text-txt-muted">{selectedClip.textColor || "#FFFFFF"}</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedClip.textColor || "#FFFFFF"}
                onChange={(e) => onTextChange(selectedClip.id, { textColor: e.target.value })}
                className="h-8 w-12 cursor-pointer rounded border border-border"
              />
              <div className="flex flex-wrap gap-1">
                {["#FFFFFF", "#FFEB3B", "#FF5722", "#E91E63", "#00AA13", "#2196F3", "#000000"].map((c) => (
                  <button
                    key={c}
                    onClick={() => onTextChange(selectedClip.id, { textColor: c })}
                    className="h-6 w-6 rounded-full border-2 hover:scale-110"
                    style={{ backgroundColor: c, borderColor: selectedClip.textColor === c ? "#ec4899" : "#e5e7eb" }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          <RangeSlider
            icon={Maximize2}
            label="Ukuran Font"
            value={selectedClip.textFontSize ?? 54}
            min={16}
            max={160}
            step={2}
            unit="px"
            onChange={(v) => onTextChange(selectedClip.id, { textFontSize: v })}
          />

          <RangeSlider
            icon={RotateCw}
            label="Rotasi"
            value={selectedClip.textRotation ?? 0}
            min={-180}
            max={180}
            step={1}
            unit="°"
            onChange={(v) => onTextChange(selectedClip.id, { textRotation: v })}
          />

          <div className="border-t border-border pt-2 text-[10px] text-txt-muted">
            💡 Drag di preview untuk pindah posisi.
          </div>
        </div>
      </div>
    );
  }

  if (selected.kind === "overlay") {
    return (
      <div className="rounded-[12px] border-2 border-purple-500 bg-surface p-4 shadow-card">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-purple-600">
          <ImageIcon size={14} /> Custom PNG Overlay
        </h3>

        <div className="space-y-3">
          <RangeSlider
            icon={Maximize2}
            label="Ukuran"
            value={Math.round(overlayPos.scale * 100)}
            min={10}
            max={300}
            step={5}
            unit="%"
            onChange={(v) => onOverlayChange({ ...overlayPos, scale: v / 100 })}
          />
          <RangeSlider
            icon={RotateCw}
            label="Rotasi"
            value={overlayPos.rotation}
            min={-180}
            max={180}
            step={1}
            unit="°"
            onChange={(v) => onOverlayChange({ ...overlayPos, rotation: v })}
          />
          <RangeSlider
            icon={Eye}
            label="Opacity"
            value={Math.round(overlayPos.opacity * 100)}
            min={10}
            max={100}
            step={5}
            unit="%"
            onChange={(v) => onOverlayChange({ ...overlayPos, opacity: v / 100 })}
          />
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-2 text-[10px]">
            <div className="rounded bg-surface-secondary px-2 py-1 font-mono text-txt-secondary">
              X: {Math.round(overlayPos.x * 100)}%
            </div>
            <div className="rounded bg-surface-secondary px-2 py-1 font-mono text-txt-secondary">
              Y: {Math.round(overlayPos.y * 100)}%
            </div>
          </div>
          <p className="text-[10px] text-txt-muted">
            💡 Drag overlay untuk pindah. Handle pink kanan-bawah = resize. Handle biru atas = rotate.
          </p>
        </div>
      </div>
    );
  }

  if (selected.kind === "subtitle") {
    return (
      <div className="rounded-[12px] border-2 border-emerald-500 bg-surface p-4 shadow-card">
        <h3 className="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wider text-emerald-600">
          <span className="flex items-center gap-2">
            <Subtitles size={14} /> Subtitle
          </span>
          <label className="flex cursor-pointer items-center gap-1 text-[10px] font-medium normal-case text-txt-secondary">
            <input
              type="checkbox"
              checked={subtitlePos.show}
              onChange={(e) => onSubtitleChange({ show: e.target.checked })}
              className="accent-emerald-500"
            />
            Aktif
          </label>
        </h3>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-txt-secondary">
              Preview Teks (contoh)
            </label>
            <input
              type="text"
              value={subtitlePreview}
              onChange={(e) => onSubtitlePreviewChange(e.target.value)}
              placeholder="Sample subtitle untuk preview..."
              maxLength={120}
              className="input w-full text-sm"
            />
            <p className="mt-0.5 text-[10px] text-txt-muted">
              Saat render, subtitle akan di-generate otomatis dari audio (Whisper).
            </p>
          </div>

          <RangeSlider
            icon={Eye}
            label="Posisi Vertikal"
            value={Math.round(subtitlePos.y * 100)}
            min={5}
            max={95}
            step={1}
            unit="%"
            onChange={(v) => onSubtitleChange({ y: v / 100 })}
          />

          <RangeSlider
            icon={Maximize2}
            label="Ukuran Font"
            value={subtitlePos.fontSize}
            min={24}
            max={96}
            step={2}
            unit="px"
            onChange={(v) => onSubtitleChange({ fontSize: v })}
          />

          {onAutoSubtitle && autoSubtitleAvailable && (
            <button
              onClick={onAutoSubtitle}
              disabled={autoSubtitleLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {autoSubtitleLoading ? "Generating..." : "✨ Auto-Generate via Whisper"}
            </button>
          )}

          <p className="text-[10px] text-txt-muted">
            💡 Drag subtitle di preview untuk atur posisi vertikal.
          </p>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function RangeSlider({
  icon: Icon,
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  icon: typeof Type;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="flex items-center gap-1 text-xs font-medium text-txt-secondary">
          <Icon size={10} /> {label}
        </label>
        <span className="text-[11px] font-semibold text-txt-primary">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-pink-600"
      />
    </div>
  );
}
