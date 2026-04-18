import { NextRequest } from "next/server";
import { successResponse } from "@/lib/api-utils";
import { callAI } from "@/lib/ai-client";

export const revalidate = 3600; // Cache for 1 hour

// Google Trends RSS geo codes
const GEO_FEEDS = {
  nasional: "https://trends.google.com/trending/rss?geo=ID",
  jabar: "https://trends.google.com/trending/rss?geo=ID-JB",
  bandung: "https://trends.google.com/trending/rss?geo=ID-JB",
};

async function fetchTrendsRSS(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item>\s*<title>(.*?)<\/title>/g);
    if (!items) return [];
    return items
      .slice(0, 15)
      .map((t) => t.replace(/<item>\s*<title>/, "").replace(/<\/title>/, "").trim())
      .filter((t) => t.length > 0);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region"); // "bandung" | "jabar" | "nasional" | null (all)

    if (region && region in GEO_FEEDS) {
      // Single region request
      const rawTrends = await fetchTrendsRSS(GEO_FEEDS[region as keyof typeof GEO_FEEDS]);
      if (rawTrends.length === 0) return successResponse(getFallbackTags(region));

      const aiTags = await filterWithAI(rawTrends, region);
      const tags = (aiTags || rawTrends).slice(0, 12).map((label, i) => ({
        label,
        href: `/search?q=${encodeURIComponent(label)}`,
        hot: i < 3,
        region,
      }));
      return successResponse(tags);
    }

    // Default: fetch all regions in parallel, return grouped
    const [nasionalRaw, jabarRaw] = await Promise.all([
      fetchTrendsRSS(GEO_FEEDS.nasional),
      fetchTrendsRSS(GEO_FEEDS.jabar),
    ]);

    // Combine & deduplicate for AI processing
    const allRaw = Array.from(new Set([...jabarRaw, ...nasionalRaw])).slice(0, 25);

    if (allRaw.length === 0) return successResponse(getFallbackTags());

    const aiTags = await filterWithAI(allRaw, "all");
    const tags = (aiTags || allRaw).slice(0, 12).map((label, i) => ({
      label,
      href: `/search?q=${encodeURIComponent(label)}`,
      hot: i < 3,
    }));
    return successResponse(tags);
  } catch {
    return successResponse(getFallbackTags());
  }
}

async function filterWithAI(trends: string[], region = "all"): Promise<string[] | null> {
  try {
    const regionContext = region === "bandung" || region === "jabar"
      ? `\n- PRIORITASKAN topik yang relevan dengan Bandung dan Jawa Barat (pengadilan Bandung, kebijakan Pemkot/Pemprov Jabar, kasus hukum lokal, DPRD Jabar, dll)
- Tambahkan 2-3 isu hukum lokal Bandung/Jabar yang sedang aktual jika kurang dari 8 tags`
      : region === "nasional"
      ? `\n- Fokus pada isu hukum NASIONAL: MK, MA, DPR RI, KPK, kebijakan pemerintah pusat, UU baru`
      : `\n- Campurkan isu nasional DAN lokal Bandung/Jawa Barat`;

    const prompt = `Kamu adalah editor media hukum "Jurnalis Hukum Bandung". Dari daftar trending topik Google berikut, pilih dan ubah menjadi tags yang RELEVAN dengan dunia hukum, peradilan, politik, kebijakan publik, HAM, korupsi, regulasi, atau isu sosial yang berkaitan dengan hukum di Indonesia.

Daftar trending:
${trends.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Aturan:
- Pilih 8-12 tags yang paling relevan dengan hukum/politik/kebijakan${regionContext}
- Jika topik trending tidak langsung terkait hukum tapi bisa dikaitkan dengan aspek hukumnya, ubah judulnya agar bernuansa hukum (contoh: "Gempa Cianjur" → "Regulasi Bangunan Tahan Gempa", "Banjir Bandung" → "Tanggung Jawab Hukum Banjir Bandung")
- Jika topik sama sekali tidak bisa dikaitkan dengan hukum, SKIP
- Jika kurang dari 5 yang relevan, tambahkan topik hukum yang sedang aktual
- Format output: HANYA daftar tags dipisah baris baru, tanpa nomor, tanpa penjelasan
- Setiap tag maksimal 5 kata`;

    const result = await callAI(
      "Kamu adalah asisten editor untuk media berita hukum Indonesia. Tugasmu mengkurasi trending tags agar relevan dengan portal berita hukum.",
      prompt,
      300
    );

    // Parse: each line is a tag
    const tags = result
      .split("\n")
      .map((line: string) => line.replace(/^\d+[\.\)]\s*/, "").replace(/^[-•]\s*/, "").trim())
      .filter((line: string) => line.length > 0 && line.length <= 40);

    return tags.length > 0 ? tags : null;
  } catch {
    return null;
  }
}

function getFallbackTags(region?: string) {
  const bandungTags = [
    { label: "Pengadilan Bandung", href: "/search?q=pengadilan+bandung", hot: true },
    { label: "DPRD Jabar", href: "/search?q=DPRD+Jabar", hot: true },
    { label: "Korupsi Jabar", href: "/search?q=korupsi+jabar", hot: true },
    { label: "Tipikor Bandung", href: "/search?q=tipikor+bandung", hot: false },
    { label: "Sengketa Lahan Bandung", href: "/search?q=sengketa+lahan+bandung", hot: false },
    { label: "UMK Jabar", href: "/search?q=UMK+Jabar", hot: false },
    { label: "Polrestabes Bandung", href: "/search?q=polrestabes+bandung", hot: false },
    { label: "LBH Bandung", href: "/search?q=LBH+bandung", hot: false },
    { label: "Citarum", href: "/search?q=citarum", hot: false },
    { label: "Pilkada Jabar", href: "/search?q=pilkada+jabar", hot: false },
  ];

  const nasionalTags = [
    { label: "Omnibus Law", href: "/search?q=omnibus+law", hot: true },
    { label: "KPK", href: "/search?q=KPK", hot: true },
    { label: "Pilkada 2026", href: "/search?q=pilkada+2026", hot: true },
    { label: "UU ITE", href: "/search?q=UU+ITE", hot: false },
    { label: "MK Putusan", href: "/search?q=mahkamah+konstitusi", hot: false },
    { label: "Hukum Digital", href: "/search?q=hukum+digital", hot: false },
    { label: "HAM Indonesia", href: "/search?q=HAM+Indonesia", hot: false },
    { label: "Tipikor", href: "/search?q=tipikor", hot: false },
    { label: "RUU Baru", href: "/search?q=RUU+baru", hot: false },
    { label: "Reformasi Hukum", href: "/search?q=reformasi+hukum", hot: false },
  ];

  if (region === "bandung" || region === "jabar") return bandungTags;
  if (region === "nasional") return nasionalTags;

  // Mix both for default
  return [
    ...bandungTags.slice(0, 4),
    ...nasionalTags.slice(0, 4),
    ...bandungTags.slice(4, 6),
    ...nasionalTags.slice(4, 6),
  ];
}
