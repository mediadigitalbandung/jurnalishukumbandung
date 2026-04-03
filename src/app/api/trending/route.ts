import { successResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  try {
    // 1. Fetch Google Trends Daily Search Trends for Indonesia (new URL)
    const googleRes = await fetch(
      "https://trends.google.com/trending/rss?geo=ID",
      { next: { revalidate: 3600 } }
    );

    if (!googleRes.ok) {
      return successResponse(getFallbackTags());
    }

    const xml = await googleRes.text();

    // Parse <item><title>...</title></item> from RSS
    const itemTitles = xml.match(/<item>\s*<title>(.*?)<\/title>/g);

    if (!itemTitles || itemTitles.length === 0) {
      return successResponse(getFallbackTags());
    }

    const rawTrends = itemTitles
      .slice(0, 20) // take up to 20 candidates for AI to filter
      .map((t) => t.replace(/<item>\s*<title>/, "").replace(/<\/title>/, "").trim())
      .filter((t) => t.length > 0);

    if (rawTrends.length === 0) {
      return successResponse(getFallbackTags());
    }

    // 2. Use DeepSeek AI to filter & curate relevant tags
    const aiTags = await filterWithAI(rawTrends);

    if (aiTags && aiTags.length > 0) {
      const tags = aiTags.slice(0, 12).map((label, i) => ({
        label,
        href: `/search?q=${encodeURIComponent(label)}`,
        hot: i < 3,
      }));
      return successResponse(tags);
    }

    // 3. If AI fails, return raw trends as-is
    const tags = rawTrends.slice(0, 12).map((label, i) => ({
      label,
      href: `/search?q=${encodeURIComponent(label)}`,
      hot: i < 3,
    }));
    return successResponse(tags);
  } catch {
    return successResponse(getFallbackTags());
  }
}

async function filterWithAI(trends: string[]): Promise<string[] | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "deepseek_api_key" },
    });

    if (!setting?.value) return null;

    const prompt = `Kamu adalah editor media hukum "Jurnalis Hukum Bandung". Dari daftar trending topik Google Indonesia berikut, pilih dan ubah menjadi tags yang RELEVAN dengan dunia hukum, peradilan, politik, kebijakan publik, HAM, korupsi, regulasi, atau isu sosial yang berkaitan dengan hukum di Indonesia.

Daftar trending:
${trends.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Aturan:
- Pilih 8-12 tags yang paling relevan dengan hukum/politik/kebijakan
- Jika topik trending tidak langsung terkait hukum tapi bisa dikaitkan dengan aspek hukumnya, ubah judulnya agar bernuansa hukum (contoh: "Gempa Cianjur" → "Regulasi Bangunan Tahan Gempa")
- Jika topik sama sekali tidak bisa dikaitkan dengan hukum, SKIP
- Jika kurang dari 5 yang relevan, tambahkan 3-5 topik hukum yang sedang aktual di Indonesia saat ini
- Format output: HANYA daftar tags dipisah baris baru, tanpa nomor, tanpa penjelasan
- Setiap tag maksimal 5 kata`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${setting.value}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Kamu adalah asisten editor untuk media berita hukum Indonesia. Tugasmu mengkurasi trending tags agar relevan dengan portal berita hukum.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || "";

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

function getFallbackTags() {
  return [
    { label: "Omnibus Law", href: "/search?q=omnibus+law", hot: true },
    { label: "KPK", href: "/search?q=KPK", hot: true },
    { label: "Pilkada 2026", href: "/search?q=pilkada+2026", hot: true },
    { label: "UU ITE", href: "/search?q=UU+ITE", hot: false },
    { label: "Korupsi Jabar", href: "/search?q=korupsi+jabar", hot: false },
    { label: "MK Putusan", href: "/search?q=mahkamah+konstitusi", hot: false },
    { label: "Hukum Digital", href: "/search?q=hukum+digital", hot: false },
    { label: "HAM Indonesia", href: "/search?q=HAM+Indonesia", hot: false },
    { label: "Tipikor", href: "/search?q=tipikor", hot: false },
    { label: "Sengketa Lahan", href: "/search?q=sengketa+lahan", hot: false },
    { label: "UMK 2027", href: "/search?q=UMK+2027", hot: false },
    { label: "Citarum", href: "/search?q=citarum", hot: false },
  ];
}
