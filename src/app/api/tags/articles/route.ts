export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "15"));
    const filter = searchParams.get("filter") || "none"; // "all" | "none" | "few"
    const q = searchParams.get("q") || "";

    const where: Record<string, unknown> = { status: "PUBLISHED" };
    if (q) where.title = { contains: q, mode: "insensitive" };

    // Fetch all matching articles (we need to filter by tag count in JS)
    const allArticles = await prisma.article.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        category: { select: { name: true } },
        tags: { select: { id: true, name: true } },
        _count: { select: { tags: true } },
      },
      orderBy: { publishedAt: "desc" },
    });

    // Filter by tag count
    let filtered = allArticles;
    if (filter === "none") {
      filtered = allArticles.filter((a) => a._count.tags < 5);
      filtered.sort((a, b) => a._count.tags - b._count.tags);
    } else if (filter === "few") {
      filtered = allArticles.filter((a) => a._count.tags >= 1 && a._count.tags < 5);
      filtered.sort((a, b) => a._count.tags - b._count.tags);
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return successResponse({
      articles: paginated,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
