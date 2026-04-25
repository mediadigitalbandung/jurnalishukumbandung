export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

const createSchema = z.object({
  startSec: z.number().min(0).max(600),
  endSec: z.number().min(0.1).max(600),
  text: z.string().min(1).max(500),
  y: z.number().min(0).max(1).optional().nullable(),
  fontSize: z.number().int().min(16).max(120).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

/** GET — list all subtitle entries for video, sorted by startSec */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const entries = await prisma.tiktokSubtitleEntry.findMany({
      where: { videoId: params.id },
      orderBy: { startSec: "asc" },
    });
    return successResponse(entries);
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST — add new subtitle entry */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const video = await prisma.tiktokVideo.findUnique({ where: { id: params.id } });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);

    const body = await req.json();
    const data = createSchema.parse(body);
    if (data.endSec <= data.startSec) {
      throw new ApiError("End time harus lebih besar dari start time", 400);
    }

    const entry = await prisma.tiktokSubtitleEntry.create({
      data: { videoId: params.id, ...data },
    });
    return successResponse(entry);
  } catch (error) {
    return errorResponse(error);
  }
}
