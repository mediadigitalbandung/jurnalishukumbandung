import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireRole,
  ApiError,
} from "@/lib/api-utils";

const ALLOWED_ROLES = ["SUPER_ADMIN", "EDITOR"] as const;

// PUT /api/comments/:id — approve/reject (admin/editor only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole([...ALLOWED_ROLES]);

    const body = await request.json();
    const isApproved = body.isApproved === true;

    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
    });
    if (!comment) {
      throw new ApiError("Komentar tidak ditemukan", 404);
    }

    const updated = await prisma.comment.update({
      where: { id: params.id },
      data: { isApproved },
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/comments/:id — delete comment (admin/editor only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole([...ALLOWED_ROLES]);

    const comment = await prisma.comment.findUnique({
      where: { id: params.id },
    });
    if (!comment) {
      throw new ApiError("Komentar tidak ditemukan", 404);
    }

    await prisma.comment.delete({ where: { id: params.id } });

    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
