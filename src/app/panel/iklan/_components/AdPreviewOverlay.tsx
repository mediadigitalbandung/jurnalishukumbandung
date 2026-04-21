"use client";

import { useMemo } from "react";
import { X, ImageIcon } from "lucide-react";
import { slotLabels, slotSpecs } from "./ad-constants";
import { sanitizeAdHtml } from "@/lib/sanitize";

function AdContent({ type, imageUrl, htmlCode, height }: { type: string; imageUrl: string; htmlCode: string; height: number }) {
  const safeHtml = useMemo(
    () => (type === "HTML" && htmlCode ? sanitizeAdHtml(htmlCode) : ""),
    [type, htmlCode]
  );
  if (type !== "HTML" && imageUrl) {
    return <img src={imageUrl} alt="Preview" className="max-w-full h-auto object-contain" style={{ maxHeight: height }} />;
  }
  if (type === "HTML" && safeHtml) {
    return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
  }
  return (
    <div className="flex flex-col items-center gap-1 py-6 text-txt-muted">
      <ImageIcon size={24} />
      <span className="text-xs">Belum ada gambar</span>
    </div>
  );
}

function AdSlotBox({ label, spec, type, imageUrl, htmlCode }: {
  label: string; spec: { height: number; ratio: string }; type: string; imageUrl: string; htmlCode: string;
}) {
  return (
    <div className="relative border-2 border-dashed border-goto-green/40 rounded-lg overflow-hidden bg-surface">
      <div className="absolute top-1 left-2 z-10 rounded bg-goto-green/90 px-2 py-0.5 text-[10px] font-bold text-white">
        IKLAN — {label}
      </div>
      <div className="flex items-center justify-center" style={{ minHeight: spec.height }}>
        <AdContent type={type} imageUrl={imageUrl} htmlCode={htmlCode} height={spec.height} />
      </div>
    </div>
  );
}

function ContentBlock() {
  return (
    <div className="rounded-lg bg-surface p-4 border border-border space-y-2">
      <div className="h-3 w-48 rounded bg-surface-tertiary" />
      <div className="h-2 w-full rounded bg-surface-tertiary" />
      <div className="h-2 w-3/4 rounded bg-surface-tertiary" />
    </div>
  );
}

export default function AdPreviewOverlay({ slot, imageUrl, htmlCode, type, targetUrl, onClose }: {
  slot: string; imageUrl: string; htmlCode: string; type: string; targetUrl: string; onClose: () => void;
}) {
  const spec = slotSpecs[slot];
  const label = slotLabels[slot];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative max-w-[95vw] max-h-[90vh] overflow-auto bg-surface rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface border-b border-border px-5 py-3 rounded-t-2xl">
          <div>
            <h3 className="text-sm font-bold text-txt-primary">Preview — {label}</h3>
            <p className="text-xs text-txt-muted">{spec?.ratio} • {spec?.desc}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-surface-secondary"><X size={18} /></button>
        </div>

        <div className="p-4 sm:p-6 bg-surface-secondary">
          {slot === "SIDEBAR" ? (
            <div className="max-w-4xl mx-auto flex gap-5">
              <div className="flex-1 space-y-3">
                <ContentBlock />
                <ContentBlock />
              </div>
              <div className="shrink-0 w-[300px]">
                <AdSlotBox label={label} spec={spec} type={type} imageUrl={imageUrl} htmlCode={htmlCode} />
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              <ContentBlock />
              <AdSlotBox label={label} spec={spec} type={type} imageUrl={imageUrl} htmlCode={htmlCode} />
              <ContentBlock />
            </div>
          )}
          {targetUrl && (
            <p className="mt-3 text-center text-xs text-txt-muted">
              Klik mengarah ke: <span className="text-goto-green font-medium">{targetUrl}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
