export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

/** GET — list all active templates, sorted by lastUsedAt desc */
export async function GET() {
  try {
    await requireAuth();
    const templates = await prisma.tiktokTemplate.findMany({
      where: { isActive: true },
      include: {
        overlays: { orderBy: { order: "asc" } },
        backsong: { select: { id: true, name: true } },
        _count: undefined,
      },
      orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
    });
    return successResponse(templates);
  } catch (error) {
    return errorResponse(error);
  }
}

const createFromVideoSchema = z.object({
  videoId: z.string().min(1),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

/**
 * POST — create template from existing video.
 * Captures frame style, subtitle config, overlays, backsong, default text style
 * (sampled from first clip with text overlay if any).
 * Does NOT capture clips or subtitle entries (those are per-video content).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = createFromVideoSchema.parse(body);

    const video = await prisma.tiktokVideo.findUnique({
      where: { id: data.videoId },
      include: {
        overlays: { orderBy: { order: "asc" } },
        clips: { where: { textOverlay: { not: null } }, orderBy: { order: "asc" }, take: 1 },
      },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);

    // Sample default text style from first clip with text overlay (if any)
    const sampleClip = video.clips[0];

    const template = await prisma.tiktokTemplate.create({
      data: {
        name: data.name,
        description: data.description || null,
        frameStyle: video.frameStyle,
        breakingText: video.breakingText,
        subtitleEnabled: video.subtitleEnabled,
        subtitleY: video.subtitleY,
        subtitleFontSize: video.subtitleFontSize,
        defaultTextColor: sampleClip?.textColor || "#FFFFFF",
        defaultTextX: sampleClip?.textX ?? null,
        defaultTextY: sampleClip?.textY ?? null,
        defaultTextFontSize: sampleClip?.textFontSize ?? 54,
        defaultTextRotation: sampleClip?.textRotation ?? 0,
        defaultTextPosition: sampleClip?.textPosition || "bottom",
        backsongId: video.backsongId,
        backsongVolume: video.backsongVolume,
        createdBy: session.user.id,
        createdByName: session.user.name || session.user.email || null,
        overlays: {
          create: video.overlays.map((o) => ({
            imageUrl: o.imageUrl,
            x: o.x,
            y: o.y,
            scale: o.scale,
            rotation: o.rotation,
            opacity: o.opacity,
            order: o.order,
            label: o.label,
          })),
        },
      },
      include: { overlays: true },
    });

    return successResponse(template);
  } catch (error) {
    return errorResponse(error);
  }
}
