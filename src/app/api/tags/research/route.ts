import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireRole, ApiError } from "@/lib/api-utils";
import { callAI, hasAIKey } from "@/lib/ai-client";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "Kamu adalah SEO specialist untuk media berita hukum lokal Bandung/Jawa Barat. Tugasmu mengusulkan keyword SEO yang sedang banyak dicari (trending mindset) terkait hukum, hukum pidana, hukum perdata, peradilan, kriminalitas, korupsi, dan isu hukum lokal di Bandung & Jawa Barat. Jawab HANYA dalam format JSON yang diminta.";

interface ResearchedKeyword {
  keyword: string;
  notes: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    if (!(await hasAIKey())) {
      throw new ApiError("API Key AI belum dikonfigurasi", 400);
    }

    const body = await request.json().catch(() => ({}));
    const count = Math.min(Math.max(Number(body.count) || 15, 5), 25);
    const extraContext: string | undefined = body.context;

    // Ambil judul 30 artikel terbaru sebagai konteks (biar AI tahu apa yg lagi dibahas di site)
    const recentArticles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { title: true, category: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
      take: 30,
    });

    // Ambil keyword yang sudah ada di DB supaya AI tidak duplikasi
    const existing = await prisma.targetKeyword.findMany({
      select: { keyword: true },
    });
    const existingList = existing.map((e) => e.keyword).join(", ");

    const articlesContext = recentArticles
      .map((a) => `- [${a.category?.name || "?"}] ${a.title}`)
      .join("\n");

    const userPrompt = `Usulkan ${count} keyword SEO Bahasa Indonesia yang RELEVAN untuk media berita hukum lokal Bandung/Jawa Barat.

Fokus utama:
- Istilah hukum + lokasi Bandung/Jawa Barat (contoh: "sidang PN Bandung", "kejati jabar")
- Isu hukum aktual: korupsi, tipikor, narkoba, KDRT, fraud, pidana, perdata
- Entitas lokal: Polda Jabar, Kejati Jabar, Pengadilan Tinggi Bandung, Kemenkumham Jabar, MA RI
- Topik yang sedang ramai dibahas masyarakat (tren opini publik)
- Long-tail keyword dengan intent informasional (contoh: "cara lapor korupsi di bandung")

Konteks artikel terbaru di website (biar keyword nyambung):
${articlesContext || "(belum ada artikel)"}

${extraContext ? `\nKonteks tambahan dari admin: ${extraContext}\n` : ""}

Hindari keyword yang sudah ada di database ini: ${existingList || "(kosong)"}

Aturan:
- Setiap keyword: 2-6 kata, huruf kecil semua
- Relevan untuk audience Bandung/Jawa Barat
- Campuran: topik umum (20%) + topik spesifik daerah (80%)
- Notes singkat (max 100 karakter) jelaskan kenapa keyword ini potensial

Balas HANYA dalam format JSON berikut tanpa penjelasan apapun:
{"keywords":[{"keyword":"kata kunci","notes":"alasan singkat"},...]}`;

    const text = await callAI(SYSTEM_PROMPT, userPrompt, 1500, 45000);

    let parsed: { keywords: ResearchedKeyword[] };
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("no JSON");
      parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.keywords)) throw new Error("invalid structure");
    } catch {
      throw new ApiError("AI gagal generate keyword (format tidak valid)", 500);
    }

    // Normalisasi + filter duplikat terhadap existing
    const existingSet = new Set(existing.map((e) => e.keyword));
    const cleaned = parsed.keywords
      .map((k) => ({
        keyword: String(k.keyword || "").trim().toLowerCase(),
        notes: String(k.notes || "").trim().slice(0, 200),
      }))
      .filter((k) => k.keyword.length >= 3 && k.keyword.length <= 100)
      .filter((k) => !existingSet.has(k.keyword));

    return successResponse({ keywords: cleaned, total: cleaned.length });
  } catch (err) {
    return errorResponse(err);
  }
}
