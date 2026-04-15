import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  runFullSeoPing,
  pingSitemapToSearchEngines,
  submitSitemapToSearchConsole,
} from "@/lib/seo-utils";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

/**
 * GET /api/cron/seo-ping?mode=ping|reindex
 *
 * Two modes:
 * - mode=ping (default): Light ping — re-submit sitemaps, ping Google & Bing
 * - mode=reindex: Full re-index — submit all articles to Google Indexing API + IndexNow
 *
 * Protected by CRON_SECRET bearer token.
 *
 * Recommended crontab (WIB = UTC+7):
 *
 *   # Light ping every 30 minutes
 *   * /30 * * * * curl -sH "Authorization: Bearer SECRET" https://jurnalishukumbandung.com/api/cron/seo-ping
 *
 *   # Full re-index 3x/day at prime time (06:00, 12:00, 19:00 WIB)
 *   0 23,5,12 * * * curl -sH "Authorization: Bearer SECRET" "https://jurnalishukumbandung.com/api/cron/seo-ping?mode=reindex"
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = req.nextUrl.searchParams.get("mode") || "ping";

  try {
    if (mode === "reindex") {
      // Full re-index: submit all published articles
      const result = await runAutoReindex();
      return Response.json({
        success: true,
        mode: "reindex",
        timestamp: new Date().toISOString(),
        ...result,
      });
    }

    // Default: light ping
    const results = await runFullSeoPing();
    return Response.json({
      success: true,
      mode: "ping",
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error(`[CRON] SEO ${mode} failed:`, error);
    return Response.json({ error: `SEO ${mode} failed` }, { status: 500 });
  }
}

/**
 * Full auto re-index:
 * 1. Submit recent articles (last 7 days) to Google Indexing API (priority)
 * 2. Submit ALL articles to IndexNow (no limit)
 * 3. Re-submit sitemaps to Search Console
 * 4. Ping Google & Bing
 */
async function runAutoReindex() {
  const results = {
    googleIndexingApi: { submitted: 0, errors: 0, total: 0 },
    indexNow: { submitted: 0, status: 0 },
    searchConsole: null as any,
    sitemapPing: null as any,
  };

  // Get all published articles
  const allArticles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const allUrls = allArticles.map((a) => `${BASE_URL}/berita/${a.slug}`);

  // Recent articles (last 7 days) get priority for Google Indexing API (200/day limit)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentArticles = allArticles.filter(
    (a) => a.publishedAt && a.publishedAt > sevenDaysAgo
  );
  // Fill remaining quota with older articles
  const olderArticles = allArticles.filter(
    (a) => !a.publishedAt || a.publishedAt <= sevenDaysAgo
  );

  const googleBatch = [
    ...recentArticles.map((a) => `${BASE_URL}/berita/${a.slug}`),
    ...olderArticles.map((a) => `${BASE_URL}/berita/${a.slug}`),
  ].slice(0, 200); // Google limit

  results.googleIndexingApi.total = googleBatch.length;

  // 1. Google Indexing API
  const credSetting = await prisma.systemSetting.findUnique({
    where: { key: "google_credentials_json" },
  });
  const credJson = credSetting?.value || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (credJson) {
    try {
      const credentials = JSON.parse(credJson);
      const { google } = await import("googleapis");
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/indexing"],
      });
      const indexing = google.indexing({ version: "v3", auth });

      // Batch of 10 with small delay
      for (let i = 0; i < googleBatch.length; i += 10) {
        const batch = googleBatch.slice(i, i + 10);
        const batchResults = await Promise.allSettled(
          batch.map((url) =>
            indexing.urlNotifications.publish({
              requestBody: { url, type: "URL_UPDATED" },
            })
          )
        );
        for (const r of batchResults) {
          if (r.status === "fulfilled") results.googleIndexingApi.submitted++;
          else results.googleIndexingApi.errors++;
        }
        if (i + 10 < googleBatch.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } catch (error) {
      console.error("[CRON REINDEX] Google Indexing API error:", error);
    }
  }

  // 2. IndexNow — all articles at once (no limit)
  try {
    const keyPages = [BASE_URL, `${BASE_URL}/berita`, `${BASE_URL}/sitemap.xml`, `${BASE_URL}/news-sitemap.xml`];
    const indexNowUrls = [...keyPages, ...allUrls];
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "jurnalishukumbandung.com",
        key: "jurnalishukumbandung",
        keyLocation: `${BASE_URL}/jurnalishukumbandung.txt`,
        urlList: indexNowUrls.slice(0, 10000),
      }),
    });
    results.indexNow = { submitted: Math.min(indexNowUrls.length, 10000), status: res.status };
  } catch (error) {
    console.error("[CRON REINDEX] IndexNow error:", error);
  }

  // 3. Search Console sitemap submit
  results.searchConsole = await submitSitemapToSearchConsole().catch(() => null);

  // 4. Ping sitemaps
  results.sitemapPing = await pingSitemapToSearchEngines().catch(() => null);

  console.log(
    `[CRON REINDEX] Done. Google: ${results.googleIndexingApi.submitted}/${results.googleIndexingApi.total}, IndexNow: ${results.indexNow.submitted}, articles total: ${allArticles.length}`
  );

  return results;
}
