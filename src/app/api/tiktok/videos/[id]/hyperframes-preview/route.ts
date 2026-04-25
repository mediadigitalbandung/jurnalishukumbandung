/**
 * GET /api/tiktok/videos/:id/hyperframes-preview
 *
 * Returns the generated HyperFrames composition HTML — opens in browser to preview
 * the layout & animations BEFORE running the full render. Useful for debugging
 * composition issues without waiting 1-2 minutes for full render.
 *
 * Returns: text/html
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, errorResponse, ApiError } from "@/lib/api-utils";
import { buildHyperframesComposition } from "@/lib/tiktok/hyperframes/composition";
import type { ClipInput, FrameStyle, RenderSpec, TextPosition, Transition } from "@/lib/tiktok/types";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
      include: {
        clips: { orderBy: { order: "asc" } },
        backsong: true,
        overlays: { orderBy: { order: "asc" } },
        subtitleEntries: { orderBy: { startSec: "asc" } },
      },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);
    if (video.clips.length === 0) {
      throw new ApiError("Belum ada clip — tambahkan minimal 1 clip dulu", 400);
    }

    const clipInputs: ClipInput[] = video.clips.map((c) => ({
      id: c.id,
      order: c.order,
      type: c.type as "video" | "image",
      sourceUrl: c.sourceUrl,
      sourceDuration: c.sourceDuration,
      durationSec: c.durationSec,
      trimStart: c.trimStart,
      textOverlay: c.textOverlay,
      textPosition: (c.textPosition || null) as TextPosition | null,
      textColor: c.textColor,
      textX: c.textX,
      textY: c.textY,
      textFontSize: c.textFontSize,
      textRotation: c.textRotation,
      transition: (c.transition || null) as Transition | null,
      kenBurns: c.kenBurns,
      offsetX: c.offsetX,
      offsetY: c.offsetY,
    }));

    const settings = await prisma.tiktokSettings.findFirst();

    const spec: RenderSpec = {
      videoId: video.id,
      clips: clipInputs,
      backsongUrl: video.backsong?.url,
      backsongVolume: video.backsongVolume,
      outputWidth: settings?.outputWidth || 1080,
      outputHeight: settings?.outputHeight || 1920,
      outputFps: settings?.outputFps || 30,
      maxDurationSec: settings?.maxDurationSec || 60,
      frameStyle: (video.frameStyle || "none") as FrameStyle,
      breakingText: video.breakingText,
      title: video.title,
      multiOverlays: video.overlays.map((o) => ({
        imageUrl: o.imageUrl, x: o.x, y: o.y, scale: o.scale, rotation: o.rotation, opacity: o.opacity, order: o.order,
      })),
      subtitleEntries: video.subtitleEntries.map((s) => ({
        startSec: s.startSec, endSec: s.endSec, text: s.text, y: s.y, fontSize: s.fontSize, color: s.color,
      })),
    };

    const html = buildHyperframesComposition(spec);

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
