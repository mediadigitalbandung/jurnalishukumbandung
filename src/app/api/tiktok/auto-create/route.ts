/**
 * POST /api/tiktok/auto-create
 *
 * One-click TikTok video creation. User cuma upload file + pilih artikel,
 * semuanya otomatis: durasi, frame style, backsong, subtitle AI, caption AI, render.
 *
 * Body (JSON):
 * {
 *   articleId: string,
 *   files: [{ url, type: "video"|"image", sourceDurationSec? }],
 *   targetDurationSec?: number (default 60),
 *   frameStyle?: FrameStyle (auto-detect kalau ga di-set),
 *   renderEngine?: "ffmpeg"|"hyperframes" (default ffmpeg)
 * }
 *
 * Returns: { videoId, message, autoChoices: { frameStyle, backsongName, durations, subtitleCount } }
 *
 * Async post-create work (subtitle gen + render) jalan di background — user poll
 * status via GET /api/tiktok/videos/:id/render
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import {
  autoSelectFrameStyle,
  autoSelectBacksong,
  autoDistributeDurations,
  autoSubtitleCount,
  validateAutoCreateInput,
  AUTO_TARGET_DURATION,
  type AutoCreateInput,
} from "@/lib/tiktok/auto-create";
import { generateTiktokCaption } from "@/lib/tiktok/caption-gen";
import { enqueueRender } from "@/lib/tiktok/render-queue";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit untuk handle AI subtitle gen sync

const fileSchema = z.object({
  url: z.string().min(1),
  type: z.enum(["video", "image"]),
  sourceDurationSec: z.number().min(0).optional().nullable(),
});

const inputSchema = z.object({
  articleId: z.string().min(1),
  files: z.array(fileSchema).min(1).max(12),
  targetDurationSec: z.number().min(10).max(180).optional(),
  frameStyle: z.enum(["none", "ticker-news", "brand-green", "breaking-news", "minimal", "lower-third", "custom"]).optional(),
  renderEngine: z.enum(["ffmpeg", "hyperframes"]).optional(),
  autoSubtitle: z.boolean().optional().default(true),
  autoCaption: z.boolean().optional().default(true),
  autoRender: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = inputSchema.parse(body);

    // ─── Validate input ───────────────────────────────
    const v = validateAutoCreateInput(data as AutoCreateInput);
    if (!v.valid) throw new ApiError(v.errors.join("; "), 400);

    // ─── Load article with category ───────────────────
    const article = await prisma.article.findUnique({
      where: { id: data.articleId },
      select: {
        id: true,
        title: true,
        excerpt: true,
        content: true,
        category: { select: { name: true, slug: true } },
      },
    });
    if (!article) throw new ApiError("Artikel tidak ditemukan", 404);

    // ─── Auto-detect smart defaults ───────────────────
    const targetDuration = data.targetDurationSec ?? AUTO_TARGET_DURATION;
    const frameStyle = data.frameStyle || autoSelectFrameStyle(article);
    const backsongId = await autoSelectBacksong(article);
    const clipTypes = data.files.map((f) => f.type);
    const durations = autoDistributeDurations(clipTypes, targetDuration);
    const subtitleSegments = autoSubtitleCount(targetDuration);

    // ─── Step 1: Create TiktokVideo project ──────────
    const video = await prisma.tiktokVideo.create({
      data: {
        title: `[Auto] ${article.title.slice(0, 100)}`,
        articleId: article.id,
        backsongId,
        backsongVolume: 0.45,
        frameStyle,
        breakingText: frameStyle === "breaking-news" ? "BREAKING NEWS" : null,
        createdBy: session.user.id,
        createdByName: session.user.name || null,
      },
    });

    // ─── Step 2: Add clips ────────────────────────────
    await prisma.$transaction(
      data.files.map((file, idx) =>
        prisma.tiktokClip.create({
          data: {
            videoId: video.id,
            order: idx,
            type: file.type,
            sourceUrl: file.url,
            sourceDuration: file.sourceDurationSec ?? null,
            durationSec: durations[idx],
            // Smart defaults per clip type
            kenBurns: file.type === "image", // foto auto-zoom
            transition: idx === 0 ? "none" : "fade", // first clip no transition, rest fade in
            textPosition: "bottom",
          },
        })
      )
    );

    // ─── Step 3: AI generate caption + hashtag (sync, fast — usually 5-10s) ────
    let captionGenerated = false;
    if (data.autoCaption !== false) {
      try {
        const result = await generateTiktokCaption({
          articleTitle: article.title,
          articleExcerpt: article.excerpt || undefined,
          articleContent: article.content || undefined,
        });
        await prisma.tiktokVideo.update({
          where: { id: video.id },
          data: { caption: result.caption, hashtags: result.hashtags },
        });
        captionGenerated = true;
      } catch (err) {
        console.warn("[AUTO-CREATE] AI caption gagal, lanjut:", err instanceof Error ? err.message : err);
      }
    }

    // ─── Step 4: AI generate subtitle (async — di-trigger dengan cara non-blocking) ───
    // Note: kita panggil endpoint subtitle gen-text-segments sebagai library function untuk avoid HTTP overhead
    let subtitleGenerated = false;
    if (data.autoSubtitle !== false) {
      try {
        // Inline generation — pakai callAI langsung untuk avoid HTTP roundtrip
        const { callAI, hasAIKey } = await import("@/lib/ai-client");
        if (await hasAIKey()) {
          const SYSTEM_PROMPT =
            "Kamu adalah copywriter TikTok untuk media berita hukum Indonesia. Tugasmu mengubah artikel berita jadi serangkaian kalimat overlay teks pendek yang muncul beruntun di video TikTok 9:16, tiap segment 4-7 detik. Gaya: punchy, hook strong, pakai emoji 1x per segment max. Hindari kalimat panjang. Balas HANYA JSON array tanpa penjelasan apapun.";

          const plainContent = (article.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2500);

          const userPrompt = `Pecah artikel berita hukum berikut jadi tepat ${subtitleSegments} segment text overlay TikTok yang akan tampil beruntun untuk total ${targetDuration} detik video.

Judul: ${article.title}${article.excerpt ? `\nRingkasan: ${article.excerpt}` : ""}
Kategori: ${article.category?.name || "Umum"}
Konten: ${plainContent}

Aturan:
- Tepat ${subtitleSegments} segment
- Tiap segment max 70 karakter
- Bahasa santai TikTok, hook kuat di segment pertama
- Segment terakhir = call-to-action
- Boleh emoji 1x per segment
- Cerita mengalir berurutan

Balas HANYA JSON array dalam format ini:
[{"text":"segment 1","durationSec":5},...]

durationSec total = ${targetDuration} detik.`;

          const aiResponse = await callAI(SYSTEM_PROMPT, userPrompt, 1500, 60000);
          const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const segments = JSON.parse(jsonMatch[0]) as Array<{ text: string; durationSec?: number }>;

            let cursor = 0;
            const totalRequested = segments.reduce((s, seg) => s + (seg.durationSec || 0), 0);
            const useProvidedTimings = totalRequested > 0 && Math.abs(totalRequested - targetDuration) < 5;

            await prisma.$transaction(
              segments.map((seg, i) => {
                const text = String(seg.text || "").trim().slice(0, 200);
                const segDuration = useProvidedTimings ? seg.durationSec || targetDuration / segments.length : targetDuration / segments.length;
                const startSec = cursor;
                const endSec = i === segments.length - 1 ? targetDuration : Math.round((cursor + segDuration) * 100) / 100;
                cursor = endSec;
                return prisma.tiktokSubtitleEntry.create({
                  data: { videoId: video.id, startSec, endSec, text, y: null, fontSize: null, color: null },
                });
              })
            );
            await prisma.tiktokVideo.update({
              where: { id: video.id },
              data: { subtitleEnabled: true },
            });
            subtitleGenerated = true;
          }
        }
      } catch (err) {
        console.warn("[AUTO-CREATE] AI subtitle gagal, lanjut:", err instanceof Error ? err.message : err);
      }
    }

    // ─── Step 5: Set render engine + trigger render (async background) ────
    if (data.renderEngine) {
      const settings = await prisma.tiktokSettings.findFirst();
      if (settings && settings.renderEngine !== data.renderEngine) {
        await prisma.tiktokSettings.update({
          where: { id: settings.id },
          data: { renderEngine: data.renderEngine },
        });
      }
    }

    let renderQueued = false;
    if (data.autoRender !== false) {
      try {
        await enqueueRender(video.id);
        renderQueued = true;
      } catch (err) {
        console.warn("[AUTO-CREATE] Render enqueue gagal:", err instanceof Error ? err.message : err);
      }
    }

    // ─── Get backsong name for response ─────────────────
    const backsongName = backsongId
      ? (await prisma.tiktokBacksong.findUnique({ where: { id: backsongId }, select: { name: true } }))?.name
      : null;

    return successResponse(
      {
        videoId: video.id,
        message: "Video TikTok dibuat otomatis. Render sedang berjalan di background.",
        autoChoices: {
          frameStyle,
          backsongName,
          backsongId,
          durations,
          totalDuration: targetDuration,
          subtitleSegments,
          captionGenerated,
          subtitleGenerated,
          renderQueued,
        },
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
