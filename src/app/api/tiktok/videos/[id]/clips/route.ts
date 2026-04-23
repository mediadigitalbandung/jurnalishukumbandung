import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const createClipSchema = z.object({
  type: z.enum(["video", "image"]),
  sourceUrl: z.string().min(1),
  sourceDuration: z.number().optional().nullable(),
  durationSec: z.number().min(0.5).max(60),
  trimStart: z.number().min(0).optional().nullable(),
  textOverlay: z.string().max(200).optional().nullable(),
  textPosition: z.enum(["top", "center", "bottom"]).optional().nullable(),
  textColor: z.string().optional().nullable(),
  transition: z.enum(["none", "fade", "slide", "zoom"]).optional().nullable(),
  kenBurns: z.boolean().optional(),
});

/** POST /api/tiktok/videos/:id/clips — add a clip to the project */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = createClipSchema.parse(body);

    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
      include: { _count: { select: { clips: true } } },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);

    // Check max duration budget
    const existingClips = await prisma.tiktokClip.findMany({
      where: { videoId: params.id },
      select: { durationSec: true },
    });
    const totalSoFar = existingClips.reduce((sum, c) => sum + c.durationSec, 0);
    const settings = await prisma.tiktokSettings.findFirst();
    const maxDuration = settings?.maxDurationSec || 60;
    if (totalSoFar + data.durationSec > maxDuration) {
      throw new ApiError(
        `Total durasi melebihi ${maxDuration} detik (sekarang ${totalSoFar.toFixed(1)}s + ${data.durationSec}s)`,
        400
      );
    }

    const clip = await prisma.tiktokClip.create({
      data: {
        videoId: params.id,
        order: video._count.clips,
        type: data.type,
        sourceUrl: data.sourceUrl,
        sourceDuration: data.sourceDuration,
        durationSec: data.durationSec,
        trimStart: data.trimStart || null,
        textOverlay: data.textOverlay || null,
        textPosition: data.textPosition || "bottom",
        textColor: data.textColor || "#FFFFFF",
        transition: data.transition || "none",
        kenBurns: data.kenBurns || false,
      },
    });

    return successResponse(clip, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
