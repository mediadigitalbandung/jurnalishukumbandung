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
import { buildWhipUrl, buildHlsUrl, getStunServers } from "@/lib/live";

// POST /api/live/[id]/start
// Broadcaster click "Mulai Live" — kembalikan info WHIP supaya browser
// bisa langsung kirim WebRTC offer ke SRS. Status di DB jadi LIVE setelah
// SRS webhook 'on_publish' fire.
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
      throw new ApiError("Tidak punya akses untuk start live ini", 403);
    }

    if (item.status === "LIVE") {
      // Allow re-start (kasus reconnect setelah disconnect)
    } else if (item.status === "ARCHIVED" || item.status === "ENDED") {
      throw new ApiError(
        "Live ini sudah selesai. Buat live baru kalau mau streaming lagi.",
        400
      );
    }

    // Kembalikan info WHIP untuk client-side broadcaster
    return successResponse({
      sessionId: item.id,
      slug: item.slug,
      streamKey: item.streamKey,
      whipUrl: buildWhipUrl(item.streamKey),
      hlsUrl: buildHlsUrl(item.streamKey),
      iceServers: getStunServers(),
      title: item.title,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
