export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { autoGenerateSorotan } from "@/lib/seo-utils";

/**
 * POST /api/seo/generate-sorotan
 * Body: { articleId: string }
 *
 * Manually trigger sorotan generation for a specific article.
 * Can be called from the article editor.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const body = await req.json();
    const { articleId } = body;

    if (!articleId) {
      throw new ApiError("articleId wajib diisi", 400);
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, slug: true, title: true, content: true },
    });

    if (!article) {
      throw new ApiError("Artikel tidak ditemukan", 404);
    }

    // Generate missing sorotan angles (existing ones are preserved)
    const count = await autoGenerateSorotan(article.id, article.slug, article.title, article.content);

    return successResponse({
      message: `${count} sorotan berhasil di-generate`,
      count,
      articleId,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
