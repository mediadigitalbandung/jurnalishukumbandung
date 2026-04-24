export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

/** DELETE /api/dictionary/:id — remove entry (admin only) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const existing = await prisma.dictionaryEntry.findUnique({ where: { id: params.id } });
    if (!existing) throw new ApiError("Entry tidak ditemukan", 404);

    await prisma.dictionaryEntry.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
