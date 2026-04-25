export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { callAI, hasAIKey } from "@/lib/ai-client";

const SYSTEM_PROMPT =
  "Kamu adalah copywriter TikTok untuk media berita hukum Indonesia. Tugasmu mengubah artikel berita jadi serangkaian kalimat overlay teks pendek yang muncul beruntun di video TikTok 9:16, tiap segment 4-7 detik. Gaya: punchy, hook strong, pakai emoji 1x per segment max. Hindari kalimat panjang. Balas HANYA JSON array tanpa penjelasan apapun.";

const inputSchema = z.object({
  count: z.number().int().min(3).max(20).optional(),         // jumlah segments yang diinginkan
  replace: z.boolean().optional(),                            // hapus existing entries dulu
  targetDurationSec: z.number().min(5).max(180).optional(),   // override durasi total (default: settings.maxDurationSec atau 60)
});

interface AIResponseSegment {
  text: string;
  durationSec?: number;
}

/**
 * POST /api/tiktok/videos/:id/generate-text-segments
 *
 * Pakai AI untuk pecah artikel terkait jadi serangkaian text overlay timed
 * yang akan muncul di sepanjang video TikTok. Setiap segment durasi 4-7 detik.
 *
 * Body:
 *   - count?: 3-12 (default: auto sesuai durasi video)
 *   - replace?: boolean (default: true) — hapus subtitleEntries yang ada
 *
 * Response: array of created subtitleEntry objects
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();

    if (!(await hasAIKey())) {
      throw new ApiError("API Key AI belum dikonfigurasi", 400);
    }

    const body = await req.json().catch(() => ({}));
    const { count, replace = true, targetDurationSec } = inputSchema.parse(body);

    const video = await prisma.tiktokVideo.findUnique({
      where: { id: params.id },
      include: {
        clips: { select: { durationSec: true } },
        article: {
          select: {
            title: true,
            excerpt: true,
            content: true,
            category: { select: { name: true } },
          },
        },
      },
    });
    if (!video) throw new ApiError("Video tidak ditemukan", 404);
    if (!video.article) {
      throw new ApiError("Video belum di-link ke artikel. Pilih artikel di panel atas dulu.", 400);
    }

    // Default target duration: max video TikTok dari settings (default 60s = 1 menit penuh)
    // Subtitle akan span FULL durasi ini, terlepas dari berapa lama clip-nya.
    // Kalau caller passing targetDurationSec, pakai itu.
    let totalDuration: number;
    if (targetDurationSec) {
      totalDuration = targetDurationSec;
    } else {
      const settings = await prisma.tiktokSettings.findFirst();
      totalDuration = settings?.maxDurationSec || 60;
    }

    // Decide segment count based on duration if not specified
    // Target ~5-7 detik per segment (sweet spot untuk TikTok readability)
    const targetSegments = count ?? Math.max(3, Math.min(15, Math.round(totalDuration / 6)));

    // Strip HTML from article content for AI input
    const plainContent = (video.article.content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2500);

    const userPrompt = `Pecah artikel berita hukum berikut jadi tepat ${targetSegments} segment text overlay TikTok yang akan tampil beruntun untuk total ${totalDuration} detik video.

Judul: ${video.article.title}${video.article.excerpt ? `\nRingkasan: ${video.article.excerpt}` : ""}
Kategori: ${video.article.category?.name || "Umum"}
Konten: ${plainContent}

Aturan keras:
- Tepat ${targetSegments} segment, tidak lebih, tidak kurang
- Tiap segment max 70 karakter (akan tampil sebagai overlay text di layar HP)
- Bahasa santai TikTok, hook kuat di segment pertama
- Segment pertama harus shocking/menarik supaya viewers ga skip
- Segment terakhir = call-to-action atau punchline
- Boleh tambah emoji 1x per segment, jangan terlalu banyak
- Cerita mengalir: setiap segment lanjutan dari yang sebelumnya
- Jangan ulangi judul artikel

Balas HANYA JSON array dalam format ini, tanpa penjelasan apapun:
[{"text":"segment 1","durationSec":5},{"text":"segment 2","durationSec":5},...]

durationSec total harus = ${totalDuration} detik. Distribusikan merata atau sesuai bobot informasi.`;

    const aiResponse = await callAI(SYSTEM_PROMPT, userPrompt, 1500, 60000);

    // Parse JSON
    let segments: AIResponseSegment[];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Tidak ada JSON array di response AI");
      segments = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(segments) || segments.length === 0) {
        throw new Error("Response AI bukan array valid");
      }
    } catch (err) {
      console.error("[TEXT-SEGMENTS] AI response parse error:", aiResponse.slice(0, 500));
      throw new ApiError(
        `AI gagal generate format yang valid: ${err instanceof Error ? err.message : "unknown"}`,
        500
      );
    }

    // Normalize & distribute timing
    // If durationSec given, accumulate; else split evenly
    let cursorSec = 0;
    const totalRequestedDuration = segments.reduce((s, seg) => s + (seg.durationSec || 0), 0);
    const useProvidedTimings = totalRequestedDuration > 0 && Math.abs(totalRequestedDuration - totalDuration) < 5;

    const cleanedSegments = segments
      .map((seg, i) => {
        const text = String(seg.text || "").trim().slice(0, 200);
        if (!text) return null;
        const segDuration = useProvidedTimings
          ? seg.durationSec || totalDuration / segments.length
          : totalDuration / segments.length;
        const startSec = cursorSec;
        const endSec = i === segments.length - 1
          ? totalDuration  // last segment ends exactly at total duration
          : Math.round((cursorSec + segDuration) * 100) / 100;
        cursorSec = endSec;
        return { startSec, endSec, text };
      })
      .filter(Boolean) as { startSec: number; endSec: number; text: string }[];

    if (cleanedSegments.length === 0) {
      throw new ApiError("Tidak ada segment valid yang dihasilkan AI", 500);
    }

    // Replace existing entries if requested
    if (replace) {
      await prisma.tiktokSubtitleEntry.deleteMany({
        where: { videoId: params.id },
      });
    }

    // Bulk create
    const created = await Promise.all(
      cleanedSegments.map((seg) =>
        prisma.tiktokSubtitleEntry.create({
          data: {
            videoId: params.id,
            startSec: seg.startSec,
            endSec: seg.endSec,
            text: seg.text,
            // Default styling — leave null so renderer uses video-level defaults
            y: null,
            fontSize: null,
            color: null,
          },
        })
      )
    );

    // Auto-enable subtitle display on the video
    await prisma.tiktokVideo.update({
      where: { id: params.id },
      data: { subtitleEnabled: true },
    });

    return successResponse({
      generated: created.length,
      totalDuration,
      replaced: replace,
      entries: created,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
