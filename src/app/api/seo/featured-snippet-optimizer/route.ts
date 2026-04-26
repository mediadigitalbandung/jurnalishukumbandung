/**
 * Featured Snippet Optimizer — pulls Google Search Console search analytics,
 * identifies queries where JHB pages rank position 4-10 (peluang naik ke top 3
 * dengan optimasi konten → eligible for Featured Snippet).
 *
 * GET /api/seo/featured-snippet-optimizer
 *   Headers: Authorization: Bearer ${CRON_SECRET}
 *   Params: ?days=28 (default 28, max 90), ?minImpressions=10 (default 10)
 *
 * Returns: list of opportunities sorted by impressions descending.
 * Each entry includes: query, page URL, position, clicks, impressions, CTR,
 * + actionable suggestion (rewrite intro paragraph as direct answer to query).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

interface SearchRow {
  query: string;
  page: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
}

interface SnippetOpportunity {
  query: string;
  url: string;
  slug: string | null;
  articleId: string | null;
  articleTitle: string | null;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  estimatedTrafficGain: number;
  suggestion: string;
}

async function getCredentials() {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (fromEnv) {
    try { return JSON.parse(fromEnv); } catch { /* ignore */ }
  }
  const fromDb = await prisma.systemSetting.findUnique({
    where: { key: "google_credentials_json" },
  });
  if (fromDb?.value) {
    try { return JSON.parse(fromDb.value); } catch { /* ignore */ }
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.max(7, Math.min(90, parseInt(url.searchParams.get("days") || "28")));
  const minImpressions = Math.max(1, parseInt(url.searchParams.get("minImpressions") || "10"));

  try {
    const credentials = await getCredentials();
    if (!credentials) {
      return NextResponse.json({ error: "Google credentials not configured" }, { status: 503 });
    }

    const jwt = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
    });

    const searchconsole = google.searchconsole({ version: "v1", auth: jwt });

    const endDate = new Date().toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const response = await searchconsole.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: {
        startDate,
        endDate,
        dimensions: ["query", "page"],
        rowLimit: 1000,
        startRow: 0,
      },
    });

    const rows = (response.data.rows || []) as Array<{
      keys: string[];
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;

    // Filter to opportunities: position 4-10, min impressions threshold
    const opportunities: SnippetOpportunity[] = [];
    const slugRegex = /\/berita\/([a-z0-9-]+)/i;

    // Pre-fetch article data for matched slugs
    const allSlugs = new Set<string>();
    for (const row of rows) {
      const url = row.keys[1] || "";
      const m = url.match(slugRegex);
      if (m) allSlugs.add(m[1]);
    }

    const articles = await prisma.article.findMany({
      where: { slug: { in: Array.from(allSlugs) } },
      select: { id: true, slug: true, title: true },
    });
    const slugMap = new Map(articles.map((a) => [a.slug, a]));

    for (const row of rows) {
      const position = row.position || 100;
      const impressions = row.impressions || 0;
      if (position < 4 || position > 10) continue;
      if (impressions < minImpressions) continue;

      const query = row.keys[0] || "";
      const pageUrl = row.keys[1] || "";
      const slugMatch = pageUrl.match(slugRegex);
      const slug = slugMatch ? slugMatch[1] : null;
      const article = slug ? slugMap.get(slug) : null;

      // Estimated traffic gain if moved from current position to position 1
      // CTR: pos1 ~30%, pos5 ~5%, pos10 ~2%
      const ctrAtCurrentPos = row.ctr || 0;
      const estimatedCtrAtTop = 0.30; // conservative
      const trafficGain = Math.round(impressions * (estimatedCtrAtTop - ctrAtCurrentPos));

      // Suggest action
      const suggestion = generateSuggestion(query, position);

      opportunities.push({
        query,
        url: pageUrl,
        slug,
        articleId: article?.id || null,
        articleTitle: article?.title || null,
        position: Math.round(position * 10) / 10,
        impressions,
        clicks: row.clicks || 0,
        ctr: Math.round(ctrAtCurrentPos * 10000) / 100, // %
        estimatedTrafficGain: Math.max(0, trafficGain),
        suggestion,
      });
    }

    // Sort by impressions descending (highest opportunity first)
    opportunities.sort((a, b) => b.impressions - a.impressions);

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      siteUrl: SITE_URL,
      dateRange: { startDate, endDate, days },
      totals: {
        rowsScanned: rows.length,
        opportunities: opportunities.length,
        totalEstimatedTrafficGain: opportunities.reduce((sum, o) => sum + o.estimatedTrafficGain, 0),
      },
      opportunities: opportunities.slice(0, 50),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function generateSuggestion(query: string, position: number): string {
  const isQuestion = /^(apa|siapa|kapan|dimana|mengapa|bagaimana|berapa|kenapa)\s/i.test(query);
  const proximity = position < 6 ? "dekat" : "sedang";

  if (isQuestion) {
    return `Posisi ${proximity} (${position.toFixed(1)}). Tambahkan paragraf jawaban LANGSUNG di awal artikel (40-60 kata) yang merespons "${query}" — Google sering ambil paragraf pertama untuk Featured Snippet.`;
  }
  return `Posisi ${proximity} (${position.toFixed(1)}). Pertimbangkan: (1) tambahkan H2 yang exact match keyword "${query}", (2) buat list/table di bawahnya (Google suka format snippet), (3) refresh artikel dengan info terbaru + ubah publishedAt jika relevan.`;
}
