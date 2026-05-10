export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { LIVE_CONFIG, buildRecordingUrl } from "@/lib/live";

/**
 * SRS HTTP callback: on_dvr
 * Dipanggil saat SRS selesai write file MP4 ke disk.
 *
 * Body: {
 *   action: "on_dvr",
 *   stream: "<streamKey>",
 *   file: "/recordings/live/<key>_<ts>.mp4",
 *   ...
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const streamKey: string = body.stream || "";
    const filePath: string = body.file || "";

    if (!streamKey || !filePath) {
      return NextResponse.json({ code: 0 }, { status: 200 });
    }

    const session = await prisma.liveSession.findUnique({ where: { streamKey } });
    if (!session) {
      return NextResponse.json({ code: 0 }, { status: 200 });
    }

    // Extract relative path: "/recordings/live/abc.mp4" → "live/abc.mp4"
    const relPath = filePath.replace(/^\/recordings\//, "");

    // Cek file size & duration
    const fullPath = path.join(LIVE_CONFIG.recordingDir, relPath);
    let size: bigint | null = null;
    try {
      const stat = await fs.stat(fullPath);
      size = BigInt(stat.size);
    } catch {
      // file might not exist yet (race condition) — try later
    }

    // Hitung durasi dari startedAt → endedAt (perkiraan, bukan exact)
    let duration: number | null = null;
    if (session.startedAt) {
      const endTime = session.endedAt || new Date();
      duration = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);
    }

    await prisma.liveSession.update({
      where: { id: session.id },
      data: {
        status: "ARCHIVED",
        recordingUrl: buildRecordingUrl(relPath),
        recordingSize: size,
        recordingDuration: duration,
        // Pastikan endedAt ter-set
        endedAt: session.endedAt || new Date(),
      },
    });

    console.log(`[SRS webhook] Recording saved: ${session.slug} → ${relPath} (${size || "?"} bytes)`);
    return NextResponse.json({ code: 0 }, { status: 200 });
  } catch (e) {
    console.error("[SRS webhook dvr] Error:", e);
    return NextResponse.json({ code: 0 }, { status: 200 });
  }
}
