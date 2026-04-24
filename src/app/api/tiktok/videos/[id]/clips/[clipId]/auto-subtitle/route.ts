import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { generateSubtitlesForClip, hasWhisperKey } from "@/lib/tiktok/whisper";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Whisper can take up to ~90s for 60s video

/**
 * POST /api/tiktok/videos/:id/clips/:clipId/auto-subtitle
 *
 * Extract audio from clip video and generate timed subtitle segments via OpenAI Whisper.
 * Saves result to TiktokClip.subtitles.
 *
 * Requires OPENAI_API_KEY env or systemSetting key "openai_api_key".
 * Cost: ~$0.006 per minute of video.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; clipId: string } }
) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const hasKey = await hasWhisperKey();
    if (!hasKey) {
      throw new ApiError(
        "OPENAI_API_KEY belum dikonfigurasi. Set di env VPS atau systemSetting 'openai_api_key' untuk enable auto-subtitle.",
        400
      );
    }

    const clip = await prisma.tiktokClip.findUnique({ where: { id: params.clipId } });
    if (!clip || clip.videoId !== params.id) {
      throw new ApiError("Clip tidak ditemukan", 404);
    }

    const segments = await generateSubtitlesForClip(params.clipId);

    return successResponse({
      message: `${segments.length} subtitle segment di-generate`,
      segments,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * DELETE /api/tiktok/videos/:id/clips/:clipId/auto-subtitle
 * Remove all auto-generated subtitles from clip.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; clipId: string } }
) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const clip = await prisma.tiktokClip.findUnique({ where: { id: params.clipId } });
    if (!clip || clip.videoId !== params.id) {
      throw new ApiError("Clip tidak ditemukan", 404);
    }
    await prisma.tiktokClip.update({
      where: { id: params.clipId },
      data: { subtitles: null as unknown as object },
    });
    return successResponse({ message: "Subtitle dihapus" });
  } catch (error) {
    return errorResponse(error);
  }
}
