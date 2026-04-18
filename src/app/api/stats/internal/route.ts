import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [
      articlesByStatus,
      totalViews,
      totalComments,
      totalTags,
      totalUsers,
      recentArticles,
      categoryStats,
      topTags,
      topArticlesByViews,
      commentsPerDay,
    ] = await Promise.all([
      // Article counts per status
      prisma.article.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Total views across all articles
      prisma.article.aggregate({
        _sum: { viewCount: true },
      }),

      // Total comments
      prisma.comment.count(),

      // Total tags
      prisma.tag.count(),

      // Total users
      prisma.user.count(),

      // Articles published per day — last 30 days
      prisma.article.findMany({
        where: {
          status: "PUBLISHED",
          publishedAt: { gte: thirtyDaysAgo },
        },
        select: { publishedAt: true },
        orderBy: { publishedAt: "asc" },
      }),

      // Articles per category
      prisma.category.findMany({
        select: {
          name: true,
          _count: { select: { articles: true } },
        },
        orderBy: { articles: { _count: "desc" } },
        take: 12,
      }),

      // Top tags by article count
      prisma.tag.findMany({
        select: {
          name: true,
          _count: { select: { articles: true } },
        },
        orderBy: { articles: { _count: "desc" } },
        take: 20,
      }),

      // Top 10 articles by views
      prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: {
          title: true,
          slug: true,
          viewCount: true,
          publishedAt: true,
          category: { select: { name: true } },
        },
        orderBy: { viewCount: "desc" },
        take: 10,
      }),

      // Comments per day — last 30 days
      prisma.comment.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Build articles-per-day map (last 30 days)
    const articleDayMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(thirtyDaysAgo.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      articleDayMap[key] = 0;
    }
    for (const a of recentArticles) {
      if (!a.publishedAt) continue;
      const key = a.publishedAt.toISOString().slice(0, 10);
      if (key in articleDayMap) articleDayMap[key]++;
    }
    const articlesPerDay = Object.entries(articleDayMap).map(([date, count]) => ({
      date,
      count,
    }));

    // Build comments-per-day map (last 30 days)
    const commentDayMap: Record<string, number> = {};
    for (const key of Object.keys(articleDayMap)) commentDayMap[key] = 0;
    for (const c of commentsPerDay) {
      const key = c.createdAt.toISOString().slice(0, 10);
      if (key in commentDayMap) commentDayMap[key]++;
    }
    const commentsPerDayData = Object.entries(commentDayMap).map(([date, count]) => ({
      date,
      count,
    }));

    // Normalize article status counts
    const statusMap: Record<string, number> = {};
    for (const s of articlesByStatus) {
      statusMap[s.status] = s._count.id;
    }

    return successResponse({
      summary: {
        totalArticles: Object.values(statusMap).reduce((a, b) => a + b, 0),
        publishedArticles: statusMap["PUBLISHED"] || 0,
        draftArticles: statusMap["DRAFT"] || 0,
        reviewArticles: statusMap["IN_REVIEW"] || 0,
        totalViews: totalViews._sum.viewCount || 0,
        totalComments,
        totalTags,
        totalUsers,
      },
      articlesPerDay,
      commentsPerDay: commentsPerDayData,
      categoryStats: categoryStats.map((c) => ({
        name: c.name,
        count: c._count.articles,
      })),
      topTags: topTags.map((t) => ({
        name: t.name,
        count: t._count.articles,
      })),
      topArticlesByViews: topArticlesByViews.map((a) => ({
        title: a.title,
        slug: a.slug,
        views: a.viewCount,
        category: a.category?.name || "-",
        publishedAt: a.publishedAt,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
