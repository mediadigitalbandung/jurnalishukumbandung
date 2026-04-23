import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  articleId: z.string().optional().nullable(),
  caption: z.string().max(2000).optional().nullable(),
});

/** GET /api/tiktok/videos — list all video projects */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("renderStatus");
    const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);

    const where: Record<string, unknown> = {};
    if (status) where.renderStatus = status;

    const [videos, total] = await Promise.all([
      prisma.tiktokVideo.findMany({
        where,
        include: {
          _count: { select: { clips: true } },
          backsong: { select: { id: true, name: true } },
          article: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.tiktokVideo.count({ where }),
    ]);

    return successResponse({ videos, total });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/tiktok/videos — create new project */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = createSchema.parse(body);

    const video = await prisma.tiktokVideo.create({
      data: {
        title: data.title,
        caption: data.caption || null,
        articleId: data.articleId || null,
        createdBy: session.user.id,
        createdByName: session.user.name || null,
      },
    });

    return successResponse(video, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
