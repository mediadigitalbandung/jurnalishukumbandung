import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

async function getGoogleAuth() {
  let creds = null;
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "google_credentials_json" },
    });
    if (setting?.value) creds = JSON.parse(setting.value);
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    }
  } catch { /* no creds */ }

  if (!creds) return null;

  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  return google.indexing({ version: "v3", auth });
}

// POST /api/seo/submit — submit article(s) to Google Indexing API
export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const body = await req.json();
    const { articleIds } = body as { articleIds: string[] };

    if (!articleIds || articleIds.length === 0) {
      return successResponse({ error: "No article IDs provided" }, 400);
    }

    // Max 50 per batch to avoid quota issues
    const ids = articleIds.slice(0, 50);

    const articles = await prisma.article.findMany({
      where: { id: { in: ids }, status: "PUBLISHED" },
      select: { id: true, slug: true, title: true },
    });

    const indexing = await getGoogleAuth();
    const results: { id: string; title: string; status: string; error?: string }[] = [];

    for (const article of articles) {
      const url = `${BASE_URL}/berita/${article.slug}`;

      if (indexing) {
        try {
          await indexing.urlNotifications.publish({
            requestBody: { url, type: "URL_UPDATED" },
          });
          await prisma.article.update({
            where: { id: article.id },
            data: { lastIndexedAt: new Date(), indexStatus: "submitted" },
          });
          results.push({ id: article.id, title: article.title, status: "submitted" });
        } catch (e) {
          const errorMsg = String(e).slice(0, 100);
          await prisma.article.update({
            where: { id: article.id },
            data: { indexStatus: "failed" },
          });
          results.push({ id: article.id, title: article.title, status: "failed", error: errorMsg });
        }
      } else {
        results.push({ id: article.id, title: article.title, status: "failed", error: "No Google credentials" });
      }

      // Rate limit: 200ms between requests
      await new Promise((r) => setTimeout(r, 200));
    }

    // Also submit to IndexNow (batch, fire & forget)
    const urls = articles.map((a) => `${BASE_URL}/berita/${a.slug}`);
    fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "jurnalishukumbandung.com",
        key: "jurnalishukumbandung",
        keyLocation: `${BASE_URL}/jurnalishukumbandung.txt`,
        urlList: urls,
      }),
    }).catch(() => {});

    const ok = results.filter((r) => r.status === "submitted").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return successResponse({ results, summary: { ok, failed, total: results.length } });
  } catch (error) {
    return errorResponse(error);
  }
}
