export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
  ApiError,
  logAudit,
} from "@/lib/api-utils";

// POST /api/live/[id]/end
// Broadcaster click "Selesai" — set status ENDED, finalize startedAt/endedAt.
// Recording finalization handled async by SRS DVR webhook (on_dvr).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const item = await prisma.liveSession.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    });
    if (!item) throw new ApiError("Live session tidak ditemukan", 404);

    const isOwner = session.user.id === item.broadcasterId;
    const isAdmin = ["SUPER_ADMIN", "EDITOR"].includes(session.user.role);
    if (!isOwner && !isAdmin) {
      throw new ApiError("Tidak punya akses untuk end live ini", 403);
    }

    if (item.status !== "LIVE" && item.status !== "SCHEDULED") {
      throw new ApiError(`Live ini sudah ${item.status.toLowerCase()}`, 400);
    }

    const updated = await prisma.liveSession.update({
      where: { id: item.id },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        currentViewers: 0,
      },
    });

    await logAudit(
      session.user.id,
      "UPDATE",
      "live_session",
      item.id,
      `End live session: ${item.title}`
    );

    return successResponse({
      ok: true,
      session: updated,
      message: "Live berhasil diakhiri. Recording sedang diproses, akan tersedia dalam beberapa menit.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
