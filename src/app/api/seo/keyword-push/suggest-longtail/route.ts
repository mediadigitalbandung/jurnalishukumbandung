export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { callAI, hasAIKey } from "@/lib/ai-client";

/**
 * GET: Generate 30-50 long-tail keyword suggestions berdasarkan:
 * - Topik artikel published terbaru
 * - Existing TargetKeyword (avoid duplicate)
 * - Pattern: legal angle + lokasi + spesifik (yg JHB punya advantage)
 *
 * POST: bulk insert selected suggestions ke TargetKeyword.
 */

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    if (!(await hasAIKey())) {
      return errorResponse(new Error("AI API key belum dikonfigurasi"));
    }

    // Get top 20 articles published terbaru by viewCount untuk konteks
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        title: true,
        excerpt: true,
        category: { select: { name: true } },
        tags: { select: { name: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { viewCount: "desc" }],
      take: 30,
    });

    // Get existing keywords (untuk avoid duplicate)
    const existing = await prisma.targetKeyword.findMany({
      select: { keyword: true },
    });
    const existingSet = new Set(existing.map((k) => k.keyword.toLowerCase()));

    // Build context untuk AI
    const articleSummary = articles
      .slice(0, 20)
      .map((a, i) => {
        const tags = a.tags.map((t) => t.name).join(", ");
        return `${i + 1}. [${a.category?.name || "-"}] "${a.title}" — tags: ${tags || "(none)"}`;
      })
      .join("\n");

    const existingSample = existing
      .slice(0, 50)
      .map((k) => k.keyword)
      .join(", ");

    const systemPrompt = `Anda strategist SEO untuk portal berita hukum Bandung.

Tugas: Generate 40-50 long-tail keyword yang JHB punya advantage untuk menang di Google.

KARAKTERISTIK JHB:
- Niche: hukum, peradilan, tipikor, pidana, perdata, HAM
- Lokasi: Bandung, Jawa Barat
- Format: berita + analisis hukum

KRITERIA KEYWORD YANG BAIK (JHB punya peluang menang):
✓ 3-5 kata (long-tail)
✓ Mengandung lokasi spesifik (Bandung, PN Bandung, Jabar) ATAU
✓ Mengandung istilah hukum spesifik (pasal X, UU Y, putusan, kasasi) ATAU
✓ Mengandung nama tokoh/lembaga + konteks hukum
✓ Mengandung angka/tahun (2025, 2026)

KRITERIA YANG DIHINDARI:
✗ Brand owner (bjb, detik, kompas, dll) — kalah pasti
✗ Generic 1-2 kata broad ("berita bandung", "harga bbm")
✗ Lifestyle/non-hukum tanpa angle hukum
✗ Hanya nama orang tanpa konteks

OUTPUT: JSON valid saja, tanpa markdown fence:
{
  "suggestions": [
    { "keyword": "...", "rationale": "kenapa ini bagus", "category": "tipikor|pidana|perdata|tata-negara|ham|umum", "priority": "HIGH|MEDIUM|LOW" },
    ...
  ]
}

Target output: 40-50 suggestions. Variasi angle: kasus aktual, prosedural hukum, profil tokoh hukum, regulasi, lokasi spesifik (PN Bandung, Kejari, dll).`;

    const userPrompt = `30 ARTIKEL TERBARU JHB (untuk konteks topik yang sedang aktif):

${articleSummary}

KEYWORD YANG SUDAH ADA (50 sample, JANGAN duplicate):
${existingSample}

Generate 40-50 long-tail keyword baru yang COMPLEMENT topik di atas, fokus angle hukum + lokasi Bandung. Output JSON saja.`;

    const aiResponse = await callAI(systemPrompt, userPrompt, 3000, 90000);
    const cleaned = aiResponse
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return errorResponse(new Error(`AI response not valid JSON: ${cleaned.slice(0, 200)}`));
    }

    // Filter: skip yang sudah ada
    const suggestions = (parsed.suggestions || []).filter(
      (s: { keyword: string }) => !existingSet.has(s.keyword.toLowerCase().trim())
    );

    return successResponse({
      total: suggestions.length,
      existingCount: existing.length,
      suggestions,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

const applySchema = z.object({
  suggestions: z.array(
    z.object({
      keyword: z.string().min(3).max(150),
      priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
      rationale: z.string().optional(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();
    const data = applySchema.parse(body);

    let inserted = 0;
    let skipped = 0;

    for (const s of data.suggestions) {
      const trimmed = s.keyword.trim();
      const existing = await prisma.targetKeyword.findUnique({
        where: { keyword: trimmed },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await prisma.targetKeyword.create({
        data: {
          keyword: trimmed,
          source: "ai_research",
          notes: s.rationale || null,
          priority: s.priority || "MEDIUM",
          targetPosition: 3,
          isActive: true,
        },
      });
      inserted++;
    }

    return successResponse({ inserted, skipped, total: data.suggestions.length });
  } catch (error) {
    return errorResponse(error);
  }
}
