export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  ApiError,
} from "@/lib/api-utils";
import { getSrsStreamStatus, buildHlsUrl } from "@/lib/live";

// GET /api/live/[id]/status
// Lightweight poll endpoint untuk viewer (cek live still going + viewer count)
// dan broadcaster (cek SRS receive stream OK).
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.liveSession.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: {
        id: true,
        slug: true,
        streamKey: true,
        status: true,
        startedAt: true,
        endedAt: true,
        currentViewers: true,
        peakViewers: true,
        viewCount: true,
        recordingUrl: true,
        isPublic: true,
      },
    });
    if (!item) throw new ApiError("Live session tidak ditemukan", 404);
    if (!item.isPublic) {
      // Untuk private session, status bisa di-leak slug. OK saja, hanya status info.
    }

    // Query SRS untuk cek live actual status
    const srs = await getSrsStreamStatus(item.streamKey);

    return successResponse({
      id: item.id,
      slug: item.slug,
      status: item.status,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      hlsUrl: buildHlsUrl(item.streamKey),
      recordingUrl: item.recordingUrl,
      currentViewers: item.currentViewers,
      peakViewers: item.peakViewers,
      viewCount: item.viewCount,
      // SRS-side info (real-time)
      srs: srs
        ? {
            publishing: srs.publishing,
            clients: srs.clients,
            bitrate: srs.bitrate,
            duration: srs.duration,
          }
        : null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/live/[id]/status — viewer ping (untuk track viewer count)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.liveSession.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: { id: true, status: true, currentViewers: true, peakViewers: true, viewCount: true },
    });
    if (!item) throw new ApiError("Not found", 404);

    if (item.status === "LIVE") {
      const newCurrent = item.currentViewers + 1;
      const newPeak = Math.max(item.peakViewers, newCurrent);
      await prisma.liveSession.update({
        where: { id: item.id },
        data: {
          viewCount: { increment: 1 },
          currentViewers: newCurrent,
          peakViewers: newPeak,
        },
      });
    }

    return successResponse({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
