export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

const createSchema = z.object({
  imageUrl: z.string().url().max(500),
  x: z.number().min(0).max(1).default(0.5),
  y: z.number().min(0).max(1).default(0.5),
  scale: z.number().min(0.1).max(3).default(1),
  rotation: z.number().min(-180).max(180).default(0),
  opacity: z.number().min(0).max(1).default(1),
  label: z.string().max(80).optional(),
});

/** GET /api/tiktok/videos/:id/overlays — list all overlays for video */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const overlays = await prisma.tiktokOverlay.findMany({
      where: { videoId: params.id },
      orderBy: { order: "asc" },
    });
    return successResponse(overlays);
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/tiktok/videos/:id/overlays — add new overlay */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const video = await prisma.tiktokVideo.findUnique({ where: { id: params.id } });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);

    const body = await req.json();
    const data = createSchema.parse(body);

    // Auto-assign next order
    const maxOrder = await prisma.tiktokOverlay.aggregate({
      where: { videoId: params.id },
      _max: { order: true },
    });

    const overlay = await prisma.tiktokOverlay.create({
      data: {
        videoId: params.id,
        ...data,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    return successResponse(overlay);
  } catch (error) {
    return errorResponse(error);
  }
}
