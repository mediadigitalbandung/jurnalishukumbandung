export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireRole } from "@/lib/api-utils";

// GET /api/comments — list all comments with pagination (admin/editor only)
export async function GET(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const filter = searchParams.get("filter"); // "pending" | "approved" | null (all)

    const where: Record<string, unknown> = {};
    if (filter === "pending") {
      where.isApproved = false;
    } else if (filter === "approved") {
      where.isApproved = true;
    }

    const [comments, total, pendingCount, approvedCount] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          article: {
            select: { title: true, slug: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.comment.count({ where }),
      prisma.comment.count({ where: { isApproved: false } }),
      prisma.comment.count({ where: { isApproved: true } }),
    ]);

    return successResponse({
      comments,
      total,
      pendingCount,
      approvedCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
