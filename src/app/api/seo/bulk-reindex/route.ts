import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { submitSitemapToSearchConsole, pingSitemapToSearchEngines } from "@/lib/seo-utils";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

/**
 * POST /api/seo/bulk-reindex
 *
 * Submit all published articles to Google Indexing API + IndexNow.
 * Google Indexing API limit: ~200 URLs/day.
 * IndexNow: no hard limit.
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const body = await req.json().catch(() => ({}));
    const { limit = 200 } = body as { limit?: number };

    // Get all published articles
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: Math.min(limit, 500),
    });

    if (articles.length === 0) {
      return successResponse({ message: "Tidak ada artikel published", submitted: 0 });
    }

    // Build URL list
    const articleUrls = articles.map((a) => `${BASE_URL}/berita/${a.slug}`);

    // Also include key pages
    const keyPages = [
      BASE_URL,
      `${BASE_URL}/berita`,
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/news-sitemap.xml`,
    ];

    // Load Google credentials from DB
    const credSetting = await prisma.systemSetting.findUnique({
      where: { key: "google_credentials_json" },
    });
    const credJson = credSetting?.value || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

    const results: {
      googleIndexingApi: { submitted: number; errors: number };
      indexNow: { submitted: number; status: number };
      searchConsole: any;
      sitemapPing: any;
    } = {
      googleIndexingApi: { submitted: 0, errors: 0 },
      indexNow: { submitted: 0, status: 0 },
      searchConsole: null,
      sitemapPing: null,
    };

    // 1. Google Indexing API — submit in batches of 10 with small delay
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

        // Submit in batches of 10
        const batchSize = 10;
        const urlsToSubmit = articleUrls.slice(0, 200); // Google limit ~200/day

        for (let i = 0; i < urlsToSubmit.length; i += batchSize) {
          const batch = urlsToSubmit.slice(i, i + batchSize);
          const batchResults = await Promise.allSettled(
            batch.map((url) =>
              indexing.urlNotifications.publish({
                requestBody: { url, type: "URL_UPDATED" },
              })
            )
          );

          for (const r of batchResults) {
            if (r.status === "fulfilled") {
              results.googleIndexingApi.submitted++;
            } else {
              results.googleIndexingApi.errors++;
            }
          }

          // Small delay between batches to avoid rate limiting
          if (i + batchSize < urlsToSubmit.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        console.log(`[SEO BULK] Google Indexing API: ${results.googleIndexingApi.submitted} submitted, ${results.googleIndexingApi.errors} errors`);
      } catch (error) {
        console.error("[SEO BULK] Google Indexing API error:", error);
      }
    }

    // 2. IndexNow — batch submit all URLs (Bing, Yandex, Naver, Seznam)
    try {
      const allUrls = [...keyPages, ...articleUrls];
      // IndexNow accepts max 10,000 URLs per request
      const indexNowBatchSize = 10000;

      for (let i = 0; i < allUrls.length; i += indexNowBatchSize) {
        const batch = allUrls.slice(i, i + indexNowBatchSize);
        const res = await fetch("https://api.indexnow.org/indexnow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: "jurnalishukumbandung.com",
            key: "jurnalishukumbandung",
            keyLocation: `${BASE_URL}/jurnalishukumbandung.txt`,
            urlList: batch,
          }),
        });
        results.indexNow.submitted += batch.length;
        results.indexNow.status = res.status;
      }

      console.log(`[SEO BULK] IndexNow: ${results.indexNow.submitted} URLs submitted`);
    } catch (error) {
      console.error("[SEO BULK] IndexNow error:", error);
    }

    // 3. Submit sitemaps to Google Search Console
    results.searchConsole = await submitSitemapToSearchConsole().catch(() => null);

    // 4. Ping sitemaps to Google & Bing
    results.sitemapPing = await pingSitemapToSearchEngines().catch(() => null);

    return successResponse({
      message: `Berhasil submit ${articles.length} artikel`,
      totalArticles: articles.length,
      ...results,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
