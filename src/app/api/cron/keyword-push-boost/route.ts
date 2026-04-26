/**
 * Auto-boost cron — runs daily after sync to push keywords needing attention.
 *
 * GET /api/cron/keyword-push-boost
 *   Headers: Authorization: Bearer ${CRON_SECRET}
 *
 * Logic:
 * 1. Find HIGH priority keywords with status "needs-push" or "stagnant"
 * 2. For each (max 20/run to respect Google Indexing API quota):
 *    - Re-submit best article URL to Google Indexing API + IndexNow
 *    - Purge Cloudflare cache for article + sitemap
 *    - Update lastBoostedAt + boostCount
 * 3. Skip keywords boosted in last 24h (avoid spam)
 *
 * Recommended crontab:
 *   0 9 * * * curl -sH "Authorization: Bearer SECRET" https://jurnalishukumbandung.com/api/cron/keyword-push-boost
 *
 * Runs at 09:00 UTC (16:00 WIB) — 1 hour after daily GSC sync at 08:00 WIB so we
 * have fresh position data before deciding what to boost.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitUrlToGoogle, purgeCloudflareCache } from "@/lib/seo-utils";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
const MAX_PER_RUN = 20; // respect Google Indexing API limits (200/day overall)
const COOLDOWN_HOURS = 24; // skip keywords boosted in last 24h

interface BoostResult {
  keyword: string;
  status: "boosted" | "skipped-cooldown" | "skipped-no-article" | "failed";
  bestArticleSlug?: string;
  error?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date();
  const cooldownAt = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);

  // Pull all active keywords; we'll filter by computed status (needs-push, stagnant)
  const candidates = await prisma.targetKeyword.findMany({
    where: {
      isActive: true,
      OR: [
        { lastBoostedAt: null },
        { lastBoostedAt: { lt: cooldownAt } },
      ],
    },
    include: {
      snapshots: { orderBy: { snappedAt: "desc" }, take: 2 },
    },
  });

  // Compute "needs boost" status: priority HIGH/MEDIUM AND (currentPosition > targetPosition) AND has bestArticleSlug
  const needsBoost = candidates.filter((k) => {
    if (!k.bestArticleSlug || !k.bestArticleId) return false;
    if (k.priority === "LOW") return false;
    if (k.currentPosition === null) return false; // need data to decide
    if (k.currentPosition <= k.targetPosition) return false; // on-track
    return true; // needs-push or stagnant
  });

  // Sort: HIGH priority first, then biggest gap (currentPosition - targetPosition)
  needsBoost.sort((a, b) => {
    const pA = a.priority === "HIGH" ? 0 : 1;
    const pB = b.priority === "HIGH" ? 0 : 1;
    if (pA !== pB) return pA - pB;
    const gapA = (a.currentPosition || 0) - a.targetPosition;
    const gapB = (b.currentPosition || 0) - b.targetPosition;
    return gapB - gapA;
  });

  const toProcess = needsBoost.slice(0, MAX_PER_RUN);
  const results: BoostResult[] = [];

  for (const kw of toProcess) {
    try {
      const article = await prisma.article.findUnique({
        where: { id: kw.bestArticleId! },
        select: { id: true, slug: true, category: { select: { slug: true } } },
      });

      if (!article) {
        results.push({ keyword: kw.keyword, status: "skipped-no-article", bestArticleSlug: kw.bestArticleSlug! });
        continue;
      }

      // Submit to Google Indexing API + IndexNow
      await submitUrlToGoogle(article.slug, article.category?.slug);

      // Purge Cloudflare cache (best effort — don't fail boost if this fails)
      try {
        await purgeCloudflareCache([
          `${BASE_URL}/berita/${article.slug}`,
          BASE_URL,
        ]);
      } catch { /* ignore cache errors */ }

      // Update DB
      await prisma.article.update({
        where: { id: article.id },
        data: { lastIndexedAt: new Date(), indexStatus: "submitted" },
      });
      await prisma.targetKeyword.update({
        where: { id: kw.id },
        data: {
          lastBoostedAt: new Date(),
          boostCount: kw.boostCount + 1,
        },
      });

      results.push({ keyword: kw.keyword, status: "boosted", bestArticleSlug: article.slug });
    } catch (err) {
      results.push({
        keyword: kw.keyword,
        status: "failed",
        bestArticleSlug: kw.bestArticleSlug || undefined,
        error: err instanceof Error ? err.message : "Unknown",
      });
    }
  }

  const summary = {
    runStartedAt: startedAt.toISOString(),
    runFinishedAt: new Date().toISOString(),
    candidatesScanned: candidates.length,
    needsBoostFound: needsBoost.length,
    processed: toProcess.length,
    boosted: results.filter((r) => r.status === "boosted").length,
    failed: results.filter((r) => r.status === "failed").length,
    skipped: results.filter((r) => r.status.startsWith("skipped")).length,
    queued: Math.max(0, needsBoost.length - toProcess.length),
  };

  return NextResponse.json({ success: true, summary, results });
}
