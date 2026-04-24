/**
 * Simple in-process render queue for TikTok videos.
 * Limits to 1 concurrent render (FFmpeg is CPU-intensive on PM2 cluster).
 *
 * For multi-instance PM2, this queue runs per-instance. Since DB is shared,
 * we check renderStatus = 'rendering' to prevent duplicate work across instances.
 */

import { prisma } from "@/lib/prisma";
import { renderTiktokVideo } from "./ffmpeg-renderer";
import type { ClipInput, FrameStyle, TextPosition, Transition } from "./types";

let isProcessing = false;

/**
 * Enqueue a video for rendering. Sets renderStatus = 'queued' immediately,
 * then processes it asynchronously. Returns immediately — doesn't wait.
 */
export async function enqueueRender(videoId: string): Promise<void> {
  const video = await prisma.tiktokVideo.findUnique({
    where: { id: videoId },
    include: { clips: true, backsong: true },
  });
  if (!video) throw new Error("Video tidak ditemukan");
  if (video.renderStatus === "rendering") throw new Error("Video sedang dirender");
  if (video.clips.length === 0) throw new Error("Belum ada clip di project ini");

  await prisma.tiktokVideo.update({
    where: { id: videoId },
    data: {
      renderStatus: "queued",
      renderError: null,
      renderStartedAt: null,
      renderedAt: null,
    },
  });

  // Kick off processing (don't await — async background)
  processNext().catch((err) => {
    console.error("[TIKTOK-QUEUE] processNext error:", err);
  });
}

async function processNext(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      const next = await prisma.tiktokVideo.findFirst({
        where: { renderStatus: "queued" },
        orderBy: { createdAt: "asc" },
        include: { clips: { orderBy: { order: "asc" } }, backsong: true },
      });
      if (!next) break;

      // Mark as rendering
      await prisma.tiktokVideo.update({
        where: { id: next.id },
        data: { renderStatus: "rendering", renderStartedAt: new Date() },
      });

      const clipInputs: ClipInput[] = next.clips.map((c) => ({
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
      }));

      const settings = await prisma.tiktokSettings.findFirst();

      const result = await renderTiktokVideo({
        videoId: next.id,
        clips: clipInputs,
        backsongUrl: next.backsong?.url,
        backsongVolume: next.backsongVolume,
        outputWidth: settings?.outputWidth || 1080,
        outputHeight: settings?.outputHeight || 1920,
        outputFps: settings?.outputFps || 30,
        maxDurationSec: settings?.maxDurationSec || 60,
        frameStyle: (next.frameStyle || "none") as FrameStyle,
        breakingText: next.breakingText,
        title: next.title,
        customOverlay: next.overlayImageUrl
          ? {
              imageUrl: next.overlayImageUrl,
              x: next.overlayX,
              y: next.overlayY,
              scale: next.overlayScale,
              rotation: next.overlayRotation,
              opacity: next.overlayOpacity,
            }
          : null,
      });

      if (result.success) {
        await prisma.tiktokVideo.update({
          where: { id: next.id },
          data: {
            renderStatus: "rendered",
            renderedUrl: result.outputUrl,
            renderedSize: result.sizeBytes,
            durationSec: result.durationSec,
            renderedAt: new Date(),
            renderError: null,
          },
        });
      } else {
        await prisma.tiktokVideo.update({
          where: { id: next.id },
          data: {
            renderStatus: "failed",
            renderError: result.error || "Unknown error",
          },
        });
      }
    }
  } finally {
    isProcessing = false;
  }
}

/** On server startup, resume any "rendering" state stuck from previous crash */
export async function resumeStuckRenders(): Promise<void> {
  try {
    await prisma.tiktokVideo.updateMany({
      where: { renderStatus: "rendering" },
      data: { renderStatus: "queued" },
    });
    processNext().catch(() => {});
  } catch (err) {
    console.error("[TIKTOK-QUEUE] resume error:", err);
  }
}
