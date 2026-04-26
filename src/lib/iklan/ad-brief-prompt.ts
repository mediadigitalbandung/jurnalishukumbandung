/**
 * Ad Brief → Claude Design Prompt Generator
 *
 * Translates user-input ad brief (client, slot, message) into a polished prompt
 * ready to paste into Claude Design. Each slot has its own dimension/style guide.
 *
 * Usage: generateClaudeDesignPrompt(brief) → string (copy to clipboard)
 */

import type { AdSlot } from "@prisma/client";

// ─── Slot specifications (dimensi + tone yang optimal per posisi) ────────────
export interface SlotSpec {
  width: number;
  height: number;
  aspectRatio: string;
  position: string;
  visibility: "very-high" | "high" | "medium" | "low";
  tone: string;
  guidelines: string[];
}

export const SLOT_SPECS: Record<AdSlot, SlotSpec> = {
  HEADER: {
    width: 1200, height: 300, aspectRatio: "4:1",
    position: "Banner di atas konten artikel, langsung terlihat saat scroll pertama",
    visibility: "very-high",
    tone: "Premium, profesional, bold headline",
    guidelines: [
      "Headline besar (60-80px) di kiri, CTA button di kanan",
      "Background warna brand atau gradient halus",
      "Logo brand di pojok kiri atas (kecil, tidak dominan)",
      "Hindari banyak teks — max 8 kata di headline",
    ],
  },
  SIDEBAR: {
    width: 300, height: 600, aspectRatio: "1:2",
    position: "Vertikal di sidebar artikel, terlihat saat scroll konten",
    visibility: "medium",
    tone: "Story-telling vertikal, atas-tengah-bawah",
    guidelines: [
      "Atas: hero image atau headline",
      "Tengah: 1-2 kalimat value proposition",
      "Bawah: CTA button warna kontras",
      "Padding generous, jangan terlalu padat",
    ],
  },
  IN_ARTICLE: {
    width: 600, height: 300, aspectRatio: "2:1",
    position: "Tersisip di tengah body artikel, dilihat dengan reading focus",
    visibility: "very-high",
    tone: "Native-feeling, mirip blockquote, tidak terlalu commercial",
    guidelines: [
      "Layout horizontal: image kiri 40%, text+CTA kanan 60%",
      "Headline 32-40px, subtle (bukan ALL CAPS)",
      "Background light atau soft pattern",
      "CTA button sedang (bukan giant)",
      "Boleh ada subtle border untuk separation dari artikel",
    ],
  },
  FOOTER: {
    width: 1200, height: 150,
    aspectRatio: "8:1",
    position: "Bottom artikel, sebelum komentar",
    visibility: "low",
    tone: "Compact, minimalis",
    guidelines: [
      "Layout horizontal compact",
      "Headline pendek + 1 CTA",
      "Background subtle, tidak distract",
    ],
  },
  BETWEEN_SECTIONS: {
    width: 800, height: 200,
    aspectRatio: "4:1",
    position: "Antar section konten, mirip card spacer",
    visibility: "medium",
    tone: "Card-style, blend dengan content",
    guidelines: [
      "Layout horizontal seimbang",
      "Background warna brand atau white card",
      "Border-radius 12px",
      "CTA button di kanan, bukan dominant",
    ],
  },
  POPUP: {
    width: 800, height: 800, aspectRatio: "1:1",
    position: "Modal popup setelah X detik di halaman, fully focused",
    visibility: "very-high",
    tone: "Eye-catching, urgency, conversion-focused",
    guidelines: [
      "Image hero 50% area atas",
      "Headline strong + value prop singkat",
      "CTA button GIANT (24px+ font, bold)",
      "Tombol close X di pojok kanan atas (kecil tapi visible)",
      "Boleh urgency badge ('Promo terbatas', 'Hari terakhir', dll)",
    ],
  },
  FLOATING_BOTTOM: {
    width: 600, height: 150, aspectRatio: "4:1",
    position: "Floating bar bawah layar mobile, sticky saat scroll",
    visibility: "very-high",
    tone: "Compact, urgent, mobile-first",
    guidelines: [
      "Layout horizontal: icon/image kecil + text + CTA",
      "Tombol close di kanan (mini)",
      "Background warna brand kontras",
      "Text ringkas (max 6 kata)",
      "CTA button width 35%",
    ],
  },
};

