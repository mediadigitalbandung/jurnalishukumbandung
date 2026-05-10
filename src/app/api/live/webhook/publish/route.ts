export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildHlsUrl } from "@/lib/live";

/**
 * SRS HTTP callback: on_publish
 * Dipanggil saat broadcaster mulai push stream ke SRS.
 * SRS expect response: code=0 untuk allow, code=non-zero untuk reject.
 *
 * Body example: {
 *   action: "on_publish",
 *   client_id: "xxx",
 *   ip: "1.2.3.4",
 *   vhost: "__defaultVhost__",
 *   app: "live",
 *   stream: "<streamKey>",
 *   param: "?...",
 *   tcUrl: "rtmp://..."
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const streamKey: string = body.stream || "";
    if (!streamKey) {
      return NextResponse.json({ code: 400, msg: "no stream key" }, { status: 200 });
    }

    const session = await prisma.liveSession.findUnique({ where: { streamKey } });
    if (!session) {
      // Reject stream yang stream key-nya tidak terdaftar
      console.warn(`[SRS webhook] Reject unknown stream key: ${streamKey}`);
      return NextResponse.json({ code: 401, msg: "unknown stream key" }, { status: 200 });
    }

    // Tolak kalau sesi sudah ARCHIVED/FAILED
    if (["ARCHIVED", "FAILED"].includes(session.status)) {
      console.warn(`[SRS webhook] Reject — session ${session.slug} already ${session.status}`);
      return NextResponse.json({ code: 403, msg: "session ended" }, { status: 200 });
    }

    await prisma.liveSession.update({
      where: { id: session.id },
      data: {
        status: "LIVE",
        startedAt: session.startedAt || new Date(),
        hlsUrl: buildHlsUrl(streamKey),
      },
    });

    console.log(`[SRS webhook] Stream started: ${session.slug} (${streamKey})`);
    return NextResponse.json({ code: 0 }, { status: 200 });
  } catch (e) {
    console.error("[SRS webhook publish] Error:", e);
    // Return code=0 to allow stream anyway (don't block broadcast on DB error)
    return NextResponse.json({ code: 0 }, { status: 200 });
  }
}
