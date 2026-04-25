/**
 * Auto-fix SEO metadata — batch generates seoTitle + seoDescription via AI
 * for all PUBLISHED articles missing them.
 *
 * POST /api/seo/auto-fix-meta
 *   Headers: Authorization: Bearer ${CRON_SECRET}
 *   Body: { limit?: number (default 30, max 100), dryRun?: boolean }
 *
 * Returns: { processed, fixed, failed, skipped, samples: [{slug, before, after}] }
 *
 * Rate-limited internally (1.5s between AI calls) to respect Anthropic limits.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — batch can take a while

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callAI, hasAIKey } from "@/lib/ai-client";

const bodySchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(30),
  dryRun: z.boolean().optional().default(false),
});

const SYSTEM_PROMPT = `Kamu adalah SEO specialist untuk media berita hukum Indonesia "Jurnalis Hukum Bandung" (JHB).
Tugas: generate seoTitle (50-60 char) dan seoDescription (130-155 char) yang optimasi untuk Google Search.

ATURAN seoTitle:
- 50-60 karakter (strict limit)
- Mulai dengan keyword utama
- Tambahkan "Bandung" atau lokasi spesifik kalau relevan
- Pakai action verb / angka untuk CTR (e.g. "Putus", "Vonis", "Rp X Miliar")
- Hindari clickbait — harus akurat sesuai isi
- Format: [Kata Kunci] [Detail Spesifik] - [Lokasi atau Sumber]

ATURAN seoDescription:
- 130-155 karakter (strict limit)
- Include keyword utama 1x natural
- Ringkas isi artikel: SIAPA + APA + DIMANA + KAPAN
- Akhiri dengan implicit call-to-action ("Selengkapnya...", "Baca putusan lengkap...")
- Gunakan bahasa Indonesia formal jurnalistik

Output FORMAT (HARUS JSON valid, tidak ada markdown atau penjelasan tambahan):
{"seoTitle": "...", "seoDescription": "..."}`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth gate
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { limit, dryRun } = bodySchema.parse(body);

    if (!(await hasAIKey())) {
      return NextResponse.json({ error: "No AI key configured" }, { status: 503 });
    }

    // Find articles missing meta OR excerpt
    const candidates = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { seoTitle: null },
          { seoTitle: "" },
          { seoDescription: null },
          { seoDescription: "" },
          { excerpt: null },
          { excerpt: "" },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        seoTitle: true,
        seoDescription: true,
        publishedAt: true,
        category: { select: { name: true } },
        tags: { select: { name: true }, take: 5 },
      },
      orderBy: { publishedAt: "desc" }, // newest first (highest impact)
      take: limit,
    });

    const samples: Array<{
      slug: string;
      before: { seoTitle: string | null; seoDescription: string | null };
      after: { seoTitle: string; seoDescription: string };
    }> = [];

    let fixed = 0;
    let failed = 0;
    let skipped = 0;

    for (const article of candidates) {
      try {
        // Strip HTML and truncate content for AI prompt
        const cleanContent = article.content
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 2500);

        const tagsList = article.tags.map((t) => t.name).join(", ");
        const userPrompt = `JUDUL ARTIKEL: ${article.title}

KATEGORI: ${article.category?.name || "-"}
TAGS: ${tagsList || "-"}
EXCERPT: ${article.excerpt || "(tidak ada)"}

ISI ARTIKEL (excerpt):
${cleanContent}

Generate seoTitle dan seoDescription yang optimal untuk Google. Output JSON saja.`;

        const aiResponse = await callAI(SYSTEM_PROMPT, userPrompt, 500, 30000);

        // Parse JSON (handle markdown-wrapped responses)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          failed++;
          continue;
        }
        const parsed = JSON.parse(jsonMatch[0]) as { seoTitle?: string; seoDescription?: string };

        if (!parsed.seoTitle || !parsed.seoDescription) {
          skipped++;
          continue;
        }

        // Truncate to safe limits (in case AI overshoots)
        const seoTitle = parsed.seoTitle.slice(0, 60).trim();
        const seoDescription = parsed.seoDescription.slice(0, 160).trim();

        if (seoTitle.length < 20 || seoDescription.length < 80) {
          skipped++;
          continue;
        }

        if (samples.length < 5) {
          samples.push({
            slug: article.slug,
            before: { seoTitle: article.seoTitle, seoDescription: article.seoDescription },
            after: { seoTitle, seoDescription },
          });
        }

        if (!dryRun) {
          await prisma.article.update({
            where: { id: article.id },
            data: {
              ...(article.seoTitle ? {} : { seoTitle }),
              ...(article.seoDescription ? {} : { seoDescription }),
              // Use seoDescription as excerpt fallback if missing (slightly longer)
              ...(article.excerpt ? {} : { excerpt: seoDescription }),
            },
          });
        }
        fixed++;

        // Rate limit: 1.5s between AI calls
        await new Promise((r) => setTimeout(r, 1500));
      } catch (err) {
        failed++;
        console.error(`[auto-fix-meta] error on ${article.slug}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      dryRun,
      processed: candidates.length,
      fixed,
      failed,
      skipped,
      samples,
      remaining: await prisma.article.count({
        where: {
          status: "PUBLISHED",
          OR: [
            { seoTitle: null },
            { seoTitle: "" },
            { seoDescription: null },
            { seoDescription: "" },
          ],
        },
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
