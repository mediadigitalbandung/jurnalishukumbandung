import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireRole,
  ApiError,
  logAudit,
} from "@/lib/api-utils";

// PATCH /api/seo/ghost-urls/[id] — update notes / mark resolved manually
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (typeof body.notes === "string") data.notes = body.notes.slice(0, 2000);
    if (body.resolved === true) {
      data.resolved = true;
      data.resolvedAt = new Date();
      data.resolvedBy = session.user.id;
    } else if (body.resolved === false) {
      data.resolved = false;
      data.resolvedAt = null;
      data.resolvedBy = null;
      data.resolvedArticleId = null;
    }

    const updated = await prisma.ghostUrl.update({
      where: { id: params.id },
      data,
    });

    await logAudit(
      session.user.id,
      "UPDATE",
      "ghost_url",
      params.id,
      `Update ghost URL ${updated.slug} (resolved=${updated.resolved})`
    );

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/seo/ghost-urls/[id] — hapus entry (misal kalau bukan slug valid / spam bot)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);

    const ghost = await prisma.ghostUrl.findUnique({ where: { id: params.id } });
    if (!ghost) throw new ApiError("Ghost URL tidak ditemukan", 404);

    await prisma.ghostUrl.delete({ where: { id: params.id } });

    await logAudit(
      session.user.id,
      "DELETE",
      "ghost_url",
      params.id,
      `Hapus ghost URL ${ghost.slug}`
    );

    return successResponse({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
