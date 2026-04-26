export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit max per request

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

/**
 * Bulk generate sorotan SEO untuk MULTIPLE keyword.
 *
 * Mode A: Semua active keyword (1 sorotan each)
 * Mode B: Selected keyword IDs
 *
 * Karena tiap generate butuh ~30-60s + timeout 5 menit, max 5 keyword per request.
 * UI loop call ini sampai semua keyword selesai (paginate via offset).
 *
 * Body:
 * {
 *   mode: "all-active" | "selected",
 *   keywordIds?: string[],   // for "selected"
 *   limit?: number,           // default 5, max 5
 *   offset?: number           // skip N keywords (untuk pagination)
 * }
 */

const bulkSchema = z.object({
  mode: z.enum(["all-active", "selected"]),
  keywordIds: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(5).default(5),
  offset: z.number().int().min(0).default(0),
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();
    const { mode, keywordIds, limit, offset } = bulkSchema.parse(body);

    // Pull keywords yang akan di-process
    let targetKeywords;
    if (mode === "selected") {
      if (!keywordIds || keywordIds.length === 0) {
        return errorResponse(new Error("keywordIds required for mode 'selected'"));
      }
      targetKeywords = await prisma.targetKeyword.findMany({
        where: { id: { in: keywordIds }, isActive: true, bestArticleId: { not: null } },
        skip: offset,
        take: limit,
        orderBy: { keyword: "asc" },
      });
    } else {
      targetKeywords = await prisma.targetKeyword.findMany({
        where: { isActive: true, bestArticleId: { not: null } },
        skip: offset,
        take: limit,
        orderBy: [{ priority: "asc" }, { keyword: "asc" }],
      });
    }

    if (targetKeywords.length === 0) {
      return successResponse({
        processed: 0,
        results: [],
        message: "Tidak ada keyword tersisa untuk di-process",
        done: true,
      });
    }

    // Pull total count untuk progress
    const totalCount = mode === "selected"
      ? (keywordIds?.length || 0)
      : await prisma.targetKeyword.count({
          where: { isActive: true, bestArticleId: { not: null } },
        });

    // Process sequential — call generate-sorotan/[id] internally
    const results: Array<{
      keywordId: string;
      keyword: string;
      ok: boolean;
      sorotanId?: string;
      sorotanSlug?: string;
      sorotanUrl?: string;
      error?: string;
    }> = [];

    for (const target of targetKeywords) {
      // Check if keyword already has sorotan (skip kalau sudah)
      const existing = await prisma.sorotan.count({
        where: { targetKeywordId: target.id, angle: "keyword-landing" },
      });
      if (existing > 0) {
        results.push({
          keywordId: target.id,
          keyword: target.keyword,
          ok: false,
          error: `Sudah ada ${existing} sorotan — skip (gunakan single-generate untuk tambah)`,
        });
        continue;
      }

      // Internal call to single endpoint
      try {
        const cookieHeader = req.headers.get("cookie") || "";
        const internalRes = await fetch(`${BASE_URL}/api/seo/keyword-push/generate-sorotan/${target.id}?count=1`, {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: cookieHeader },
        });
        const internalJson = await internalRes.json();

        if (internalJson.success && internalJson.data?.results?.[0]?.ok) {
          const sorotan = internalJson.data.results[0].sorotan;
          results.push({
            keywordId: target.id,
            keyword: target.keyword,
            ok: true,
            sorotanId: sorotan.id,
            sorotanSlug: sorotan.slug,
            sorotanUrl: sorotan.url,
          });
        } else {
          results.push({
            keywordId: target.id,
            keyword: target.keyword,
            ok: false,
            error: internalJson.error || internalJson.data?.results?.[0]?.error || "Generate failed",
          });
        }
      } catch (e) {
        results.push({
          keywordId: target.id,
          keyword: target.keyword,
          ok: false,
          error: e instanceof Error ? e.message : "Unknown",
        });
      }
    }

    return successResponse({
      processed: results.length,
      generated: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      offset,
      limit,
      total: totalCount,
      nextOffset: offset + results.length,
      done: offset + results.length >= totalCount,
      results,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
