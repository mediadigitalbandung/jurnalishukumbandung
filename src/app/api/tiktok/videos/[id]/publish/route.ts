import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { uploadToInbox } from "@/lib/tiktok/tiktok-api";
import { join } from "path";

export const dynamic = "force-dynamic";

/** POST /api/tiktok/videos/:id/publish — publish rendered video to TikTok */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);
    if (video.renderStatus !== "rendered" || !video.renderedUrl) {
      throw new ApiError("Video belum selesai dirender. Render dulu sebelum publish.", 400);
    }

    const settings = await prisma.tiktokSettings.findFirst();
    if (!settings?.enabled) {
      throw new ApiError("Integrasi TikTok belum di-enable di Settings", 400);
    }
    if (!settings.accessToken) {
      throw new ApiError("TikTok belum terhubung. Klik 'Connect TikTok' di Settings.", 400);
    }

    // Resolve local file path from rendered URL
    let localPath: string;
    try {
      const url = new URL(video.renderedUrl);
      localPath = join(process.cwd(), "public", url.pathname);
    } catch {
      throw new ApiError("URL hasil render invalid", 500);
    }

    try {
      const result = await uploadToInbox(localPath);

      await prisma.tiktokVideo.update({
        where: { id: params.id },
        data: {
          publishStatus: "draft_tiktok",
          tiktokPostId: result.publishId,
          publishedAt: new Date(),
          publishError: null,
        },
      });

      return successResponse({
        message: result.message,
        publishId: result.publishId,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Publish gagal";
      await prisma.tiktokVideo.update({
        where: { id: params.id },
        data: {
          publishStatus: "failed",
          publishError: msg.slice(0, 500),
        },
      });
      throw new ApiError(msg, 500);
    }
  } catch (error) {
    return errorResponse(error);
  }
}
