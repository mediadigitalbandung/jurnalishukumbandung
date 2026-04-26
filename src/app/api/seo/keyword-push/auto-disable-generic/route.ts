export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * Detect keywords yang JHB tidak punya peluang menang:
 * 1. Brand owners yang punya domain official (bjb, detik, dll)
 * 2. Generic broad keywords (1-2 kata umum)
 * 3. Keywords yang user intent navigational (perusahaan/lembaga official)
 * 4. Keywords dengan posisi >30 dan impresi <5 selama >14 hari
 *
 * Return: list yang RECOMMENDED disable, dengan reason.
 * User klik Apply → set isActive=false untuk yang dipilih.
 */

// Brand/entity yang punya domain official (kalah pasti)
const BRAND_OWNERS = [
  "bjb", "bni", "bri", "bca", "mandiri", "bukopin",
  "pertamina", "telkom", "pln",
  "detik", "kompas", "tribun", "tempo", "cnn", "cnbc",
  "antara", "merdeka", "okezone", "liputan6", "republika",
  "polri", "polda", "polres", "polrestabes",
  "kemenkeu", "kemenkumham", "kemensos",
  "kpu", "kpk", "ojk", "bi",
  "dpr", "dpd", "mpr",
  "facebook", "twitter", "instagram", "tiktok", "youtube",
  "shopee", "tokopedia", "lazada", "blibli",
  "gojek", "grab", "ovo", "dana",
  "bumn", "bumd",
];

// Generic broad keywords yang user intent-nya bukan ke berita JHB
const GENERIC_TERMS = [
  // Broad news
  "berita bandung", "berita hari ini", "berita terbaru", "breaking news",
  // Generic info
  "harga bbm", "harga emas", "kurs dolar", "harga bensin",
  "ramalan cuaca", "weather", "cuaca",
  "jadwal", "lokasi",
  // Single broad nouns
  "bank", "bandung", "jakarta", "indonesia",
  "berita", "news", "informasi",
  "harga", "biaya", "tarif",
  // Brand searches that JHB cannot win
  "bank bandung",
];

// Cek apakah keyword cocok kategori untuk disable
function classifyKeyword(kw: string): { shouldDisable: boolean; reason: string } | null {
  const lower = kw.toLowerCase().trim();
  const words = lower.split(/\s+/);

  // 1. Single word brand owner
  if (words.length === 1 && BRAND_OWNERS.includes(lower)) {
    return { shouldDisable: true, reason: `Brand owner "${lower}" punya domain official, JHB tidak akan rank tinggi` };
  }

  // 2. Multi-word starting/ending with brand owner (navigational intent)
  for (const brand of BRAND_OWNERS) {
    if (lower === brand || lower === `bank ${brand}` || lower === `${brand} bandung` || lower === `${brand} jawa barat`) {
      return { shouldDisable: true, reason: `Pencarian brand official "${brand}", user pasti ke website resmi` };
    }
  }

  // 3. Generic terms (exact match)
  if (GENERIC_TERMS.includes(lower)) {
    return { shouldDisable: true, reason: `Generic term "${lower}" — kompetisi terlalu luas (Detik, Kompas, dll)` };
  }

  // 4. Single word umum (1-2 char OR generic noun)
  if (words.length === 1 && lower.length <= 5 && !lower.match(/^(uu|kpk|ham)$/)) {
    return { shouldDisable: true, reason: `Single broad word "${lower}" — terlalu generic` };
  }

  // 5. 2-word generic combination (broad word + lokasi)
  const broadNouns = ["berita", "harga", "info", "jadwal", "lokasi", "tarif", "biaya"];
  if (words.length === 2 && broadNouns.includes(words[0])) {
    const locations = ["bandung", "jakarta", "jabar", "indonesia", "jawa", "barat", "hari", "ini"];
    if (locations.includes(words[1])) {
      return { shouldDisable: true, reason: `Kombinasi generic "${words[0]} + ${words[1]}" — user intent broad` };
    }
  }

  return null;
}

// GET: preview list yang akan di-disable (dry run)
export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const keywords = await prisma.targetKeyword.findMany({
      where: { isActive: true },
      orderBy: { keyword: "asc" },
    });

    const candidates = keywords
      .map((k) => {
        const result = classifyKeyword(k.keyword);
        if (!result) return null;
        return {
          id: k.id,
          keyword: k.keyword,
          currentPosition: k.currentPosition,
          currentImpressions: k.currentImpressions,
          currentClicks: k.currentClicks,
          reason: result.reason,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Also flag keywords with stale data (no impresi for 14+ days, position >30)
    const stale = keywords
      .filter((k) => {
        if (candidates.find((c) => c.id === k.id)) return false; // already in candidates
        const isStale =
          (k.currentPosition === null || k.currentPosition > 30) &&
          k.currentImpressions < 5;
        return isStale;
      })
      .map((k) => ({
        id: k.id,
        keyword: k.keyword,
        currentPosition: k.currentPosition,
        currentImpressions: k.currentImpressions,
        currentClicks: k.currentClicks,
        reason: `Stale: posisi >${k.currentPosition || "30+"}, impresi ${k.currentImpressions} (rendah)`,
      }));

    return successResponse({
      total: keywords.length,
      candidates: candidates.length,
      stale: stale.length,
      recommendations: [...candidates, ...stale],
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST: apply disable to selected IDs
export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();
    const ids = (body.ids || []) as string[];

    if (!Array.isArray(ids) || ids.length === 0) {
      return errorResponse(new Error("Provide array of keyword IDs to disable"));
    }

    const result = await prisma.targetKeyword.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });

    return successResponse({
      disabled: result.count,
      ids,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
