"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Upload, Eye, Save, Trash2, Plus, X, Type, Image as ImageIcon } from "lucide-react";

export type TextLayer = {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  fontWeight: "normal" | "bold" | "600" | "700";
  maxWidth?: number;
};

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
  const canvasRef = useRef<HTMLDivElement>(null);

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

  // Text layer ops
  const addTextLayer = () => {
    setData((d) => ({
      ...d,
      textLayers: [
        ...d.textLayers,
        {
          text: "{{title}}",
          x: 0.5,
          y: 0.75,
          fontSize: 60,
          color: "#FFFFFF",
          align: "center",
          fontWeight: "700",
          maxWidth: 0.9,
        },
      ],
    }));
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
              Drag foto slot untuk mengatur posisi foto artikel
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
                    <span className="text-xs font-bold text-goto-green bg-white/80 px-2 py-0.5 rounded">
                      AREA FOTO
                    </span>
                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => onCanvasMouseDown(e, "resize-br")}
                      className="absolute -right-1.5 -bottom-1.5 h-3 w-3 rounded-sm bg-goto-green cursor-se-resize"
                    />
                  </div>
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
                <button
                  onClick={addTextLayer}
                  className="flex items-center gap-1 rounded-full bg-goto-green-light px-3 py-1 text-xs font-medium text-goto-green hover:bg-goto-green hover:text-white"
                >
                  <Plus size={12} />
                  Tambah Teks
                </button>
              </div>
              <div className="space-y-3">
                {data.textLayers.map((layer, i) => (
                  <div key={i} className="rounded-lg border border-border bg-surface-secondary p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-txt-primary">Layer #{i + 1}</span>
                      <button onClick={() => removeTextLayer(i)} className="text-red-500 hover:text-red-700">
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
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <select
                        value={layer.align}
                        onChange={(e) => updateTextLayer(i, { align: e.target.value as TextLayer["align"] })}
                        className="rounded border border-border px-1 py-0.5"
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
                      >
                        <option value="normal">Normal</option>
                        <option value="600">Semibold</option>
                        <option value="700">Bold</option>
                      </select>
                      <div>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Max W %"
                          value={layer.maxWidth ? Math.round(layer.maxWidth * 100) : ""}
                          onChange={(e) =>
                            updateTextLayer(i, {
                              maxWidth: e.target.value ? parseInt(e.target.value) / 100 : undefined,
                            })
                          }
                          className="w-full rounded border border-border px-1 py-0.5"
                        />
                      </div>
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
