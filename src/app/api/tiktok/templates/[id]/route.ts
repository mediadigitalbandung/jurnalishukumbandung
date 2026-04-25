export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const template = await prisma.tiktokTemplate.findUnique({
      where: { id: params.id },
      include: {
        overlays: { orderBy: { order: "asc" } },
        backsong: { select: { id: true, name: true } },
      },
    });
    if (!template) throw new ApiError("Template tidak ditemukan", 404);
    return successResponse(template);
  } catch (error) {
    return errorResponse(error);
  }
}

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = patchSchema.parse(body);
    const updated = await prisma.tiktokTemplate.update({
      where: { id: params.id },
      data,
    });
    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    await prisma.tiktokTemplate.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
