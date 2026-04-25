"use client";

/**
 * TimelinePanel — DaVinci/CapCut-style timeline view di bawah video editor.
 *
 * Tracks (top to bottom):
 *   - V1: Background clips (sequential blocks per clip)
 *   - V2: Text overlay (per-clip blocks dengan label)
 *   - V3: PNG overlay (1 block spanning seluruh durasi)
 *   - V4: Subtitle (per-segment blocks)
 *
 * Click block → select clip atau layer.
 */

import { useMemo } from "react";
import { Eye, EyeOff, Lock, Unlock, Type, Image as ImageIcon, Subtitles, Video, ChevronUp, ChevronDown } from "lucide-react";

interface Clip {
  id: string;
  order: number;
  type: "video" | "image";
  durationSec: number;
  textOverlay: string | null;
  sourceUrl: string;
}

interface SubtitleSeg {
  start: number;
  end: number;
  text: string;
}

export type TimelineLayer = "background" | "text" | "overlay" | "subtitle";

interface Props {
  clips: Clip[];
  selectedClipId: string | null;
  onSelectClip: (id: string) => void;
  onMoveClip: (id: string, direction: -1 | 1) => void;
  // Overlay PNG
  hasOverlay: boolean;
  // Subtitle (current selected clip subtitles only — for visualization)
  subtitleSegments: SubtitleSeg[];
  // Layer visibility & lock state (for visual feedback only — backend rendering still uses presence of data)
  layerVisibility: Record<TimelineLayer, boolean>;
  layerLock: Record<TimelineLayer, boolean>;
  onToggleVisibility: (layer: TimelineLayer) => void;
  onToggleLock: (layer: TimelineLayer) => void;
  // Currently selected layer (highlight in timeline)
  selectedLayer?: TimelineLayer | "none";
  onSelectLayer: (layer: TimelineLayer) => void;
}

const TRACK_LABELS: Record<TimelineLayer, { name: string; icon: typeof Type; color: string }> = {
  background: { name: "Background", icon: Video, color: "bg-blue-500" },
  text: { name: "Text Overlay", icon: Type, color: "bg-pink-500" },
  overlay: { name: "Overlay PNG", icon: ImageIcon, color: "bg-purple-500" },
  subtitle: { name: "Subtitle", icon: Subtitles, color: "bg-emerald-500" },
};

