export const dynamic = "force-dynamic";

import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const [totalTags, articles] = await Promise.all([
      prisma.tag.count(),
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: { _count: { select: { tags: true } } },
      }),
    ]);

    const noTags = articles.filter((a) => a._count.tags === 0).length;
    const fewTags = articles.filter((a) => a._count.tags >= 1 && a._count.tags < 5).length;
    const goodTags = articles.filter((a) => a._count.tags >= 5).length;

    return successResponse({
      totalTags,
      noTags,
      fewTags,
      goodTags,
      totalArticles: articles.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
