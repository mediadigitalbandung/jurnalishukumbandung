export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { callAI, hasAIKey } from "@/lib/ai-client";

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// GET: generate 3 variasi seoTitle + seoDescription untuk best article keyword
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const target = await prisma.targetKeyword.findUnique({ where: { id: params.id } });
    if (!target) return errorResponse(new Error("Target keyword not found"));
    if (!target.bestArticleId) {
      return errorResponse(new Error("No best article identified — sync GSC dulu"));
    }

    const article = await prisma.article.findUnique({
      where: { id: target.bestArticleId },
      select: {
        id: true,
        slug: true,
        title: true,
        seoTitle: true,
        seoDescription: true,
        excerpt: true,
        content: true,
        category: { select: { name: true } },
      },
    });
    if (!article) return errorResponse(new Error("Best article not found"));

    if (!(await hasAIKey())) {
      return errorResponse(new Error("AI API key belum dikonfigurasi (anthropic/deepseek)"));
    }

    const plainContent = stripHtml(article.content).slice(0, 2000);

    const systemPrompt = `Anda editor SEO profesional untuk portal berita hukum JHB (Jurnalis Hukum Bandung).

Tugas: Generate 3 variasi seoTitle + seoDescription yang OPTIMAL untuk meningkatkan CTR di Google Search.

ATURAN seoTitle:
- 50-60 karakter (TEPAT)
- Mengandung target keyword
- Menarik klik (gunakan: angka, tahun, "Lengkap", "Eksklusif", "Terbaru", power words)
- Bahasa Indonesia jurnalistik
- TIDAK clickbait berlebihan

ATURAN seoDescription:
- 145-155 karakter (TEPAT)
- Hook + benefit + CTA
- Mengandung keyword 1-2x
- Bahasa Indonesia jurnalistik

OUTPUT FORMAT: JSON valid saja, tanpa markdown fence. Schema:
{
  "variants": [
    { "id": 1, "title": "...", "titleLen": 0, "description": "...", "descLen": 0, "angle": "deskripsi singkat angle variant ini" },
    { "id": 2, ...},
    { "id": 3, ...}
  ]
}

3 variants dengan angle berbeda:
- Variant 1: News-style (faktual + tahun)
- Variant 2: Educational (panduan/penjelasan)
- Variant 3: Listicle/specific (angka, breakdown)`;

    const userPrompt = `TARGET KEYWORD: "${target.keyword}"
KATEGORI: ${article.category?.name || "Berita"}

JUDUL ARTIKEL:
${article.title}

seoTitle SEKARANG (${(article.seoTitle || "").length} char):
${article.seoTitle || "(kosong)"}

seoDescription SEKARANG (${(article.seoDescription || "").length} char):
${article.seoDescription || "(kosong)"}

EXCERPT:
${article.excerpt || "(kosong)"}

ISI ARTIKEL (kutipan):
${plainContent}

Generate 3 variasi seoTitle + seoDescription. Hitung titleLen + descLen secara akurat. Output JSON saja.`;

    const aiResponse = await callAI(systemPrompt, userPrompt, 1200, 60000);
    const cleaned = aiResponse
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return errorResponse(new Error(`AI response not valid JSON: ${cleaned.slice(0, 200)}`));
    }

    return successResponse({
      keyword: target.keyword,
      article: {
        id: article.id,
        slug: article.slug,
        title: article.title,
        currentSeoTitle: article.seoTitle,
        currentSeoDesc: article.seoDescription,
      },
      variants: parsed.variants || [],
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST: apply selected variant to article
const applySchema = z.object({
  articleId: z.string().min(1),
  seoTitle: z.string().min(10).max(150),
  seoDescription: z.string().min(50).max(300),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();
    const data = applySchema.parse(body);

    // Verify articleId belongs to this keyword's bestArticle (security check)
    const target = await prisma.targetKeyword.findUnique({ where: { id: params.id } });
    if (!target || target.bestArticleId !== data.articleId) {
      return errorResponse(new Error("Article ID mismatch with keyword's best article"));
    }

    await prisma.article.update({
      where: { id: data.articleId },
      data: {
        seoTitle: data.seoTitle,
        seoDescription: data.seoDescription,
      },
    });

    return successResponse({
      articleId: data.articleId,
      applied: { seoTitle: data.seoTitle, seoDescription: data.seoDescription },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
