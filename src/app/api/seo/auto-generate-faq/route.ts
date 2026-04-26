/**
 * Auto-generate FAQ schema for articles missing faqData.
 *
 * AI generates 3-5 question-answer pairs based on article content.
 * Saved as JSON string in `Article.faqData`. The article page already
 * renders FAQPage JSON-LD when faqData is present → enables Google
 * "People Also Ask" rich result + Featured Snippet eligibility.
 *
 * POST /api/seo/auto-generate-faq
 *   Headers: Authorization: Bearer ${CRON_SECRET}
 *   Body: { limit?: number (max 30, default 20), dryRun?: boolean }
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { callAI, hasAIKey } from "@/lib/ai-client";

const bodySchema = z.object({
  limit: z.number().int().min(1).max(30).optional().default(20),
  dryRun: z.boolean().optional().default(false),
});

const SYSTEM_PROMPT = `Kamu adalah SEO content specialist untuk media berita hukum Indonesia "Jurnalis Hukum Bandung" (JHB).
Tugas: generate 3-5 FAQ (Frequently Asked Questions) yang RELEVAN dengan isi artikel hukum, untuk dipasang sebagai FAQPage schema markup → muncul di Google "People Also Ask" + bantu rank Featured Snippet.

ATURAN FAQ:
- 3-5 pertanyaan (idealnya 4)
- Pertanyaan natural seperti yang user akan ketik di Google (bukan "Apa itu X?" generik)
- Pakai keyword utama dari judul/isi
- Jawaban: 2-4 kalimat, langsung ke poin (Google butuh jawaban concise)
- Jangan duplicate info dari pertanyaan ke jawaban
- Bahasa Indonesia formal jurnalistik
- Hindari pertanyaan filosofis ("Mengapa hukum penting?") — fokus ke fakta artikel

CONTOH BAGUS:
{"q": "Berapa hukuman penjara terdakwa kasus korupsi proyek X?", "a": "Majelis hakim menjatuhkan vonis 7 tahun penjara dan denda Rp500 juta..."}
{"q": "Kapan jadwal sidang lanjutan kasus pembunuhan Y di PN Bandung?", "a": "Sidang lanjutan dijadwalkan pada 15 Mei 2026 dengan agenda pemeriksaan saksi..."}

CONTOH BURUK (jangan pakai):
{"q": "Apa itu korupsi?", "a": "Korupsi adalah..."} ← terlalu generik
{"q": "Mengapa kasus ini penting?", "a": "..."} ← filosofis

Output FORMAT (JSON array valid only, tanpa markdown):
[
  {"q": "...", "a": "..."},
  {"q": "...", "a": "..."},
  ...
]`;

interface FaqItem {
  q: string;
  a: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

    // Find published articles WITHOUT faqData (or with empty/invalid faqData)
    const candidates = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ faqData: null }, { faqData: "" }],
        // Skip very short articles — not enough content for meaningful FAQ
        content: { not: "" },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        category: { select: { name: true } },
      },
      orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }], // prioritize popular/recent
      take: limit * 2, // fetch extra in case some get skipped for short content
    });

    let fixed = 0;
    let failed = 0;
    let skipped = 0;
    const samples: Array<{ slug: string; title: string; faqCount: number; sampleQ: string }> = [];

    for (const article of candidates) {
      if (fixed >= limit) break;

      const cleanContent = article.content
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (cleanContent.length < 500) {
        skipped++;
        continue;
      }

      try {
        const userPrompt = `JUDUL: ${article.title}
KATEGORI: ${article.category?.name || "-"}
EXCERPT: ${article.excerpt || "(tidak ada)"}

ISI ARTIKEL:
${cleanContent.slice(0, 4000)}

Generate 3-5 FAQ untuk schema markup. Output JSON array saja.`;

        const aiResponse = await callAI(SYSTEM_PROMPT, userPrompt, 1000, 45000);

        // Parse JSON array (handle markdown wrapping)
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          failed++;
          continue;
        }

        const parsed = JSON.parse(jsonMatch[0]) as FaqItem[];
        if (!Array.isArray(parsed) || parsed.length < 2) {
          skipped++;
          continue;
        }

        // Validate each item
        const validFaqs = parsed
          .filter((f) =>
            typeof f.q === "string" &&
            typeof f.a === "string" &&
            f.q.length >= 10 && f.q.length <= 200 &&
            f.a.length >= 30 && f.a.length <= 500
          )
          .slice(0, 5);

        if (validFaqs.length < 2) {
          skipped++;
          continue;
        }

        if (samples.length < 5) {
          samples.push({
            slug: article.slug,
            title: article.title,
            faqCount: validFaqs.length,
            sampleQ: validFaqs[0].q,
          });
        }

        if (!dryRun) {
          await prisma.article.update({
            where: { id: article.id },
            data: { faqData: JSON.stringify(validFaqs) },
          });
        }
        fixed++;

        // Rate limit: 2s between AI calls (longer prompts → bigger payload)
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        failed++;
        console.error(`[auto-generate-faq] error on ${article.slug}:`, err);
      }
    }

    const remaining = await prisma.article.count({
      where: {
        status: "PUBLISHED",
        OR: [{ faqData: null }, { faqData: "" }],
      },
    });

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      dryRun,
      processed: Math.min(candidates.length, fixed + failed + skipped),
      fixed,
      failed,
      skipped,
      remaining,
      samples,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
