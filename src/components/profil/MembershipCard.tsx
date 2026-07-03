"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, RotateCw, Loader2, FileText, CreditCard } from "lucide-react";
import { drawBarcode } from "@/lib/barcode";
import { roleLabelsMap } from "@/lib/roles";

export interface MembershipCardData {
  name: string;
  role: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  specialization: string | null;
  nomorKartuPers: string | null;
  organisasiPers: string | null;
  createdAt: string;
}

// ID-1 card ratio (85.6mm × 54mm) rendered at ~300 DPI for crisp export.
const CARD_W = 1012;
const CARD_H = 638;
const GREEN = "#00AA13";
const GREEN_DARK = "#008C10";
const INK = "#1C1C1E";
const MUTED = "#6B7280";

const SITE_URL = "jurnalishukumbandung.com";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Press-card number falls back to a deterministic id derived from createdAt
// so every member always has a scannable code even before admin assigns one.
function resolveCardNumber(data: MembershipCardData): string {
  if (data.nomorKartuPers && data.nomorKartuPers.trim()) {
    return data.nomorKartuPers.trim();
  }
  const year = new Date(data.createdAt).getFullYear() || new Date().getFullYear();
  const hash = data.email
    .split("")
    .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
  const serial = (hash % 100000).toString().padStart(5, "0");
  return `JHB-${year}-${serial}`;
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

function validUntil(iso: string): string {
  const d = new Date(iso);
  const base = Number.isNaN(d.getTime()) ? new Date() : d;
  // Press cards are issued/renewed annually — valid through end of next year.
  return `31 Desember ${base.getFullYear() + 1}`;
}

async function drawFront(
  ctx: CanvasRenderingContext2D,
  data: MembershipCardData,
  opts: { skipAvatar?: boolean } = {},
) {
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  // Base
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 36);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Top brand band
  ctx.save();
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 36);
  ctx.clip();
  const grad = ctx.createLinearGradient(0, 0, CARD_W, 0);
  grad.addColorStop(0, GREEN_DARK);
  grad.addColorStop(1, GREEN);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, 132);
  ctx.restore();

  // Logo
  const logo = await loadImage("/logo-jhb.png");
  if (logo) {
    const s = 88;
    ctx.save();
    ctx.beginPath();
    ctx.arc(46 + s / 2, 22 + s / 2, s / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.clip();
    ctx.drawImage(logo, 46, 22, s, s);
    ctx.restore();
  }

  // Header text
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 38px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("JURNALIS HUKUM BANDUNG", 156, 52);
  ctx.font = "600 24px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("KARTU PERS  ·  PRESS CARD", 156, 92);

  // Photo frame
  const px = 46;
  const py = 168;
  const pw = 248;
  const ph = 320;
  roundRect(ctx, px, py, pw, ph, 18);
  ctx.fillStyle = "#F0F1F3";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = GREEN;
  ctx.stroke();

  const avatar = data.avatar && !opts.skipAvatar ? await loadImage(data.avatar) : null;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 18);
  ctx.clip();
  if (avatar) {
    // cover-fit
    const ar = avatar.width / avatar.height;
    const fr = pw / ph;
    let dw = pw;
    let dh = ph;
    let dx = px;
    let dy = py;
    if (ar > fr) {
      dh = ph;
      dw = ph * ar;
      dx = px - (dw - pw) / 2;
    } else {
      dw = pw;
      dh = pw / ar;
      dy = py - (dh - ph) / 2;
    }
    ctx.drawImage(avatar, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = "#D1D5DB";
    ctx.font = "700 140px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((data.name || "?").charAt(0).toUpperCase(), px + pw / 2, py + ph / 2);
    ctx.textAlign = "left";
  }
  ctx.restore();

  // Right column details
  const cx = 336;
  let cy = 188;

  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = "600 22px Arial, sans-serif";
  ctx.fillText("NAMA", cx, cy);
  cy += 38;
  ctx.fillStyle = INK;
  ctx.font = "700 46px Arial, sans-serif";
  // wrap long names to 2 lines
  const name = (data.name || "-").toUpperCase();
  const maxW = CARD_W - cx - 46;
  if (ctx.measureText(name).width > maxW) {
    const words = name.split(" ");
    let line1 = "";
    let line2 = "";
    for (const w of words) {
      if (ctx.measureText(`${line1} ${w}`).width < maxW || !line1) line1 = line1 ? `${line1} ${w}` : w;
      else line2 = line2 ? `${line2} ${w}` : w;
    }
    ctx.fillText(truncateToWidth(ctx, line1, maxW), cx, cy);
    cy += 50;
    if (line2) ctx.fillText(truncateToWidth(ctx, line2, maxW), cx, cy);
    cy += 44;
  } else {
    ctx.fillText(name, cx, cy);
    cy += 56;
  }

  ctx.fillStyle = MUTED;
  ctx.font = "600 22px Arial, sans-serif";
  ctx.fillText("JABATAN", cx, cy);
  cy += 34;
  // role badge
  const roleText = roleLabelsMap[data.role] || data.role || "Jurnalis";
  ctx.font = "700 28px Arial, sans-serif";
  const badgeW = ctx.measureText(roleText).width + 44;
  roundRect(ctx, cx, cy - 6, badgeW, 50, 25);
  ctx.fillStyle = "#E6F9E8";
  ctx.fill();
  ctx.fillStyle = GREEN_DARK;
  ctx.fillText(roleText, cx + 22, cy + 20);
  cy += 78;

  if (data.specialization) {
    ctx.fillStyle = MUTED;
    ctx.font = "600 22px Arial, sans-serif";
    ctx.fillText("SPESIALISASI", cx, cy);
    cy += 32;
    ctx.fillStyle = INK;
    ctx.font = "600 28px Arial, sans-serif";
    ctx.fillText(truncateToWidth(ctx, data.specialization, maxW), cx, cy);
    cy += 50;
  }

  ctx.fillStyle = MUTED;
  ctx.font = "600 22px Arial, sans-serif";
  ctx.fillText("NO. KARTU PERS", cx, cy);
  cy += 34;
  ctx.fillStyle = GREEN_DARK;
  ctx.font = "700 34px 'Courier New', monospace";
  ctx.fillText(resolveCardNumber(data), cx, cy);

  // Footer line
  ctx.fillStyle = MUTED;
  ctx.font = "500 20px Arial, sans-serif";
  ctx.fillText(`Berlaku s/d ${validUntil(data.createdAt)}`, 46, CARD_H - 36);
  ctx.textAlign = "right";
  ctx.fillStyle = GREEN_DARK;
  ctx.font = "700 22px Arial, sans-serif";
  ctx.fillText(SITE_URL, CARD_W - 46, CARD_H - 36);
  ctx.textAlign = "left";
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

async function drawBack(ctx: CanvasRenderingContext2D, data: MembershipCardData) {
  ctx.clearRect(0, 0, CARD_W, CARD_H);

  roundRect(ctx, 0, 0, CARD_W, CARD_H, 36);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();

  // Top magnetic-style strip
  ctx.save();
  roundRect(ctx, 0, 0, CARD_W, CARD_H, 36);
  ctx.clip();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 40, CARD_W, 84);
  ctx.restore();

  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // Contact / org block
  let y = 168;
  const lx = 46;
  const labelFont = "600 22px Arial, sans-serif";
  const valFont = "600 28px Arial, sans-serif";

  const rows: Array<[string, string]> = [
    ["ORGANISASI PERS", data.organisasiPers || "Jurnalis Hukum Bandung"],
    ["EMAIL", data.email || "-"],
    ["TELEPON", data.phone || "-"],
    ["TERDAFTAR", formatJoinDate(data.createdAt)],
  ];
  for (const [label, value] of rows) {
    ctx.fillStyle = MUTED;
    ctx.font = labelFont;
    ctx.fillText(label, lx, y);
    ctx.fillStyle = INK;
    ctx.font = valFont;
    ctx.fillText(truncateToWidth(ctx, value, CARD_W - lx - 60), lx, y + 32);
    y += 78;
  }

  // Barcode block (right-bottom)
  const cardNo = resolveCardNumber(data);
  const bcW = 420;
  const bcH = 96;
  const bcX = CARD_W - bcW - 46;
  const bcY = CARD_H - bcH - 96;
  ctx.fillStyle = "#FFFFFF";
  drawBarcode(ctx, cardNo, bcX, bcY, bcW, bcH, INK);
  ctx.fillStyle = INK;
  ctx.font = "600 26px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(cardNo, bcX + bcW / 2, bcY + bcH + 26);
  ctx.textAlign = "left";

  // Terms text
  ctx.fillStyle = MUTED;
  ctx.font = "400 19px Arial, sans-serif";
  const terms = [
    "Kartu ini adalah identitas resmi pemegang sebagai jurnalis",
    "Jurnalis Hukum Bandung. Wajib dikembalikan apabila yang",
    "bersangkutan tidak lagi bertugas. Penyalahgunaan kartu",
    "dapat dikenai sanksi sesuai ketentuan yang berlaku.",
  ];
  let ty = CARD_H - 188;
  for (const line of terms) {
    ctx.fillText(line, lx, ty);
    ty += 26;
  }

  // Verification footer
  ctx.fillStyle = GREEN_DARK;
  ctx.font = "700 20px Arial, sans-serif";
  ctx.fillText(`Verifikasi: ${SITE_URL}`, lx, CARD_H - 40);

  // Issuer label on the dark strip
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "700 30px Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("KARTU PERS — JURNALIS HUKUM BANDUNG", lx, 82);
}

