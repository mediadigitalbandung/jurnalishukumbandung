import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth, ApiError } from "@/lib/api-utils";

// PUT /api/media/[id] — update caption/source
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    const media = await prisma.media.findUnique({ where: { id: params.id } });
    if (!media) throw new ApiError("Media tidak ditemukan", 404);

    const body = await request.json();
    const updated = await prisma.media.update({
      where: { id: params.id },
      data: {
        ...(body.caption !== undefined && { caption: body.caption }),
        ...(body.source !== undefined && { source: body.source }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
