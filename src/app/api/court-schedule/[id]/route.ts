import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireRole, ApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// PUT — update
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await request.json();

    const existing = await prisma.courtSchedule.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError("Jadwal tidak ditemukan", 404);

    const schedule = await prisma.courtSchedule.update({
      where: { id: params.id },
      data: {
        ...body,
        date: body.date ? new Date(body.date) : undefined,
      },
    });

    return successResponse(schedule);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    await prisma.courtSchedule.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
