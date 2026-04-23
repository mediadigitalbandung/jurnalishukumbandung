import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  clipIds: z.array(z.string()),
});

/** POST /api/tiktok/videos/:id/clips/reorder — reorder clips by new ID sequence */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await req.json();
    const { clipIds } = reorderSchema.parse(body);

    const existing = await prisma.tiktokClip.findMany({
      where: { videoId: params.id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((c) => c.id));
    if (clipIds.length !== existing.length || !clipIds.every((id) => existingIds.has(id))) {
      throw new ApiError("Daftar clip ID tidak sesuai", 400);
    }

    await Promise.all(
      clipIds.map((id, order) =>
        prisma.tiktokClip.update({ where: { id }, data: { order } })
      )
    );

    const reordered = await prisma.tiktokClip.findMany({
      where: { videoId: params.id },
      orderBy: { order: "asc" },
    });
    return successResponse(reordered);
  } catch (error) {
    return errorResponse(error);
  }
}
