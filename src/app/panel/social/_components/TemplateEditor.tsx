"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Upload, Eye, Save, Trash2, Plus, X, Type, Image as ImageIcon } from "lucide-react";

// Inject Google Fonts stylesheet once — for live preview in dropdown/canvas
const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Source+Sans+3:wght@400;700&family=Poppins:wght@400;600;700&family=Montserrat:wght@400;700;900&family=Plus+Jakarta+Sans:wght@400;700&family=DM+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&family=Bebas+Neue&family=Oswald:wght@400;700&family=Anton&family=Archivo+Black&family=Lora:wght@400;700&family=Playfair+Display:wght@400;700;900&family=Merriweather:wght@400;700&family=PT+Serif:wght@400;700&display=swap";

function ensureGoogleFontsLoaded() {
  if (typeof document === "undefined") return;
  if (document.getElementById("jhb-social-fonts")) return;
  const link = document.createElement("link");
  link.id = "jhb-social-fonts";
  link.rel = "stylesheet";
  link.href = GOOGLE_FONTS_HREF;
  document.head.appendChild(link);
}

export type TextLayer = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  fontWeight: "normal" | "bold" | "600" | "700";
  maxWidth?: number;
  maxLines?: number;
  lineHeight?: number;
  letterSpacing?: number;
  fontFamily?: string;
};

type LayerPreset = {
  name: string;
  layer: TextLayer;
};

// Curated font list — nama CSS + label display. Harus ada di VPS (terpasang via fc-cache).
export const FONT_OPTIONS: { value: string; label: string; category: string }[] = [
  // System (safe fallback)
  { value: "Arial, Helvetica, sans-serif", label: "Arial (default)", category: "System" },
  { value: "Georgia, serif", label: "Georgia", category: "System" },
  { value: "'Times New Roman', serif", label: "Times New Roman", category: "System" },
  { value: "Verdana, sans-serif", label: "Verdana", category: "System" },
  // Sans-serif modern
  { value: "'Inter', sans-serif", label: "Inter", category: "Sans Modern" },
  { value: "'Roboto', sans-serif", label: "Roboto", category: "Sans Modern" },
  { value: "'Open Sans', sans-serif", label: "Open Sans", category: "Sans Modern" },
  { value: "'Lato', sans-serif", label: "Lato", category: "Sans Modern" },
  { value: "'Source Sans 3', sans-serif", label: "Source Sans 3", category: "Sans Modern" },
  // Display/Headline
  { value: "'Poppins', sans-serif", label: "Poppins", category: "Display" },
  { value: "'Montserrat', sans-serif", label: "Montserrat", category: "Display" },
  { value: "'Plus Jakarta Sans', sans-serif", label: "Plus Jakarta Sans", category: "Display" },
  { value: "'DM Sans', sans-serif", label: "DM Sans", category: "Display" },
  { value: "'Space Grotesk', sans-serif", label: "Space Grotesk", category: "Display" },
  // Bold/Condensed
  { value: "'Bebas Neue', sans-serif", label: "Bebas Neue", category: "Bold Condensed" },
  { value: "'Oswald', sans-serif", label: "Oswald", category: "Bold Condensed" },
  { value: "'Anton', sans-serif", label: "Anton", category: "Bold Condensed" },
  { value: "'Archivo Black', sans-serif", label: "Archivo Black", category: "Bold Condensed" },
  // Serif
  { value: "'Lora', serif", label: "Lora (brand JHB)", category: "Serif" },
  { value: "'Playfair Display', serif", label: "Playfair Display", category: "Serif" },
  { value: "'Merriweather', serif", label: "Merriweather", category: "Serif" },
  { value: "'PT Serif', serif", label: "PT Serif", category: "Serif" },
];

