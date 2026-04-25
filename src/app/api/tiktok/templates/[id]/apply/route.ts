export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

const schema = z.object({
  videoId: z.string().min(1),
  // What to apply (default all true)
  applyFrame: z.boolean().optional().default(true),
  applySubtitleStyle: z.boolean().optional().default(true),
  applyOverlays: z.boolean().optional().default(true),
  applyBacksong: z.boolean().optional().default(true),
  applyTextStyleToClips: z.boolean().optional().default(true),
  // If true, deletes existing PNG overlays before adding template's
  replaceOverlays: z.boolean().optional().default(true),
  // If true, creates placeholder clips from template slots (replaces existing clips)
  applySlotStructure: z.boolean().optional().default(false),
});

/**
 * POST /api/tiktok/templates/:id/apply
 * Body: { videoId, applyFrame?, applySubtitleStyle?, applyOverlays?, applyBacksong?, applyTextStyleToClips?, replaceOverlays? }
 *
 * Copies template's visual identity onto the target video:
 * - Frame style + breaking text
 * - Subtitle defaults (enabled / Y / fontSize)
 * - PNG overlays (positions intact) — optionally replacing existing
 * - Backsong + volume
 * - Default text style applied to all existing clips' textOverlay (color / size / position)
 *
 * Does NOT modify clips (sourceUrl, durations, textOverlay content) — only their styling.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = schema.parse(body);

    const template = await prisma.tiktokTemplate.findUnique({
      where: { id: params.id },
      include: { overlays: true, slots: { orderBy: { order: "asc" } } },
    });
    if (!template) throw new ApiError("Template tidak ditemukan", 404);

    const video = await prisma.tiktokVideo.findUnique({
      where: { id: data.videoId },
      include: { clips: true },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);

    const updates: Record<string, unknown> = {};

    if (data.applyFrame) {
      updates.frameStyle = template.frameStyle;
      updates.breakingText = template.breakingText;
    }

    if (data.applySubtitleStyle) {
      updates.subtitleEnabled = template.subtitleEnabled;
      updates.subtitleY = template.subtitleY;
      updates.subtitleFontSize = template.subtitleFontSize;
    }

    if (data.applyBacksong && template.backsongId) {
      updates.backsongId = template.backsongId;
      updates.backsongVolume = template.backsongVolume;
    }

    await prisma.tiktokVideo.update({
      where: { id: data.videoId },
      data: updates,
    });

    // PNG overlays
    if (data.applyOverlays) {
      if (data.replaceOverlays) {
        await prisma.tiktokOverlay.deleteMany({ where: { videoId: data.videoId } });
      }
      if (template.overlays.length > 0) {
        await prisma.tiktokOverlay.createMany({
          data: template.overlays.map((o) => ({
            videoId: data.videoId,
            imageUrl: o.imageUrl,
            x: o.x,
            y: o.y,
            scale: o.scale,
            rotation: o.rotation,
            opacity: o.opacity,
            order: o.order,
            label: o.label,
          })),
        });
      }
    }

    // Apply default text styling to existing clips (does not touch textOverlay text content)
    let clipsRestyled = 0;
    if (data.applyTextStyleToClips && video.clips.length > 0) {
      const stylePatch: Record<string, unknown> = {
        textColor: template.defaultTextColor,
        textPosition: template.defaultTextPosition,
        textFontSize: template.defaultTextFontSize,
        textRotation: template.defaultTextRotation,
        textX: template.defaultTextX,
        textY: template.defaultTextY,
      };
      await prisma.tiktokClip.updateMany({
        where: { videoId: data.videoId },
        data: stylePatch,
      });
      clipsRestyled = video.clips.length;
    }

    // Apply slot structure → create placeholder clips for any slot user hasn't filled yet.
    // Replaces existing clips entirely so the structure matches.
    let placeholdersCreated = 0;
    if (data.applySlotStructure && template.slots.length > 0) {
      await prisma.tiktokClip.deleteMany({ where: { videoId: data.videoId } });
      await prisma.tiktokClip.createMany({
        data: template.slots.map((s) => ({
          videoId: data.videoId,
          order: s.order,
          type: s.type,
          sourceUrl: "", // empty = placeholder
          durationSec: s.durationSec,
          isPlaceholder: true,
          slotLabel: s.label,
          templateSlotId: s.id,
          // Apply default text style from template
          textColor: template.defaultTextColor,
          textPosition: template.defaultTextPosition,
          textFontSize: template.defaultTextFontSize,
          textRotation: template.defaultTextRotation,
          textX: template.defaultTextX,
          textY: template.defaultTextY,
          kenBurns: s.type === "image" ? template.defaultKenBurns : false,
        })),
      });
      placeholdersCreated = template.slots.length;
    }

    // Bump usage stats
    await prisma.tiktokTemplate.update({
      where: { id: params.id },
      data: { usedCount: { increment: 1 }, lastUsedAt: new Date() },
    });

    return successResponse({
      applied: true,
      templateName: template.name,
      overlaysCopied: data.applyOverlays ? template.overlays.length : 0,
      clipsRestyled,
      placeholdersCreated,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
