export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

const schema = z.object({
  clearClips: z.boolean().optional().default(false),
  clearSubtitles: z.boolean().optional().default(false),
  clearTextOverlays: z.boolean().optional().default(false),
  clearOverlays: z.boolean().optional().default(false),
  clearMeta: z.boolean().optional().default(false), // title, caption, hashtags, articleId
});

/**
 * POST /api/tiktok/videos/:id/reset
 * Bulk delete content from a video. Each flag is independent.
 * - clearClips: delete all clips (foto/video sources)
 * - clearSubtitles: delete all timed subtitle entries
 * - clearTextOverlays: clear textOverlay text on all clips (keeps clips intact)
 * - clearOverlays: delete all PNG overlays
 * - clearMeta: reset title placeholder, caption, hashtags, unlink article
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await req.json().catch(() => ({}));
    const data = schema.parse(body);

    const video = await prisma.tiktokVideo.findUnique({ where: { id: params.id } });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);

    const stats = {
      clipsDeleted: 0,
      subtitlesDeleted: 0,
      textOverlaysCleared: 0,
      pngOverlaysDeleted: 0,
      metaCleared: false,
    };

    if (data.clearClips) {
      const r = await prisma.tiktokClip.deleteMany({ where: { videoId: params.id } });
      stats.clipsDeleted = r.count;
    }

    if (data.clearSubtitles) {
      const r = await prisma.tiktokSubtitleEntry.deleteMany({ where: { videoId: params.id } });
      stats.subtitlesDeleted = r.count;
    }

    if (data.clearTextOverlays && !data.clearClips) {
      const r = await prisma.tiktokClip.updateMany({
        where: { videoId: params.id, textOverlay: { not: null } },
        data: { textOverlay: null },
      });
      stats.textOverlaysCleared = r.count;
    }

    if (data.clearOverlays) {
      const r = await prisma.tiktokOverlay.deleteMany({ where: { videoId: params.id } });
      stats.pngOverlaysDeleted = r.count;
      // Also clear deprecated single overlay fields
      await prisma.tiktokVideo.update({
        where: { id: params.id },
        data: { overlayImageUrl: null },
      });
    }

    if (data.clearMeta) {
      await prisma.tiktokVideo.update({
        where: { id: params.id },
        data: {
          caption: null,
          hashtags: [],
          articleId: null,
          // Keep title — required field; user can edit manually
        },
      });
      stats.metaCleared = true;
    }

    return successResponse(stats);
  } catch (error) {
    return errorResponse(error);
  }
}
