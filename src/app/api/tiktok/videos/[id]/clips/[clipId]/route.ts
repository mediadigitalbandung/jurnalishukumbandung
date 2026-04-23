import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const updateClipSchema = z.object({
  durationSec: z.number().min(0.5).max(60).optional(),
  trimStart: z.number().min(0).nullable().optional(),
  textOverlay: z.string().max(200).nullable().optional(),
  textPosition: z.enum(["top", "center", "bottom"]).nullable().optional(),
  textColor: z.string().nullable().optional(),
  transition: z.enum(["none", "fade", "slide", "zoom"]).nullable().optional(),
  kenBurns: z.boolean().optional(),
});

/** PUT /api/tiktok/videos/:id/clips/:clipId — edit clip */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; clipId: string } }
) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = updateClipSchema.parse(body);

    const clip = await prisma.tiktokClip.findUnique({ where: { id: params.clipId } });
    if (!clip || clip.videoId !== params.id) throw new ApiError("Clip tidak ditemukan", 404);

    const updated = await prisma.tiktokClip.update({
      where: { id: params.clipId },
      data: {
        ...(data.durationSec !== undefined && { durationSec: data.durationSec }),
        ...(data.trimStart !== undefined && { trimStart: data.trimStart }),
        ...(data.textOverlay !== undefined && { textOverlay: data.textOverlay }),
        ...(data.textPosition !== undefined && { textPosition: data.textPosition }),
        ...(data.textColor !== undefined && { textColor: data.textColor }),
        ...(data.transition !== undefined && { transition: data.transition }),
        ...(data.kenBurns !== undefined && { kenBurns: data.kenBurns }),
      },
    });
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/tiktok/videos/:id/clips/:clipId */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; clipId: string } }
) {
  try {
    await requireAuth();
    const clip = await prisma.tiktokClip.findUnique({ where: { id: params.clipId } });
    if (!clip || clip.videoId !== params.id) throw new ApiError("Clip tidak ditemukan", 404);

    await prisma.tiktokClip.delete({ where: { id: params.clipId } });

    // Reorder remaining clips (compact indices)
    const remaining = await prisma.tiktokClip.findMany({
      where: { videoId: params.id },
      orderBy: { order: "asc" },
    });
    await Promise.all(
      remaining.map((c, i) =>
        c.order !== i
          ? prisma.tiktokClip.update({ where: { id: c.id }, data: { order: i } })
          : Promise.resolve()
      )
    );

    return successResponse({ message: "Clip dihapus" });
  } catch (error) {
    return errorResponse(error);
  }
}
