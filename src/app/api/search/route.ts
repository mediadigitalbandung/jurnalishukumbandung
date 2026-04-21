import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { apiRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/search?q=keyword
export async function GET(request: NextRequest) {
  try {
    // Rate limit: 60 req/min per IP (prevents DoS via expensive LIKE queries)
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!apiRateLimit(ip).success) {
      throw new ApiError("Terlalu banyak permintaan. Coba lagi dalam beberapa detik.", 429);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 12;

    if (query.length < 2) {
      return successResponse({ articles: [], total: 0 });
    }

    const where = {
      status: "PUBLISHED" as const,
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { content: { contains: query, mode: "insensitive" as const } },
        { excerpt: { contains: query, mode: "insensitive" as const } },
      ],
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          author: { select: { id: true, name: true, role: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    return successResponse({
      articles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