// ─── User input untuk brief ─────────────────────────────────────────
export interface AdBriefInput {
  clientName: string;
  productOrService: string;
  mainMessage: string;
  callToAction: string;        // contoh: "Pesan Sekarang", "Konsultasi Gratis"
  targetUrl: string;
  slot: AdSlot;
  brandColors?: string[];      // hex array, optional
  brandFonts?: string[];       // optional
  styleHint?: string;          // "modern" | "elegant" | "playful" | "formal" | custom
  additionalNotes?: string;    // free-text user notes
}

// ─── Generator utama ────────────────────────────────────────────────
export function generateClaudeDesignPrompt(brief: AdBriefInput): string {
  const spec = SLOT_SPECS[brief.slot];
  const colors = brief.brandColors?.length ? brief.brandColors.join(", ") : "warna brand klien (silakan pilih dari logo)";
  const fonts = brief.brandFonts?.length ? brief.brandFonts.join(", ") : "Inter atau Poppins (modern sans-serif)";
  const style = brief.styleHint || "modern, clean, conversion-focused";

  return `Buatkan **iklan banner** untuk dipasang di media berita hukum **Jurnalis Hukum Bandung** (jurnalishukumbandung.com).

## Brief Iklan

**Klien:** ${brief.clientName}
**Produk/Jasa:** ${brief.productOrService}
**Pesan Utama:** ${brief.mainMessage}
**Call-to-Action (tombol):** ${brief.callToAction}
**Target URL:** ${brief.targetUrl}

## Spesifikasi Visual (WAJIB diikuti)

- **Dimensi:** ${spec.width} × ${spec.height} pixel (rasio ${spec.aspectRatio})
- **Posisi pemasangan:** ${spec.position}
- **Visibility level:** ${spec.visibility}
- **Tone & feel:** ${spec.tone}

## Brand Identity

- **Warna brand:** ${colors}
- **Font:** ${fonts}
- **Style:** ${style}

## Guidelines Layout

${spec.guidelines.map((g) => `- ${g}`).join("\n")}

## Konteks Audiens

Pembaca media JHB adalah praktisi hukum, jurnalis, mahasiswa hukum, dan masyarakat umum yang mengikuti berita hukum di Bandung & Jawa Barat. Mayoritas dewasa (25-50 tahun), professional. Iklan harus terasa **kredibel dan profesional**, bukan murahan/clickbait.${brief.additionalNotes ? `\n\n## Catatan Tambahan dari Klien\n\n${brief.additionalNotes}` : ""}

## Output yang Diharapkan

Generate **1 iklan banner** dengan dimensi tepat sesuai spec. Format: PNG atau JPG, resolusi tinggi (2x retina kalau bisa).

**Penting:**
- Headline tidak boleh terpotong di edge
- Text minimal 16px supaya readable di mobile
- Kontras warna text/background harus tinggi (WCAG AA min)
- CTA button harus jelas terlihat sebagai tombol (bukan cuma teks)
- Hindari pakai stock photo generik — lebih baik abstract/illustration kalau ga ada foto produk asli

Setelah selesai, aku akan download dan upload ke sistem JHB. Pasangkan di slot "${brief.slot}" dengan target URL ke ${brief.targetUrl}.`;
}

// ─── Helper: dapatkan slot recommendation berdasarkan budget tier ──
export function recommendSlot(budgetTier: "low" | "medium" | "high"): AdSlot[] {
  if (budgetTier === "high") return ["HEADER", "POPUP", "IN_ARTICLE", "FLOATING_BOTTOM"];
  if (budgetTier === "medium") return ["IN_ARTICLE", "SIDEBAR", "BETWEEN_SECTIONS"];
  return ["FOOTER", "BETWEEN_SECTIONS", "SIDEBAR"];
}

// ─── Helper: format dimensions untuk display ─────────────────────
export function formatSlotDimensions(slot: AdSlot): string {
  const s = SLOT_SPECS[slot];
  return `${s.width}×${s.height}px (${s.aspectRatio})`;
}
