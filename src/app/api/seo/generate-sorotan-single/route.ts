import { NextRequest } from "next/server";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const SOROTAN_ANGLES = [
  { angle: "kronologi", titlePrefix: "Kronologi", prompt: (t: string, c: string) => `Kamu adalah jurnalis hukum senior. Tulis KRONOLOGI LENGKAP kejadian dalam 400-500 kata bahasa Indonesia berdasarkan berita ini. Tulis narasi kronologis yang runtut. Sertakan detail waktu, tempat, pelaku. Tulis dalam format HTML (<p>, <h3>, <ul>). JANGAN gunakan markdown. Langsung mulai narasi tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
  { angle: "analisis", titlePrefix: "Analisis Hukum", prompt: (t: string, c: string) => `Kamu adalah analis hukum senior Indonesia. Tulis ANALISIS HUKUM dalam 400-500 kata bahasa Indonesia. Bahas dasar hukum, pasal yang relevan, potensi sanksi, preseden kasus serupa, implikasi yuridis. Tulis dalam format HTML. Langsung mulai analisis tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
  { angle: "dampak", titlePrefix: "Dampak & Implikasi", prompt: (t: string, c: string) => `Kamu jurnalis investigasi. Tulis DAMPAK DAN IMPLIKASI kejadian ini dalam 400-500 kata bahasa Indonesia. Bahas siapa yang terdampak, dampak ke masyarakat, dampak ke sistem hukum, apa yang bisa terjadi selanjutnya. Tulis dalam format HTML. Langsung mulai tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
  { angle: "latar-belakang", titlePrefix: "Latar Belakang", prompt: (t: string, c: string) => `Kamu jurnalis senior. Tulis LATAR BELAKANG dan KONTEKS dari berita ini dalam 400-500 kata bahasa Indonesia. Jelaskan apa yang terjadi sebelumnya, mengapa ini terjadi, siapa pihak-pihak yang terlibat. Tulis dalam format HTML. Langsung mulai tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
  { angle: "fakta-data", titlePrefix: "Fakta & Data", prompt: (t: string, c: string) => `Kamu editor berita. Tulis RANGKUMAN FAKTA DAN DATA KUNCI dari berita ini dalam 400-500 kata bahasa Indonesia. Sajikan fakta-fakta penting secara terstruktur: 5W+1H. Sertakan angka dan data. Tulis dalam format HTML. Langsung mulai tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
  { angle: "regulasi", titlePrefix: "Regulasi Terkait", prompt: (t: string, c: string) => `Kamu pakar hukum Indonesia. Tulis tentang REGULASI DAN UNDANG-UNDANG yang terkait dengan kasus dalam berita ini dalam 400-500 kata bahasa Indonesia. Sebutkan UU, pasal, peraturan. Tulis dalam format HTML. Langsung mulai tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
  { angle: "profil", titlePrefix: "Profil & Pihak Terkait", prompt: (t: string, c: string) => `Kamu jurnalis. Tulis PROFIL PIHAK-PIHAK yang terlibat dalam berita ini dalam 400-500 kata bahasa Indonesia. Jelaskan siapa saja, peran, latar belakang. Tulis dalam format HTML. Langsung mulai tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
  { angle: "opini", titlePrefix: "Perspektif & Opini Ahli", prompt: (t: string, c: string) => `Kamu kolumnis hukum. Tulis PERSPEKTIF DAN OPINI mengenai kasus ini dalam 400-500 kata bahasa Indonesia. Sajikan berbagai sudut pandang. Tulis dalam format HTML. Langsung mulai tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
  { angle: "perbandingan", titlePrefix: "Perbandingan Kasus Serupa", prompt: (t: string, c: string) => `Kamu peneliti hukum. Tulis PERBANDINGAN dengan kasus-kasus serupa di Indonesia dalam 400-500 kata bahasa Indonesia. Tulis dalam format HTML. Langsung mulai tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
  { angle: "tanya-jawab", titlePrefix: "Tanya Jawab", prompt: (t: string, c: string) => `Kamu editor berita. Tulis penjelasan berita ini dalam format TANYA JAWAB (Q&A) dalam 400-500 kata bahasa Indonesia. Buat 5-7 pertanyaan dan jawaban. Tulis dalam format HTML (<p>, <strong>). Langsung mulai tanpa judul.\n\nJudul: ${t}\nKonten: ${c}` },
];

// POST /api/seo/generate-sorotan-single — generate ONE sorotan at a time
export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const body = await req.json();
    const { articleId, angleIndex } = body as { articleId: string; angleIndex: number };

    if (!articleId || angleIndex === undefined) {
      throw new ApiError("articleId dan angleIndex diperlukan", 400);
    }
    if (angleIndex < 0 || angleIndex >= SOROTAN_ANGLES.length) {
      throw new ApiError("angleIndex tidak valid (0-9)", 400);
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, slug: true, title: true, content: true },
    });
    if (!article) throw new ApiError("Artikel tidak ditemukan", 404);

    const setting = await prisma.systemSetting.findUnique({
      where: { key: "deepseek_api_key" },
    });
    if (!setting?.value) throw new ApiError("DeepSeek API key belum dikonfigurasi", 400);

    const angle = SOROTAN_ANGLES[angleIndex];
    const plainContent = article.content?.replace(/<[^>]*>/g, "").slice(0, 4000) || "";

    // Call DeepSeek
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    let generatedContent = "";
    try {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${setting.value}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "Kamu adalah jurnalis hukum profesional Indonesia. Tulis konten dalam Bahasa Indonesia. Gunakan format HTML (<p>, <h3>, <ul>, <li>, <blockquote>, <strong>). JANGAN gunakan markdown." },
            { role: "user", content: angle.prompt(article.title, plainContent) },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      generatedContent = data.choices?.[0]?.message?.content?.trim() || "";
    } finally {
      clearTimeout(timeout);
    }

    if (!generatedContent || generatedContent.length < 100) {
      throw new ApiError("AI gagal generate konten yang cukup", 500);
    }

    const sorotanTitle = `${angle.titlePrefix}: ${article.title}`;
    const sorotanSlug = `${article.slug}-${angle.angle}`;

    // Upsert sorotan (create or update)
    const sorotan = await prisma.sorotan.upsert({
      where: { slug: sorotanSlug },
      update: { title: sorotanTitle, content: generatedContent },
      create: {
        slug: sorotanSlug,
        title: sorotanTitle,
        content: generatedContent,
        angle: angle.angle,
        articleId: article.id,
      },
    });

    return successResponse({
      sorotan: {
        id: sorotan.id,
        slug: sorotan.slug,
        title: sorotan.title,
        content: generatedContent,
        angle: angle.angle,
        angleLabel: angle.titlePrefix,
      },
      angleIndex,
      totalAngles: SOROTAN_ANGLES.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// GET — list available angles + existing sorotan for an article
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get("articleId");
    if (!articleId) throw new ApiError("articleId diperlukan", 400);

    const existing = await prisma.sorotan.findMany({
      where: { articleId },
      select: { id: true, slug: true, title: true, content: true, angle: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    const angles = SOROTAN_ANGLES.map((a, i) => {
      const found = existing.find((e) => e.angle === a.angle);
      return {
        index: i,
        angle: a.angle,
        label: a.titlePrefix,
        generated: !!found,
        sorotan: found || null,
      };
    });

    return successResponse({
      angles,
      generated: existing.length,
      total: SOROTAN_ANGLES.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
