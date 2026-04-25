export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

const updateSchema = z.object({
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  scale: z.number().min(0.1).max(3).optional(),
  rotation: z.number().min(-180).max(180).optional(),
  opacity: z.number().min(0).max(1).optional(),
  order: z.number().int().min(0).optional(),
  label: z.string().max(80).optional().nullable(),
});

/** PATCH /api/tiktok/videos/:id/overlays/:overlayId — update position/scale/etc */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; overlayId: string } }
) {
  try {
    await requireAuth();
    const overlay = await prisma.tiktokOverlay.findUnique({ where: { id: params.overlayId } });
    if (!overlay || overlay.videoId !== params.id) {
      throw new ApiError("Overlay tidak ditemukan", 404);
    }
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await prisma.tiktokOverlay.update({
      where: { id: params.overlayId },
      data,
    });
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/tiktok/videos/:id/overlays/:overlayId */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; overlayId: string } }
) {
  try {
    await requireAuth();
    const overlay = await prisma.tiktokOverlay.findUnique({ where: { id: params.overlayId } });
    if (!overlay || overlay.videoId !== params.id) {
      throw new ApiError("Overlay tidak ditemukan", 404);
    }
    await prisma.tiktokOverlay.delete({ where: { id: params.overlayId } });
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
