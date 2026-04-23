import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { enqueueRender } from "@/lib/tiktok/render-queue";

export const dynamic = "force-dynamic";

/** POST /api/tiktok/videos/:id/render — trigger render */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
      include: { _count: { select: { clips: true } } },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);
    if (video._count.clips === 0) throw new ApiError("Tambahkan minimal 1 clip dulu", 400);

    await enqueueRender(params.id);

    return successResponse({ message: "Render dimulai (background). Refresh untuk cek status." });
  } catch (error) {
    return errorResponse(error);
  }
}

/** GET /api/tiktok/videos/:id/render — check render status */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
      select: {
        renderStatus: true,
        renderedUrl: true,
        renderedSize: true,
        durationSec: true,
        renderError: true,
        renderStartedAt: true,
        renderedAt: true,
      },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);
    return successResponse(video);
  } catch (error) {
    return errorResponse(error);
  }
}