export default function TimelinePanel({
  clips,
  selectedClipId,
  onSelectClip,
  onMoveClip,
  hasOverlay,
  subtitleSegments,
  layerVisibility,
  layerLock,
  onToggleVisibility,
  onToggleLock,
  selectedLayer = "none",
  onSelectLayer,
}: Props) {
  const totalDuration = useMemo(
    () => clips.reduce((sum, c) => sum + c.durationSec, 0) || 0,
    [clips]
  );

  if (clips.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-border bg-surface-secondary/40 p-6 text-center">
        <p className="text-sm text-txt-muted">📹 Belum ada clip. Upload video/foto untuk mulai timeline.</p>
      </div>
    );
  }

  // Compute cumulative offsets for clips (for V2 text track positioning)
  const clipOffsets: Array<{ id: string; start: number; end: number }> = [];
  let cursor = 0;
  for (const c of clips) {
    clipOffsets.push({ id: c.id, start: cursor, end: cursor + c.durationSec });
    cursor += c.durationSec;
  }

  // Generate time ruler ticks (every 1s, label every 5s)
  const ticks: number[] = [];
  for (let t = 0; t <= Math.ceil(totalDuration); t++) ticks.push(t);

  return (
    <div className="rounded-[12px] border border-border bg-surface shadow-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-txt-muted">
          <Video size={12} /> Timeline · {totalDuration.toFixed(1)}s · {clips.length} clip
        </h3>
        <span className="text-[10px] text-txt-muted">Click block untuk select</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]" style={{ width: `${Math.max(600, totalDuration * 60)}px` }}>
          {/* Time ruler */}
          <div className="flex h-6 items-end border-b border-border bg-surface-secondary/30 pl-32 pr-2">
            {ticks.map((t) => (
              <div
                key={t}
                className="flex flex-col items-start"
                style={{ width: `${(1 / totalDuration) * 100}%`, minWidth: 0 }}
              >
                <span className={`text-[9px] text-txt-muted ${t % 5 === 0 ? "font-semibold" : "opacity-60"}`}>
                  {t}s
                </span>
                <div className={`h-1.5 w-px ${t % 5 === 0 ? "bg-txt-muted" : "bg-border"}`} />
              </div>
            ))}
          </div>

          {/* Tracks */}
          {(["background", "text", "overlay", "subtitle"] as TimelineLayer[]).map((layerKey) => {
            const cfg = TRACK_LABELS[layerKey];
            const Icon = cfg.icon;
            const visible = layerVisibility[layerKey];
            const locked = layerLock[layerKey];
            const isSelected = selectedLayer === layerKey;

            return (
              <div
                key={layerKey}
                className={`flex border-b border-border transition-colors ${isSelected ? "bg-pink-50/50" : ""}`}
              >
                {/* Track label column (sticky left) */}
                <div className="sticky left-0 z-10 flex w-32 shrink-0 items-center justify-between gap-1 border-r border-border bg-surface px-2 py-1.5">
                  <button
                    onClick={() => onSelectLayer(layerKey)}
                    className={`flex items-center gap-1 text-[11px] font-medium ${isSelected ? "text-pink-600" : "text-txt-primary"}`}
                  >
                    <Icon size={11} />
                    <span className="truncate">{cfg.name}</span>
                  </button>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => onToggleVisibility(layerKey)}
                      className="rounded p-0.5 text-txt-muted hover:bg-surface-secondary"
                      title={visible ? "Sembunyikan" : "Tampilkan"}
                    >
                      {visible ? <Eye size={11} /> : <EyeOff size={11} className="text-red-400" />}
                    </button>
                    <button
                      onClick={() => onToggleLock(layerKey)}
                      className="rounded p-0.5 text-txt-muted hover:bg-surface-secondary"
                      title={locked ? "Unlock" : "Lock"}
                    >
                      {locked ? <Lock size={11} className="text-yellow-500" /> : <Unlock size={11} />}
                    </button>
                  </div>
                </div>

                {/* Track content (blocks) */}
                <div className="relative flex-1 px-2 py-1.5" style={{ minHeight: "32px" }}>
                  {layerKey === "background" && (
                    <div className="flex h-7 items-stretch gap-px">
                      {clips.map((c, idx) => {
                        const widthPct = (c.durationSec / totalDuration) * 100;
                        const isClipSelected = c.id === selectedClipId;
                        return (
                          <div
                            key={c.id}
                            onClick={() => onSelectClip(c.id)}
                            className={`group relative flex cursor-pointer items-center justify-center rounded text-[10px] font-medium text-white transition-all ${
                              isClipSelected
                                ? "ring-2 ring-pink-600 ring-offset-1 z-10 scale-y-105"
                                : "opacity-80 hover:opacity-100"
                            } ${cfg.color}`}
                            style={{ width: `${widthPct}%`, minWidth: "30px" }}
                            title={`Clip #${idx + 1} · ${c.type} · ${c.durationSec.toFixed(1)}s`}
                          >
                            <span className="truncate px-1">#{idx + 1}</span>
                            {visible && (
                              <span className="absolute -top-2.5 left-1 hidden whitespace-nowrap text-[9px] text-txt-muted group-hover:block">
                                {c.durationSec.toFixed(1)}s
                              </span>
                            )}
                            {/* Reorder controls */}
                            {isClipSelected && (
                              <div className="absolute -bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded bg-surface px-1 py-0.5 shadow-lg">
                                <button
                                  onClick={(e) => { e.stopPropagation(); onMoveClip(c.id, -1); }}
                                  disabled={idx === 0}
                                  className="rounded p-0.5 text-txt-secondary hover:bg-surface-secondary disabled:opacity-30"
                                  title="Pindah kiri"
                                >
                                  <ChevronUp size={10} className="-rotate-90" />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); onMoveClip(c.id, 1); }}
                                  disabled={idx === clips.length - 1}
                                  className="rounded p-0.5 text-txt-secondary hover:bg-surface-secondary disabled:opacity-30"
                                  title="Pindah kanan"
                                >
                                  <ChevronDown size={10} className="-rotate-90" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {layerKey === "text" && (
                    <div className="relative h-7">
                      {clipOffsets.map((co, idx) => {
                        const clip = clips[idx];
                        if (!clip.textOverlay) return null;
                        const left = (co.start / totalDuration) * 100;
                        const width = (clip.durationSec / totalDuration) * 100;
                        return (
                          <div
                            key={co.id}
                            onClick={() => onSelectClip(co.id)}
                            className={`absolute top-0 flex h-full cursor-pointer items-center overflow-hidden rounded text-[10px] font-medium text-white transition-all ${cfg.color} ${
                              co.id === selectedClipId ? "ring-2 ring-white" : "opacity-80 hover:opacity-100"
                            }`}
                            style={{ left: `${left}%`, width: `${width}%`, minWidth: "30px" }}
                            title={clip.textOverlay}
                          >
                            <span className="truncate px-1">&ldquo;{clip.textOverlay.slice(0, 18)}&rdquo;</span>
                          </div>
                        );
                      })}
                      {clips.every((c) => !c.textOverlay) && (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-txt-muted">
                          Belum ada text overlay
                        </div>
                      )}
                    </div>
                  )}

                  {layerKey === "overlay" && (
                    <div className="relative h-7">
                      {hasOverlay ? (
                        <div
                          onClick={() => onSelectLayer("overlay")}
                          className={`absolute inset-y-0 flex w-full cursor-pointer items-center justify-center rounded text-[10px] font-medium text-white ${cfg.color} ${isSelected ? "ring-2 ring-white" : "opacity-80 hover:opacity-100"}`}
                          title="Custom PNG overlay (full duration)"
                        >
                          PNG · seluruh durasi
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-txt-muted">
                          Tidak ada overlay PNG
                        </div>
                      )}
                    </div>
                  )}

                  {layerKey === "subtitle" && (
                    <div className="relative h-7">
                      {subtitleSegments.length > 0 ? (
                        subtitleSegments.map((seg, i) => {
                          const left = (seg.start / totalDuration) * 100;
                          const width = ((seg.end - seg.start) / totalDuration) * 100;
                          return (
                            <div
                              key={i}
                              onClick={() => onSelectLayer("subtitle")}
                              className={`absolute top-0 flex h-full cursor-pointer items-center overflow-hidden rounded text-[10px] text-white transition-all ${cfg.color} ${isSelected ? "ring-2 ring-white" : "opacity-80 hover:opacity-100"}`}
                              style={{ left: `${left}%`, width: `${Math.max(2, width)}%`, minWidth: "20px" }}
                              title={`${seg.start.toFixed(1)}s–${seg.end.toFixed(1)}s · ${seg.text}`}
                            >
                              <span className="truncate px-1">{seg.text.slice(0, 12)}</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-txt-muted">
                          Belum ada subtitle (auto-generate via Whisper di Layer Inspector)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help footer */}
      <div className="border-t border-border bg-surface-secondary/30 px-4 py-1.5 text-[10px] text-txt-muted">
        <span className="mr-3">💡 Klik blok untuk select</span>
        <span className="mr-3">🔒 Lock = prevent edit</span>
        <span>👁 Hide = sembunyikan dari preview (rendering tetap pakai data DB)</span>
      </div>
    </div>
  );
}
