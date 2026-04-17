import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    // Get all published articles
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, category: { select: { slug: true } } },
      orderBy: { publishedAt: "desc" },
    });

    // Build all URLs to submit
    const urls: string[] = [
      BASE_URL,
      `${BASE_URL}/berita`,
    ];

    // Add all category pages
    const categories = await prisma.category.findMany({ select: { slug: true } });
    for (const cat of categories) {
      urls.push(`${BASE_URL}/kategori/${cat.slug}`);
    }

    // Add all article URLs
    for (const article of articles) {
      urls.push(`${BASE_URL}/berita/${article.slug}`);
    }

    const results: Record<string, unknown> = {
      totalUrls: urls.length,
      submitted: { google: 0, indexNow: 0 },
    };

    // 1. Google Indexing API — submit in batches of 10 (rate limit)
    let googleCredentials = null;
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "google_credentials_json" },
      });
      if (setting?.value) googleCredentials = JSON.parse(setting.value);
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        googleCredentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      }
    } catch { /* no credentials */ }

    if (googleCredentials) {
      const { google } = await import("googleapis");
      const auth = new google.auth.JWT({
        email: googleCredentials.client_email,
        key: googleCredentials.private_key,
        scopes: ["https://www.googleapis.com/auth/indexing"],
      });
      const indexing = google.indexing({ version: "v3", auth });

      // Submit in batches with delay to respect rate limits
      const batchSize = 10;
      const googleErrors: string[] = [];
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map((url) =>
            indexing.urlNotifications.publish({
              requestBody: { url, type: "URL_UPDATED" },
            })
          )
        );
        for (const r of batchResults) {
          if (r.status === "fulfilled") (results.submitted as Record<string, number>).google++;
          else googleErrors.push(String(r.reason).slice(0, 100));
        }
        // Small delay between batches
        if (i + batchSize < urls.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      if (googleErrors.length > 0) {
        results.googleErrors = googleErrors.slice(0, 5);
      }
    } else {
      results.googleNote = "No Google credentials configured";
    }

    // 2. IndexNow — batch submit to Bing/Yandex (max 10000 per request)
    try {
      const indexNowRes = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: "jurnalishukumbandung.com",
          key: "46c220e15eca4f9db0a70049aa82a734",
          keyLocation: `${BASE_URL}/46c220e15eca4f9db0a70049aa82a734.txt`,
          urlList: urls.slice(0, 10000),
        }),
      });
      (results.submitted as Record<string, number>).indexNow = urls.length;
      results.indexNowStatus = indexNowRes.status;
    } catch (e) {
      results.indexNowError = String(e).slice(0, 100);
    }

    // 3. Ping sitemaps
    const sitemapUrls = [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(`${BASE_URL}/sitemap.xml`)}`,
      `https://www.google.com/ping?sitemap=${encodeURIComponent(`${BASE_URL}/news-sitemap.xml`)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(`${BASE_URL}/sitemap.xml`)}`,
    ];
    await Promise.allSettled(sitemapUrls.map((url) => fetch(url)));
    results.sitemapsPinged = sitemapUrls.length;

    return successResponse(results);
  } catch (error) {
    return errorResponse(error);
  }
}
