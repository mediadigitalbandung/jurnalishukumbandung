import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

// GET /api/seo/status — list all published articles with indexing status
export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all"; // all, submitted, not_submitted, failed
    const search = searchParams.get("q")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 50;

    // Build where clause
    const where: Record<string, unknown> = { status: "PUBLISHED" };
    if (filter === "submitted") where.indexStatus = "submitted";
    else if (filter === "not_submitted") where.OR = [{ indexStatus: null }, { indexStatus: "not_submitted" }];
    else if (filter === "failed") where.indexStatus = "failed";

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const [articles, total, stats] = await Promise.all([
      prisma.article.findMany({
        where,
        select: {
          id: true,
          title: true,
          slug: true,
          publishedAt: true,
          lastIndexedAt: true,
          indexStatus: true,
          viewCount: true,
          category: { select: { name: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
      // Stats
      Promise.all([
        prisma.article.count({ where: { status: "PUBLISHED" } }),
        prisma.article.count({ where: { status: "PUBLISHED", indexStatus: "submitted" } }),
        prisma.article.count({ where: { status: "PUBLISHED", indexStatus: "failed" } }),
        prisma.article.count({
          where: { status: "PUBLISHED", OR: [{ indexStatus: null }, { indexStatus: "not_submitted" }] },
        }),
      ]),
    ]);

    return successResponse({
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        total: stats[0],
        submitted: stats[1],
        failed: stats[2],
        notSubmitted: stats[3],
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