export default function MembershipCard({ data }: { data: MembershipCardData }) {
  const frontRef = useRef<HTMLCanvasElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const [flipped, setFlipped] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [downloading, setDownloading] = useState<null | "png" | "pdf">(null);
  const [error, setError] = useState<string | null>(null);

  const render = useCallback(async () => {
    const f = frontRef.current;
    const b = backRef.current;
    if (!f || !b) return;
    const fctx = f.getContext("2d");
    const bctx = b.getContext("2d");
    if (!fctx || !bctx) return;
    await drawFront(fctx, data);
    await drawBack(bctx, data);
    setRendered(true);
  }, [data]);

  useEffect(() => {
    render();
  }, [render]);

  // Build a fresh offscreen canvas for export. If a cross-origin avatar taints
  // the canvas, toDataURL() throws — we retry once without the avatar so the
  // download always succeeds (and tell the user why the photo is missing).
  const buildSide = useCallback(
    async (side: "front" | "back", skipAvatar: boolean): Promise<{ canvas: HTMLCanvasElement; tainted: boolean }> => {
      const c = document.createElement("canvas");
      c.width = CARD_W;
      c.height = CARD_H;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak didukung browser ini.");
      if (side === "front") await drawFront(ctx, data, { skipAvatar });
      else await drawBack(ctx, data);
      // Probe for taint cheaply before the real export.
      let tainted = false;
      try {
        ctx.getImageData(0, 0, 1, 1);
      } catch {
        tainted = true;
      }
      return { canvas: c, tainted };
    },
    [data],
  );

  const buildBothSides = useCallback(async (): Promise<{ front: HTMLCanvasElement; back: HTMLCanvasElement; dropped: boolean }> => {
    let front = await buildSide("front", false);
    let dropped = false;
    if (front.tainted) {
      front = await buildSide("front", true);
      dropped = true;
    }
    const back = await buildSide("back", false);
    return { front: front.canvas, back: back.canvas, dropped };
  }, [buildSide]);

  const downloadPng = useCallback(async () => {
    setDownloading("png");
    setError(null);
    try {
      const { front, back, dropped } = await buildBothSides();
      const gap = 40;
      const out = document.createElement("canvas");
      out.width = CARD_W;
      out.height = CARD_H * 2 + gap;
      const octx = out.getContext("2d");
      if (octx) {
        octx.fillStyle = "#F7F7F8";
        octx.fillRect(0, 0, out.width, out.height);
        octx.drawImage(front, 0, 0);
        octx.drawImage(back, 0, CARD_H + gap);
      }
      const url = out.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `kartu-pers-${slug(data.name)}.png`;
      a.click();
      if (dropped) setError("Foto profil tidak dapat dimuat ke kartu (masalah CORS), kartu diunduh tanpa foto.");
    } catch {
      setError("Gagal mengunduh kartu. Coba lagi atau ganti foto profil.");
    } finally {
      setDownloading(null);
    }
  }, [buildBothSides, data.name]);

  const downloadPdf = useCallback(async () => {
    setDownloading("pdf");
    setError(null);
    try {
      const { front, back, dropped } = await buildBothSides();
      const { jsPDF } = await import("jspdf");
      // ID-1 card size in mm.
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [85.6, 54] });
      doc.addImage(front.toDataURL("image/png"), "PNG", 0, 0, 85.6, 54);
      doc.addPage([85.6, 54], "landscape");
      doc.addImage(back.toDataURL("image/png"), "PNG", 0, 0, 85.6, 54);
      doc.save(`kartu-pers-${slug(data.name)}.pdf`);
      if (dropped) setError("Foto profil tidak dapat dimuat ke kartu (masalah CORS), kartu diunduh tanpa foto.");
    } catch {
      setError("Gagal mengunduh kartu. Coba lagi atau ganti foto profil.");
    } finally {
      setDownloading(null);
    }
  }, [buildBothSides, data.name]);

  return (
    <div className="rounded-[12px] border border-border bg-surface p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-txt-primary">
          <CreditCard size={20} className="text-goto-green" />
          Kartu Keanggotaan
        </h3>
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          className="btn-ghost flex items-center gap-1.5 text-sm"
        >
          <RotateCw size={15} />
          {flipped ? "Lihat Depan" : "Lihat Belakang"}
        </button>
      </div>

      {/* Flip stage */}
      <div className="mx-auto" style={{ perspective: "1600px", maxWidth: 540 }}>
        <div
          className="relative w-full transition-transform duration-700"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            aspectRatio: `${CARD_W} / ${CARD_H}`,
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[18px] shadow-card"
            style={{ backfaceVisibility: "hidden" }}
          >
            <canvas
              ref={frontRef}
              width={CARD_W}
              height={CARD_H}
              className="h-full w-full"
              aria-label="Kartu pers tampak depan"
            />
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[18px] shadow-card"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <canvas
              ref={backRef}
              width={CARD_W}
              height={CARD_H}
              className="h-full w-full"
              aria-label="Kartu pers tampak belakang"
            />
          </div>
        </div>
      </div>

      {/* Screen-reader description of card contents */}
      <p className="sr-only">
        Kartu pers atas nama {data.name}, jabatan {roleLabelsMap[data.role] || data.role || "Jurnalis"},
        nomor kartu pers {resolveCardNumber(data)}, diterbitkan oleh{" "}
        {data.organisasiPers || "Jurnalis Hukum Bandung"}.
      </p>

      {error && (
        <div className="mt-4 rounded-[12px] border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm text-amber-600">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={downloadPng}
          disabled={!rendered || downloading !== null}
          className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {downloading === "png" ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          Unduh PNG
        </button>
        <button
          type="button"
          onClick={downloadPdf}
          disabled={!rendered || downloading !== null}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {downloading === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
          Unduh PDF
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-txt-muted">
        Kartu memuat depan &amp; belakang. PDF siap cetak ukuran kartu standar (85,6 × 54 mm).
      </p>
    </div>
  );
}

function slug(name: string): string {
  return (name || "anggota")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "anggota";
}
