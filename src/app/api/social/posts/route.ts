import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/** GET — list social posts with stats, filterable by platform/status */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");   // "instagram" | "facebook" | null
    const status = searchParams.get("status");       // "success" | "failed" | "pending" | null
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 30;

    const where: Record<string, unknown> = {};
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const [posts, total, igSuccess, fbSuccess, igFailed, fbFailed, igDraft, fbDraft] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        include: {
          article: { select: { title: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.socialPost.count({ where }),
      prisma.socialPost.count({ where: { platform: "instagram", status: "success" } }),
      prisma.socialPost.count({ where: { platform: "facebook", status: "success" } }),
      prisma.socialPost.count({ where: { platform: "instagram", status: "failed" } }),
      prisma.socialPost.count({ where: { platform: "facebook", status: "failed" } }),
      prisma.socialPost.count({ where: { platform: "instagram", status: "draft" } }),
      prisma.socialPost.count({ where: { platform: "facebook", status: "draft" } }),
    ]);

    return successResponse({
      posts,
      stats: {
        instagram: { success: igSuccess, failed: igFailed, draft: igDraft },
        facebook: { success: fbSuccess, failed: fbFailed, draft: fbDraft },
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
