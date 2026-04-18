import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { callAI, hasAIKey } from "@/lib/ai-client";

const SYSTEM_PROMPT = "Kamu adalah SEO specialist untuk media berita hukum Indonesia. Jawab HANYA dengan daftar tag dipisah koma.";

async function generateTagsForArticle(
  article: { id: string; title: string; content: string; tags: { name: string }[]; category: { name: string } | null }
): Promise<string[]> {
  const plainContent = article.content.replace(/<[^>]*>/g, "").slice(0, 1500);
  const prompt = `Berikan 8-10 tag SEO-friendly dalam Bahasa Indonesia untuk artikel berita hukum berikut.
Tag harus:
- Kata kunci yang orang mungkin cari di Google
- Campuran: topik spesifik + lokasi + hukum umum
- Huruf kecil, pisahkan dengan koma
- Jangan ulangi tag yang sudah ada: ${article.tags.map((t) => t.name).join(", ")}

Judul: ${article.title}
Kategori: ${article.category?.name || ""}
Konten: ${plainContent}

Format jawaban HANYA tag dipisah koma, tanpa penjelasan.`;

  const result = await callAI(SYSTEM_PROMPT, prompt, 200);
  return result
    .split(",")
    .map((t: string) => t.trim().toLowerCase())
    .filter((t: string) => t.length > 1 && t.length < 50)
    .slice(0, 10);
}

async function upsertTagsForArticle(articleId: string, newTags: string[]): Promise<number> {
  let added = 0;
  for (const tagName of newTags) {
    const slug = slugify(tagName);
    if (!slug) continue;
    try {
      await prisma.tag.upsert({
        where: { slug },
        update: {},
        create: { name: tagName, slug },
      });
      const existing = await prisma.tag.findUnique({
        where: { slug },
        include: { articles: { where: { id: articleId } } },
      });
      if (existing && existing.articles.length === 0) {
        await prisma.article.update({
          where: { id: articleId },
          data: { tags: { connect: { id: existing.id } } },
        });
        added++;
      }
    } catch { /* skip duplicate or invalid tags */ }
  }
  return added;
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    if (!(await hasAIKey())) throw new ApiError("API Key AI belum dikonfigurasi", 400);

    const body = await req.json().catch(() => ({}));
    const articleId: string | undefined = body?.articleId;

    // ── Single-article mode ──
    if (articleId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: { tags: true, category: true },
      });
      if (!article) throw new ApiError("Artikel tidak ditemukan", 404);

      const newTags = await generateTagsForArticle(article);
      if (newTags.length === 0) {
        return successResponse({ processed: 0, totalTagsAdded: 0, results: [] });
      }
      const added = await upsertTagsForArticle(articleId, newTags);
      return successResponse({
        processed: 1,
        totalTagsAdded: added,
        totalArticles: 1,
        articlesSkipped: 0,
        results: [{ title: article.title, tags: newTags }],
      });
    }

    // ── Bulk mode ──
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      include: { tags: true, category: true },
    });

    const articlesNeedingTags = articles.filter((a) => a.tags.length < 5);
    let processed = 0;
    let totalTagsAdded = 0;
    const results: { title: string; tags: string[] }[] = [];

    for (const article of articlesNeedingTags) {
      try {
        const newTags = await generateTagsForArticle(article);
        if (newTags.length === 0) continue;
        const added = await upsertTagsForArticle(article.id, newTags);
        totalTagsAdded += added;
        results.push({ title: article.title, tags: newTags });
        processed++;
        await new Promise((r) => setTimeout(r, 500));
      } catch { /* skip failed articles */ }
    }

    return successResponse({
      processed,
      totalTagsAdded,
      totalArticles: articles.length,
      articlesSkipped: articles.length - articlesNeedingTags.length,
      results,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
