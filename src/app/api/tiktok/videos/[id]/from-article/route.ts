export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { callAI, hasAIKey } from "@/lib/ai-client";

const schema = z.object({
  articleId: z.string().min(1),
  // What to auto-fill (default all true)
  fillTitle: z.boolean().optional().default(true),
  fillCaption: z.boolean().optional().default(true),
  fillHashtags: z.boolean().optional().default(true),
  createFeaturedClip: z.boolean().optional().default(true),
  generateTextOverlays: z.boolean().optional().default(true),
  // Optional: apply a template's visual identity (frame, PNG overlays, subtitle style, backsong, default text style)
  templateId: z.string().nullable().optional(),
  // If true (with templateId), creates placeholder clips from template slots before article fill
  applyTemplateSlots: z.boolean().optional().default(false),
});

const SYSTEM_PROMPT =
  "Kamu adalah scriptwriter video TikTok untuk media berita hukum Indonesia. Tugasmu: ringkas artikel jadi 3-5 caption pendek yang akan jadi text overlay di video TikTok 9:16. Setiap caption max 80 karakter, satu kalimat punchy, gampang dibaca cepat di layar HP. Hindari klise. Mulai dari hook (judul/poin paling kuat), tengah cerita, kesimpulan/CTA.";

/**
 * POST /api/tiktok/videos/:id/from-article
 *
 * Body: { articleId, fillTitle?, fillCaption?, fillHashtags?, createFeaturedClip?, generateTextOverlays? }
 *
 * Workflow:
 * 1. Link articleId to video
 * 2. Auto-set title from article.title
 * 3. Auto-set caption from article.excerpt + hashtags
 * 4. Generate hashtag array from article tags + brand hashtags
 * 5. Create first clip from article.featuredImage (if exists & no clips yet)
 * 6. AI generate 3-5 short text snippets, distribute as textOverlay per clip
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await req.json();
    const data = schema.parse(body);

    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
      include: { clips: { orderBy: { order: "asc" } } },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);

    const article = await prisma.article.findUnique({
      where: { id: data.articleId },
      include: { tags: true, category: true, author: true },
    });
    if (!article) throw new ApiError("Artikel tidak ditemukan", 404);

    const updates: Record<string, unknown> = { articleId: data.articleId };
    const result: Record<string, unknown> = { article: { id: article.id, title: article.title, slug: article.slug } };

    // Title
    if (data.fillTitle) {
      updates.title = article.title.slice(0, 200);
      result.title = updates.title;
    }

    // Hashtags from article tags + brand
    const articleTags = article.tags.map((t) => t.name.toLowerCase().replace(/\s+/g, ""));
    const brandTags = ["jurnalishukumbandung", "hukumbandung", "fyp"];
    const combinedHashtags = Array.from(new Set([...articleTags.slice(0, 5), ...brandTags])).slice(0, 8);
    if (data.fillHashtags) {
      updates.hashtags = combinedHashtags;
      result.hashtags = combinedHashtags;
    }

    // Caption
    if (data.fillCaption) {
      const excerpt = (article.excerpt || article.content.replace(/<[^>]*>/g, "").slice(0, 200)).trim();
      const hashtagLine = combinedHashtags.map((h) => `#${h}`).join(" ");
      updates.caption = `${excerpt}\n\n${hashtagLine}`.slice(0, 2000);
      result.caption = updates.caption;
    }

    // Save metadata first
    await prisma.tiktokVideo.update({
      where: { id: params.id },
      data: updates,
    });

    // STEP 1: Apply template slot structure FIRST if requested (creates placeholder clips)
    if (data.templateId && data.applyTemplateSlots) {
      const tplForSlots = await prisma.tiktokTemplate.findUnique({
        where: { id: data.templateId },
        include: { slots: { orderBy: { order: "asc" } } },
      });
      if (tplForSlots && tplForSlots.slots.length > 0) {
        await prisma.tiktokClip.deleteMany({ where: { videoId: params.id } });
        await prisma.tiktokClip.createMany({
          data: tplForSlots.slots.map((s) => ({
            videoId: params.id,
            order: s.order,
            type: s.type,
            sourceUrl: "",
            durationSec: s.durationSec,
            isPlaceholder: true,
            slotLabel: s.label,
            templateSlotId: s.id,
            textColor: tplForSlots.defaultTextColor,
            textPosition: tplForSlots.defaultTextPosition,
            textFontSize: tplForSlots.defaultTextFontSize,
            textRotation: tplForSlots.defaultTextRotation,
            textX: tplForSlots.defaultTextX,
            textY: tplForSlots.defaultTextY,
            kenBurns: s.type === "image" ? tplForSlots.defaultKenBurns : false,
          })),
        });
        result.placeholdersCreated = tplForSlots.slots.length;
      }
    }

    // STEP 2: Fill featured image into first matching slot/clip
    // Reload clips to see the post-slot state
    let createdClipsCount = 0;
    if (data.createFeaturedClip && article.featuredImage) {
      const imageUrl = article.featuredImage;
      const currentClips = await prisma.tiktokClip.findMany({
        where: { videoId: params.id },
        orderBy: { order: "asc" },
      });
      const alreadyExists = currentClips.some((c) => c.sourceUrl === imageUrl);

      if (!alreadyExists) {
        // Find first empty image placeholder to fill
        const targetPlaceholder = currentClips.find((c) => c.isPlaceholder && c.type === "image");
        if (targetPlaceholder) {
          await prisma.tiktokClip.update({
            where: { id: targetPlaceholder.id },
            data: { sourceUrl: imageUrl, isPlaceholder: false },
          });
          result.featuredImageFilledSlot = targetPlaceholder.order;
        } else {
          // No matching placeholder — insert at front like before (only when no placeholders exist)
          const hasAnyPlaceholder = currentClips.some((c) => c.isPlaceholder);
          if (!hasAnyPlaceholder) {
            if (currentClips.length > 0) {
              await prisma.$transaction(
                currentClips.map((c) =>
                  prisma.tiktokClip.update({
                    where: { id: c.id },
                    data: { order: c.order + 1 },
                  })
                )
              );
            }
            await prisma.tiktokClip.create({
              data: {
                videoId: params.id,
                order: 0,
                type: "image",
                sourceUrl: imageUrl,
                durationSec: 5,
                kenBurns: true,
              },
            });
            createdClipsCount = 1;
            result.clipCreated = true;
          }
        }
      } else {
        result.clipSkipped = "featured image sudah ada di clip list";
      }
    }

    // Generate AI text overlays per clip
    let textsApplied = 0;
    let aiSnippets: string[] = [];
    if (data.generateTextOverlays && (await hasAIKey())) {
      try {
        const allClips = await prisma.tiktokClip.findMany({
          where: { videoId: params.id },
          orderBy: { order: "asc" },
        });

        if (allClips.length > 0) {
          const articleText = article.content
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 3000);

          const prompt = `JUDUL ARTIKEL: ${article.title}

EXCERPT: ${article.excerpt || ""}

ISI ARTIKEL:
${articleText}

Buatkan ${allClips.length} caption singkat untuk video TikTok (1 caption per clip). Format output:
1. [caption 1]
2. [caption 2]
${allClips.length > 2 ? `3. [caption 3]` : ""}
${allClips.length > 3 ? `4. [caption 4]` : ""}

ATURAN:
- Max 80 karakter per caption
- Satu kalimat tegas, mudah dibaca cepat di layar HP
- Caption #1 = HOOK (poin paling kuat / mengundang penasaran)
- Caption tengah = fakta/kronologi penting
- Caption terakhir = kesimpulan / CTA / dampak
- Bahasa Indonesia formal jurnalistik (jangan kayak ABG)
- Jangan pakai hashtag, jangan pakai tanda petik`;

          const aiResponse = await callAI(SYSTEM_PROMPT, prompt, 800, 60000);

          // Parse numbered list
          aiSnippets = aiResponse
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => /^\d+[.)]\s+/.test(line))
            .map((line) => line.replace(/^\d+[.)]\s+/, "").replace(/^["'](.*)["']$/, "$1").trim())
            .filter((s) => s.length > 0 && s.length <= 120)
            .slice(0, allClips.length);

          // Apply to each clip
          for (let i = 0; i < Math.min(aiSnippets.length, allClips.length); i++) {
            await prisma.tiktokClip.update({
              where: { id: allClips[i].id },
              data: { textOverlay: aiSnippets[i] },
            });
            textsApplied++;
          }
        }
      } catch (e) {
        console.warn("[TIKTOK from-article] AI text generation failed:", e);
      }
    }

    result.textOverlaysGenerated = textsApplied;
    result.aiSnippets = aiSnippets;
    result.clipsCreated = createdClipsCount;

    // Apply template (if provided) — copies frame, PNG overlays, subtitle style, backsong, default text style.
    // Done LAST so it overrides article-derived defaults where templates have opinions.
    if (data.templateId) {
      const tpl = await prisma.tiktokTemplate.findUnique({
        where: { id: data.templateId },
        include: { overlays: true },
      });
      if (tpl) {
        await prisma.tiktokVideo.update({
          where: { id: params.id },
          data: {
            frameStyle: tpl.frameStyle,
            breakingText: tpl.breakingText,
            subtitleEnabled: tpl.subtitleEnabled,
            subtitleY: tpl.subtitleY,
            subtitleFontSize: tpl.subtitleFontSize,
            backsongId: tpl.backsongId ?? undefined,
            backsongVolume: tpl.backsongVolume,
          },
        });

        // Replace PNG overlays with template's
        await prisma.tiktokOverlay.deleteMany({ where: { videoId: params.id } });
        if (tpl.overlays.length > 0) {
          await prisma.tiktokOverlay.createMany({
            data: tpl.overlays.map((o) => ({
              videoId: params.id,
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

        // Apply default text style to all clips (including AI-generated text overlays)
        await prisma.tiktokClip.updateMany({
          where: { videoId: params.id },
          data: {
            textColor: tpl.defaultTextColor,
            textPosition: tpl.defaultTextPosition,
            textFontSize: tpl.defaultTextFontSize,
            textRotation: tpl.defaultTextRotation,
            textX: tpl.defaultTextX,
            textY: tpl.defaultTextY,
          },
        });

        await prisma.tiktokTemplate.update({
          where: { id: tpl.id },
          data: { usedCount: { increment: 1 }, lastUsedAt: new Date() },
        });

        result.templateApplied = tpl.name;
        result.templateOverlaysCopied = tpl.overlays.length;
      }
    }

    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
