import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireRole,
} from "@/lib/api-utils";

// GET /api/seo/ghost-urls — list ghost URLs (admin only)
// Query: ?status=open|resolved|all (default open), ?q=search, ?sort=hits|recent|first
export async function GET(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "open";
    const q = (searchParams.get("q") || "").trim();
    const sort = searchParams.get("sort") || "hits";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

    const where: Record<string, unknown> = {};
    if (status === "open") {
      where.resolved = false;
      where.markedDeleted = false;
    } else if (status === "resolved") {
      where.resolved = true;
      where.markedDeleted = false;
    } else if (status === "deleted") {
      where.markedDeleted = true;
    }
    if (q) {
      where.OR = [
        { slug: { contains: q, mode: "insensitive" } },
        { path: { contains: q, mode: "insensitive" } },
      ];
    }

    let orderBy: Record<string, "asc" | "desc"> = { hitCount: "desc" };
    if (sort === "recent") orderBy = { lastHitAt: "desc" };
    else if (sort === "first") orderBy = { firstHitAt: "desc" };

    const [items, openCount, resolvedCount, deletedCount, googleCount, totalHits] = await Promise.all([
      prisma.ghostUrl.findMany({ where, orderBy, take: limit }),
      prisma.ghostUrl.count({ where: { resolved: false, markedDeleted: false } }),
      prisma.ghostUrl.count({ where: { resolved: true, markedDeleted: false } }),
      prisma.ghostUrl.count({ where: { markedDeleted: true } }),
      prisma.ghostUrl.count({ where: { resolved: false, markedDeleted: false, fromGoogle: true } }),
      prisma.ghostUrl.aggregate({
        where: { resolved: false, markedDeleted: false },
        _sum: { hitCount: true },
      }),
    ]);

    // Resolve names for resolvedBy users
    const userIds = Array.from(
      new Set(items.map((i) => i.resolvedBy).filter(Boolean))
    ) as string[];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

    const resolvedArticleIds = Array.from(
      new Set(items.map((i) => i.resolvedArticleId).filter(Boolean))
    ) as string[];
    const articles = resolvedArticleIds.length
      ? await prisma.article.findMany({
          where: { id: { in: resolvedArticleIds } },
          select: { id: true, title: true, slug: true },
        })
      : [];
    const articleMap = Object.fromEntries(articles.map((a) => [a.id, a]));

    return successResponse({
      items: items.map((i) => ({
        ...i,
        resolvedByName: i.resolvedBy ? userMap[i.resolvedBy] || null : null,
        resolvedArticle: i.resolvedArticleId ? articleMap[i.resolvedArticleId] || null : null,
      })),
      stats: {
        open: openCount,
        resolved: resolvedCount,
        deleted: deletedCount,
        googleReferred: googleCount,
        totalHits: totalHits._sum.hitCount || 0,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
