/**
 * SEO Routine Status — single endpoint that returns project SEO state for use by
 * scheduled Claude Routines. Lets routines triage what to work on without running
 * many separate queries.
 *
 * GET /api/seo/routine-status
 *   ?since=24h        (default 24h; supports 1h..168h)
 *   ?lookback=30      (low-perf article lookback days; default 30)
 *
 * Returns: counts + sample IDs/slugs of articles that need attention.
 *
 * Auth: requires Authorization: Bearer ${CRON_SECRET} (read-only, but cron-style header
 * keeps it locked down so accidental scrapers don't burn resources).
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ArticleSeoSnapshot {
  id: string;
  slug: string;
  title: string;
  publishedAt: string | null;
  hasSeoTitle: boolean;
  hasSeoDescription: boolean;
  hasFeaturedImage: boolean;
  indexStatus: string | null;
  lastIndexedAt: string | null;
  viewCount: number;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth gate
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sinceRaw = url.searchParams.get("since") || "24h";
  const sinceHours = Math.max(1, Math.min(168, parseInt(sinceRaw) || 24));
  const lookbackDays = Math.max(7, Math.min(180, parseInt(url.searchParams.get("lookback") || "30")));

  const sinceDate = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const lookbackDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  // 1. Articles published recently (the "new article quality gate" pool)
  const recentArticles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: sinceDate, not: null },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      publishedAt: true,
      seoTitle: true,
      seoDescription: true,
      featuredImage: true,
      indexStatus: true,
      lastIndexedAt: true,
      viewCount: true,
    },
    orderBy: { publishedAt: "desc" },
    take: 100,
  });

  const recentSnap: ArticleSeoSnapshot[] = recentArticles.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    publishedAt: a.publishedAt?.toISOString() || null,
    hasSeoTitle: !!a.seoTitle && a.seoTitle.length >= 10,
    hasSeoDescription: !!a.seoDescription && a.seoDescription.length >= 50,
    hasFeaturedImage: !!a.featuredImage,
    indexStatus: a.indexStatus,
    lastIndexedAt: a.lastIndexedAt?.toISOString() || null,
    viewCount: a.viewCount,
  }));

  // 2. Index-pending: published but never submitted, or failed
  const indexPending = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { indexStatus: { equals: null } },
        { indexStatus: "not_submitted" },
        { indexStatus: "failed" },
      ],
    },
    select: { id: true, slug: true, title: true, indexStatus: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  // 3. Stale-index: published >48h ago but lastIndexedAt is null or >7 days old
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const staleIndex = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: fortyEightHoursAgo },
      OR: [
        { lastIndexedAt: null },
        { lastIndexedAt: { lt: sevenDaysAgo } },
      ],
    },
    select: { id: true, slug: true, title: true, lastIndexedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  // 4. Low-performance candidates (low viewCount in lookback window)
  const lowPerf = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { gte: lookbackDate, not: null },
    },
    select: { id: true, slug: true, title: true, viewCount: true, publishedAt: true },
    orderBy: { viewCount: "asc" },
    take: 10,
  });

  // 5. Meta-incomplete (any published article without proper SEO meta)
  const metaIncompleteCount = await prisma.article.count({
    where: {
      status: "PUBLISHED",
      OR: [
        { seoTitle: null },
        { seoTitle: "" },
        { seoDescription: null },
        { seoDescription: "" },
        { featuredImage: null },
      ],
    },
  });

  // 6. Recent activity counts
  const totals = {
    publishedTotal: await prisma.article.count({ where: { status: "PUBLISHED" } }),
    publishedSince: recentSnap.length,
    indexPending: indexPending.length,
    staleIndex: staleIndex.length,
    metaIncomplete: metaIncompleteCount,
    lowPerfSampled: lowPerf.length,
  };

  // 7. Per-article gap summary for routine to act on
  const newArticleGaps = recentSnap
    .filter((a) => !a.hasSeoTitle || !a.hasSeoDescription || !a.hasFeaturedImage || a.indexStatus !== "submitted")
    .map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      missing: [
        !a.hasSeoTitle && "seoTitle",
        !a.hasSeoDescription && "seoDescription",
        !a.hasFeaturedImage && "featuredImage",
        a.indexStatus !== "submitted" && "indexing",
      ].filter(Boolean) as string[],
    }));

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    sinceHours,
    lookbackDays,
    totals,
    newArticleGaps,
    indexPending: indexPending.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      indexStatus: a.indexStatus,
    })),
    staleIndex: staleIndex.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      lastIndexedAt: a.lastIndexedAt?.toISOString() || null,
    })),
    lowPerformanceCandidates: lowPerf.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      viewCount: a.viewCount,
    })),
    actionHints: {
      newArticleGate: newArticleGaps.length > 0
        ? `Run /article-optimize on ${newArticleGaps.length} new article(s) with gaps`
        : "All recent articles have complete meta + indexing",
      indexingMonitor: indexPending.length > 0
        ? `Submit ${indexPending.length} article(s) to Google Indexing API via /api/seo/submit`
        : "All published articles indexed",
      lowPerfBoost: lowPerf.length > 0
        ? `Boost top ${lowPerf.length} low-performance articles via /article-optimize`
        : "No low-performance articles to boost",
    },
  });
}