const LAYER_PRESETS: LayerPreset[] = [
  {
    name: "Kategori (badge)",
    layer: {
      text: "{{category}}",
      x: 0.08,
      y: 0.5,
      fontSize: 42,
      color: "#FFFFFF",
      align: "left",
      fontWeight: "700",
      maxWidth: 0.6,
      maxLines: 1,
      letterSpacing: 2,
    },
  },
  {
    name: "Judul (AI paraphrase, 2 baris)",
    layer: {
      text: "{{paraphrased_title}}",
      x: 0.08,
      y: 0.6,
      fontSize: 54,
      color: "#1C1C1E",
      align: "left",
      fontWeight: "700",
      maxWidth: 0.84,
      maxLines: 2,
      lineHeight: 1.15,
    },
  },
  {
    name: "Ringkasan (AI, 1-2 kalimat)",
    layer: {
      text: "{{short_summary}}",
      x: 0.08,
      y: 0.76,
      fontSize: 28,
      color: "#4B5563",
      align: "left",
      fontWeight: "normal",
      maxWidth: 0.84,
      maxLines: 3,
      lineHeight: 1.3,
    },
  },
  {
    name: "Tanggal",
    layer: {
      text: "{{date}}",
      x: 0.08,
      y: 0.92,
      fontSize: 22,
      color: "#6B7280",
      align: "left",
      fontWeight: "600",
      maxLines: 1,
    },
  },
];

export type TemplateData = {
  id?: string;
  name: string;
  platform: "instagram" | "facebook" | "both";
  aspectRatio: "4:5" | "1:1" | "1.91:1";
  templateImageUrl: string;
  photoSlotX: number;
  photoSlotY: number;
  photoSlotWidth: number;
  photoSlotHeight: number;
  textLayers: TextLayer[];
  isActive: boolean;
  isDefault: boolean;
};

const ASPECT_CONFIGS = {
  "4:5": { w: 1080, h: 1350, label: "Instagram Portrait 4:5" },
  "1:1": { w: 1080, h: 1080, label: "Square 1:1" },
  "1.91:1": { w: 1200, h: 628, label: "Facebook Landscape 1.91:1" },
};

const DEFAULT_TEMPLATE: TemplateData = {
  name: "",
  platform: "instagram",
  aspectRatio: "4:5",
  templateImageUrl: "",
  photoSlotX: 0.05,
  photoSlotY: 0.05,
  photoSlotWidth: 0.9,
  photoSlotHeight: 0.6,
  textLayers: [],
  isActive: true,
  isDefault: false,
};

