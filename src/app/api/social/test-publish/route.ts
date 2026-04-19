import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { publishArticleToSocial } from "@/lib/social/orchestrator";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Manually trigger social media publish for a specific article.
 * Body: { articleId?: string } — if omitted, uses most recent published article with featured image.
 * Admin-only. Useful for testing end-to-end social posting flow.
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const body = await req.json().catch(() => ({}));
    let articleId: string | undefined = body.articleId;

    if (!articleId) {
      const latest = await prisma.article.findFirst({
        where: { status: "PUBLISHED", featuredImage: { not: null } },
        orderBy: { publishedAt: "desc" },
        select: { id: true, title: true },
      });
      if (!latest) {
        return errorResponse(new Error("No published article with featured image found"));
      }
      articleId = latest.id;
    }

    const results = await publishArticleToSocial(articleId);

    return successResponse({
      articleId,
      results,
      summary: results.map((r) => `${r.platform}: ${r.status}${r.errorMessage ? ` (${r.errorMessage})` : ""}`),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
