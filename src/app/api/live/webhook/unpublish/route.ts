export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * SRS HTTP callback: on_unpublish
 * Dipanggil saat broadcaster STOP stream (atau disconnect).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const streamKey: string = body.stream || "";
    if (!streamKey) {
      return NextResponse.json({ code: 0 }, { status: 200 });
    }

    const session = await prisma.liveSession.findUnique({ where: { streamKey } });
    if (!session) {
      return NextResponse.json({ code: 0 }, { status: 200 });
    }

    // Hanya transition LIVE → ENDED. Kalau status sudah ENDED/ARCHIVED, biarkan.
    if (session.status === "LIVE") {
      await prisma.liveSession.update({
        where: { id: session.id },
        data: {
          status: "ENDED",
          endedAt: new Date(),
          currentViewers: 0,
        },
      });
      console.log(`[SRS webhook] Stream ended: ${session.slug}`);
    }

    return NextResponse.json({ code: 0 }, { status: 200 });
  } catch (e) {
    console.error("[SRS webhook unpublish] Error:", e);
    return NextResponse.json({ code: 0 }, { status: 200 });
  }
}