export default function TemplateEditor({
  template,
  onSave,
  onCancel,
  onDelete,
}: {
  template: TemplateData | null;
  onSave: (data: TemplateData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [data, setData] = useState<TemplateData>(template || DEFAULT_TEMPLATE);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [draggingSlot, setDraggingSlot] = useState<null | "move" | "resize-br">(null);
  const [draggingText, setDraggingText] = useState<null | { index: number; kind: "move" | "resize" }>(null);
  const [selectedLayer, setSelectedLayer] = useState<number | null>(null);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load Google Fonts once per session
  useEffect(() => { ensureGoogleFontsLoaded(); }, []);

  const aspectCfg = ASPECT_CONFIGS[data.aspectRatio];
  const aspectVal = aspectCfg.w / aspectCfg.h;

  // Upload template image
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");
      setData((d) => ({ ...d, templateImageUrl: json.data.url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Live preview (debounced)
  const generatePreview = useCallback(async () => {
    if (!data.templateImageUrl) return;
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/social/templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: data }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Preview failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return url;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  }, [data]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (data.templateImageUrl) generatePreview();
    }, 600);
    return () => clearTimeout(t);
  }, [data, generatePreview]);

  // Photo slot drag handlers
  const onCanvasMouseDown = (e: React.MouseEvent, kind: "move" | "resize-br") => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingSlot(kind);
  };

  useEffect(() => {
    if (!draggingSlot) return;
    const onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const xRel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const yRel = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      setData((d) => {
        if (draggingSlot === "move") {
          return {
            ...d,
            photoSlotX: Math.max(0, Math.min(1 - d.photoSlotWidth, xRel - d.photoSlotWidth / 2)),
            photoSlotY: Math.max(0, Math.min(1 - d.photoSlotHeight, yRel - d.photoSlotHeight / 2)),
          };
        }
        // resize bottom-right
        return {
          ...d,
          photoSlotWidth: Math.max(0.05, Math.min(1 - d.photoSlotX, xRel - d.photoSlotX)),
          photoSlotHeight: Math.max(0.05, Math.min(1 - d.photoSlotY, yRel - d.photoSlotY)),
        };
      });
    };
    const onUp = () => setDraggingSlot(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingSlot]);

  // Text layer drag handlers
  useEffect(() => {
    if (!draggingText) return;
    const onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const xRel = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const yRel = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      setData((d) => {
        const next = [...d.textLayers];
        const layer = next[draggingText.index];
        if (!layer) return d;

        if (draggingText.kind === "move") {
          next[draggingText.index] = {
            ...layer,
            x: Math.max(0, Math.min(1, xRel)),
            y: Math.max(0, Math.min(1, yRel)),
          };
        } else {
          // resize — drag right edge to set maxWidth relative to x
          const newMax = Math.max(0.1, Math.min(1, xRel - layer.x));
          next[draggingText.index] = { ...layer, maxWidth: newMax };
        }
        return { ...d, textLayers: next };
      });
    };
    const onUp = () => setDraggingText(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggingText]);

  // Text layer ops
  const addTextLayer = (preset?: LayerPreset) => {
    const layer: TextLayer = preset?.layer || {
      text: "{{title}}",
      x: 0.5,
      y: 0.75,
      fontSize: 60,
      color: "#FFFFFF",
      align: "center",
      fontWeight: "700",
      maxWidth: 0.9,
      maxLines: 2,
    };
    setData((d) => ({ ...d, textLayers: [...d.textLayers, { ...layer }] }));
    setPresetMenuOpen(false);
  };

  const updateTextLayer = (i: number, patch: Partial<TextLayer>) => {
    setData((d) => ({
      ...d,
      textLayers: d.textLayers.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));
  };

  const removeTextLayer = (i: number) => {
    setData((d) => ({ ...d, textLayers: d.textLayers.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async () => {
    if (!data.name.trim()) return alert("Nama template wajib");
    if (!data.templateImageUrl) return alert("Upload gambar template dulu");
    setSaving(true);
    try {
      await onSave(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-[12px] bg-surface shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-txt-primary">
              {data.id ? "Edit Template" : "Template Baru"}
            </h2>
            <p className="text-xs text-txt-secondary">
              Placeholder: <code className="text-goto-green">{`{{paraphrased_title}}`}</code>{" "}
              <code className="text-goto-green">{`{{short_summary}}`}</code>{" "}
              <code className="text-goto-green">{`{{category}}`}</code>{" "}
              <code className="text-goto-green">{`{{date}}`}</code> <span className="text-txt-muted">· AI auto-fill</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data.id && onDelete && (
              <button
                onClick={async () => {
                  if (confirm("Hapus template ini?")) await onDelete();
                }}
                className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={14} className="inline mr-1" />
                Hapus
              </button>
            )}
            <button
              onClick={onCancel}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-goto-green px-4 py-2 text-sm font-semibold text-white hover:bg-goto-green-dark disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="inline animate-spin" /> : <Save size={14} className="inline mr-1" />}
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1fr,400px]">
          {/* LEFT: Canvas editor */}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-txt-secondary">
                Nama Template
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                placeholder="cth: IG Portrait Breaking News"
                className="w-full rounded-lg border border-border px-4 py-2 text-sm focus:border-goto-green focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-txt-secondary">Platform</label>
                <select
                  value={data.platform}
                  onChange={(e) =>
                    setData((d) => ({ ...d, platform: e.target.value as TemplateData["platform"] }))
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="both">Keduanya</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-txt-secondary">Aspek Rasio</label>
                <select
                  value={data.aspectRatio}
                  onChange={(e) =>
                    setData((d) => ({ ...d, aspectRatio: e.target.value as TemplateData["aspectRatio"] }))
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="4:5">{ASPECT_CONFIGS["4:5"].label}</option>
                  <option value="1:1">{ASPECT_CONFIGS["1:1"].label}</option>
                  <option value="1.91:1">{ASPECT_CONFIGS["1.91:1"].label}</option>
                </select>
              </div>
            </div>

            {/* Upload template background */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-txt-secondary">
                Background Template (PNG transparan di area foto)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-txt-secondary hover:bg-surface-secondary">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? "Upload..." : data.templateImageUrl ? "Ganti" : "Upload"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} className="hidden" />
                </label>
                {data.templateImageUrl && (
                  <span className="text-xs text-txt-muted truncate max-w-[200px]">
                    {data.templateImageUrl.split("/").pop()}
                  </span>
                )}
              </div>
            </div>

            {/* Canvas with photo slot */}
            {data.templateImageUrl && (
              <div>
                <label className="mb-2 block text-xs font-semibold text-txt-secondary">
                  Area Foto Artikel (drag untuk pindah, pojok kanan-bawah untuk resize)
                </label>
                <div
                  ref={canvasRef}
                  style={{ aspectRatio: aspectVal }}
                  className="relative w-full max-w-md rounded-lg border-2 border-dashed border-border bg-surface-tertiary overflow-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={data.templateImageUrl}
                    alt="template"
                    className="absolute inset-0 h-full w-full object-fill"
                  />
                  {/* Photo slot rectangle */}
                  <div
                    style={{
                      left: `${data.photoSlotX * 100}%`,
                      top: `${data.photoSlotY * 100}%`,
                      width: `${data.photoSlotWidth * 100}%`,
                      height: `${data.photoSlotHeight * 100}%`,
                    }}
                    onMouseDown={(e) => onCanvasMouseDown(e, "move")}
                    className="absolute border-2 border-goto-green bg-goto-green/20 cursor-move flex items-center justify-center"
                  >
                    <span className="text-xs font-bold text-goto-green bg-white/80 px-2 py-0.5 rounded pointer-events-none">
                      AREA FOTO
                    </span>
                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => onCanvasMouseDown(e, "resize-br")}
                      className="absolute -right-1.5 -bottom-1.5 h-3 w-3 rounded-sm bg-goto-green cursor-se-resize"
                    />
                  </div>

                  {/* Text layer boxes */}
                  {data.textLayers.map((layer, i) => {
                    const isSelected = selectedLayer === i;
                    const leftPct = layer.x * 100;
                    const topPct = layer.y * 100;
                    const widthPct = (layer.maxWidth || 0.9) * 100;
                    // Estimate box height based on font size + lines
                    const estLines = Math.min(layer.maxLines || 3, 3);
                    // Simple estimate: fontSize / canvasHeight (1350 for 4:5) × 100 × lines × 1.2
                    const canvasH = ASPECT_CONFIGS[data.aspectRatio].h;
                    const heightPct = ((layer.fontSize * (layer.lineHeight || 1.2) * estLines) / canvasH) * 100;
                    return (
                      <div
                        key={i}
                        style={{
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${widthPct}%`,
                          height: `${Math.max(heightPct, 3)}%`,
                          transform:
                            layer.align === "center"
                              ? "translateX(-50%)"
                              : layer.align === "right"
                              ? "translateX(-100%)"
                              : undefined,
                        }}
                        onClick={(e) => { e.stopPropagation(); setSelectedLayer(i); }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedLayer(i);
                          setDraggingText({ index: i, kind: "move" });
                        }}
                        className={`absolute flex items-center px-1 cursor-move transition-colors ${
                          isSelected
                            ? "border-2 border-blue-500 bg-blue-500/10"
                            : "border border-dashed border-blue-400/60 bg-blue-500/5 hover:border-blue-500"
                        }`}
                      >
                        <span
                          className={`truncate text-[10px] font-semibold ${
                            isSelected ? "text-blue-700" : "text-blue-600"
                          } bg-white/80 px-1 rounded pointer-events-none`}
                          style={{
                            textAlign: layer.align,
                            width: "100%",
                          }}
                        >
                          T{i + 1}: {layer.text.replace(/\{\{(\w+)\}\}/g, "$1")}
                        </span>
                        {/* Resize handle (right edge) */}
                        <div
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDraggingText({ index: i, kind: "resize" });
                          }}
                          className="absolute -right-1 top-1/2 -translate-y-1/2 h-3 w-3 rounded-sm bg-blue-500 cursor-ew-resize"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-txt-muted">
                  Posisi: {Math.round(data.photoSlotX * 100)}%, {Math.round(data.photoSlotY * 100)}% · Ukuran:{" "}
                  {Math.round(data.photoSlotWidth * 100)}% × {Math.round(data.photoSlotHeight * 100)}%
                </p>
              </div>
            )}

            {/* Text layers */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-txt-secondary">
                  Text Layers ({data.textLayers.length})
                </label>
                <div className="relative">
                  <button
                    onClick={() => setPresetMenuOpen((o) => !o)}
                    className="flex items-center gap-1 rounded-full bg-goto-green-light px-3 py-1 text-xs font-medium text-goto-green hover:bg-goto-green hover:text-white"
                  >
                    <Plus size={12} />
                    Tambah Teks
                  </button>
                  {presetMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setPresetMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-surface shadow-lg py-1">
                        <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-txt-muted border-b border-border">
                          Preset (AI auto-fill)
                        </div>
                        {LAYER_PRESETS.map((p) => (
                          <button
                            key={p.name}
                            onClick={() => addTextLayer(p)}
                            className="block w-full text-left px-3 py-2 text-xs hover:bg-surface-secondary"
                          >
                            {p.name}
                          </button>
                        ))}
                        <div className="border-t border-border">
                          <button
                            onClick={() => addTextLayer()}
                            className="block w-full text-left px-3 py-2 text-xs hover:bg-surface-secondary"
                          >
                            Teks kosong (custom)
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {data.textLayers.map((layer, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedLayer(i)}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedLayer === i
                        ? "border-blue-500 bg-blue-50"
                        : "border-border bg-surface-secondary hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-txt-primary">
                        Layer #{i + 1} {selectedLayer === i && <span className="text-blue-600">• dipilih</span>}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTextLayer(i); }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <textarea
                      value={layer.text}
                      onChange={(e) => updateTextLayer(i, { text: e.target.value })}
                      rows={2}
                      placeholder="{{title}}, {{category}}, {{date}}, atau teks bebas"
                      className="w-full rounded border border-border px-2 py-1 text-xs mb-2"
                    />
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-txt-muted">X (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={Math.round(layer.x * 100)}
                          onChange={(e) => updateTextLayer(i, { x: parseInt(e.target.value) / 100 || 0 })}
                          className="w-full rounded border border-border px-1 py-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-txt-muted">Y (%)</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={Math.round(layer.y * 100)}
                          onChange={(e) => updateTextLayer(i, { y: parseInt(e.target.value) / 100 || 0 })}
                          className="w-full rounded border border-border px-1 py-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-txt-muted">Size (px)</label>
                        <input
                          type="number"
                          min={10}
                          max={200}
                          value={layer.fontSize}
                          onChange={(e) => updateTextLayer(i, { fontSize: parseInt(e.target.value) || 40 })}
                          className="w-full rounded border border-border px-1 py-0.5"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-txt-muted">Warna</label>
                        <input
                          type="color"
                          value={layer.color}
                          onChange={(e) => updateTextLayer(i, { color: e.target.value })}
                          className="w-full h-[26px] rounded border border-border"
                        />
                      </div>
                    </div>
                    {/* Font family selector */}
                    <div className="mt-2">
                      <label className="text-[10px] text-txt-muted">Font</label>
                      <select
                        value={layer.fontFamily || "Arial, Helvetica, sans-serif"}
                        onChange={(e) => updateTextLayer(i, { fontFamily: e.target.value })}
                        className="w-full rounded border border-border px-2 py-1 text-xs"
                        style={{ fontFamily: layer.fontFamily || "inherit" }}
                      >
                        {["System", "Sans Modern", "Display", "Bold Condensed", "Serif"].map((cat) => (
                          <optgroup key={cat} label={cat}>
                            {FONT_OPTIONS.filter((f) => f.category === cat).map((f) => (
                              <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                                {f.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                      <select
                        value={layer.align}
                        onChange={(e) => updateTextLayer(i, { align: e.target.value as TextLayer["align"] })}
                        className="rounded border border-border px-1 py-0.5"
                        title="Alignment"
                      >
                        <option value="left">Kiri</option>
                        <option value="center">Tengah</option>
                        <option value="right">Kanan</option>
                      </select>
                      <select
                        value={layer.fontWeight}
                        onChange={(e) =>
                          updateTextLayer(i, { fontWeight: e.target.value as TextLayer["fontWeight"] })
                        }
                        className="rounded border border-border px-1 py-0.5"
                        title="Font weight"
                      >
                        <option value="normal">Normal</option>
                        <option value="600">Semibold</option>
                        <option value="700">Bold</option>
                      </select>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Max W %"
                        title="Max width %"
                        value={layer.maxWidth ? Math.round(layer.maxWidth * 100) : ""}
                        onChange={(e) =>
                          updateTextLayer(i, {
                            maxWidth: e.target.value ? parseInt(e.target.value) / 100 : undefined,
                          })
                        }
                        className="w-full rounded border border-border px-1 py-0.5"
                      />
                      <input
                        type="number"
                        min={1}
                        max={10}
                        placeholder="Max baris"
                        title="Maks jumlah baris (truncate ellipsis)"
                        value={layer.maxLines || ""}
                        onChange={(e) =>
                          updateTextLayer(i, {
                            maxLines: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        className="w-full rounded border border-border px-1 py-0.5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={data.isActive}
                  onChange={(e) => setData((d) => ({ ...d, isActive: e.target.checked }))}
                />
                Aktif
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={data.isDefault}
                  onChange={(e) => setData((d) => ({ ...d, isDefault: e.target.checked }))}
                />
                Jadikan default untuk platform ini
              </label>
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-txt-primary">Preview</label>
              <button
                onClick={generatePreview}
                disabled={!data.templateImageUrl || previewLoading}
                className="flex items-center gap-1 rounded-full bg-goto-green-light px-3 py-1 text-xs font-medium text-goto-green hover:bg-goto-green hover:text-white disabled:opacity-50"
              >
                {previewLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                Refresh
              </button>
            </div>
            <div
              style={{ aspectRatio: aspectVal }}
              className="w-full rounded-lg border border-border bg-surface-tertiary overflow-hidden flex items-center justify-center"
            >
              {previewLoading ? (
                <Loader2 size={32} className="animate-spin text-goto-green" />
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="preview" className="h-full w-full object-contain" />
              ) : (
                <p className="text-xs text-txt-muted text-center px-4">
                  {data.templateImageUrl
                    ? "Generating preview..."
                    : "Upload template untuk melihat preview"}
                </p>
              )}
            </div>
            <p className="text-[11px] text-txt-muted">
              Preview menggunakan artikel terbaru yang dipublish sebagai sample.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
