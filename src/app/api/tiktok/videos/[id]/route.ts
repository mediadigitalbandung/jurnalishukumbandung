import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { unlink } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  caption: z.string().max(2000).optional().nullable(),
  hashtags: z.array(z.string()).optional(),
  backsongId: z.string().nullable().optional(),
  backsongVolume: z.number().min(0).max(1).optional(),
  articleId: z.string().nullable().optional(),
  frameStyle: z.enum(["none", "ticker-news", "brand-green", "breaking-news", "minimal", "lower-third"]).optional(),
  breakingText: z.string().max(200).optional().nullable(),
});

/** GET /api/tiktok/videos/:id */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
      include: {
        clips: { orderBy: { order: "asc" } },
        backsong: true,
        article: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);
    return successResponse(video);
  } catch (error) {
    return errorResponse(error);
  }
}

/** PUT /api/tiktok/videos/:id — update metadata (title, caption, backsong) */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.tiktokVideo.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError("Video tidak ditemukan", 404);

    const updated = await prisma.tiktokVideo.update({
      where: { id: params.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.caption !== undefined && { caption: data.caption }),
        ...(data.hashtags !== undefined && { hashtags: data.hashtags }),
        ...(data.backsongId !== undefined && { backsongId: data.backsongId }),
        ...(data.backsongVolume !== undefined && { backsongVolume: data.backsongVolume }),
        ...(data.articleId !== undefined && { articleId: data.articleId }),
        ...(data.frameStyle !== undefined && { frameStyle: data.frameStyle }),
        ...(data.breakingText !== undefined && { breakingText: data.breakingText }),
      },
      include: {
        clips: { orderBy: { order: "asc" } },
        backsong: true,
      },
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/tiktok/videos/:id */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
      include: { clips: true },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);

    // Delete rendered output file (best-effort)
    if (video.renderedUrl) {
      try {
        const url = new URL(video.renderedUrl);
        const p = join(process.cwd(), "public", url.pathname);
        await unlink(p).catch(() => {});
      } catch { /* ignore */ }
    }

    // Delete video (cascade removes clips)
    await prisma.tiktokVideo.delete({ where: { id: params.id } });

    return successResponse({ message: "Video dihapus" });
  } catch (error) {
    return errorResponse(error);
  }
}
