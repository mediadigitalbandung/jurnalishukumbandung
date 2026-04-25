export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

const updateSchema = z.object({
  startSec: z.number().min(0).max(600).optional(),
  endSec: z.number().min(0.1).max(600).optional(),
  text: z.string().min(1).max(500).optional(),
  y: z.number().min(0).max(1).optional().nullable(),
  fontSize: z.number().int().min(16).max(120).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    await requireAuth();
    const entry = await prisma.tiktokSubtitleEntry.findUnique({ where: { id: params.entryId } });
    if (!entry || entry.videoId !== params.id) throw new ApiError("Subtitle tidak ditemukan", 404);

    const body = await req.json();
    const data = updateSchema.parse(body);
    if (data.startSec !== undefined && data.endSec !== undefined && data.endSec <= data.startSec) {
      throw new ApiError("End time harus lebih besar dari start time", 400);
    }

    const updated = await prisma.tiktokSubtitleEntry.update({
      where: { id: params.entryId },
      data,
    });
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    await requireAuth();
    const entry = await prisma.tiktokSubtitleEntry.findUnique({ where: { id: params.entryId } });
    if (!entry || entry.videoId !== params.id) throw new ApiError("Subtitle tidak ditemukan", 404);
    await prisma.tiktokSubtitleEntry.delete({ where: { id: params.entryId } });
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
