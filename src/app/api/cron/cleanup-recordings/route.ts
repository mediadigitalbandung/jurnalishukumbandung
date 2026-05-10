export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { LIVE_CONFIG } from "@/lib/live";

/**
 * Cron endpoint — auto-purge recording lama (default >90 hari).
 * Dipanggil via cron VPS:
 *   0 4 * * * curl -H 'Authorization: Bearer ...' https://jurnalishukumbandung.com/api/cron/cleanup-recordings
 */
export async function POST(req: NextRequest) {
  return handleCleanup(req);
}
export async function GET(req: NextRequest) {
  return handleCleanup(req);
}

async function handleCleanup(req: NextRequest) {
  // Auth via bearer token (sama seperti cron lain)
  const auth = req.headers.get("authorization");
  if (auth !== "Bearer jhb-cron-secret-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "90");
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const oldRecordings = await prisma.liveSession.findMany({
    where: {
      status: "ARCHIVED",
      endedAt: { lt: cutoff },
      recordingUrl: { not: null },
    },
    select: { id: true, slug: true, recordingUrl: true, recordingSize: true, endedAt: true },
  });

  let purged = 0;
  let bytesFreed = BigInt(0);
  const errors: string[] = [];

  for (const r of oldRecordings) {
    try {
      if (r.recordingUrl) {
        const urlPath = new URL(r.recordingUrl, "https://x").pathname;
        const filename = urlPath.replace(/^\/recordings\//, "");
        const fullPath = path.join(LIVE_CONFIG.recordingDir, filename);
        if (fullPath.startsWith(LIVE_CONFIG.recordingDir)) {
          await fs.unlink(fullPath).catch(() => null);
        }
      }
      await prisma.liveSession.update({
        where: { id: r.id },
        data: {
          recordingUrl: null,
          recordingSize: null,
          status: "ENDED", // turun dari ARCHIVED ke ENDED, recording sudah ga ada
        },
      });
      purged++;
      if (r.recordingSize) bytesFreed += r.recordingSize;
    } catch (e) {
      errors.push(`${r.slug}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return NextResponse.json({
    success: true,
    purged,
    bytesFreed: bytesFreed.toString(),
    cutoffDate: cutoff.toISOString(),
    errors: errors.slice(0, 10),
  });
}
