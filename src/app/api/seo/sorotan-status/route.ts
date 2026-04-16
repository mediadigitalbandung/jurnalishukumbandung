import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET — list sorotan with stats + filter
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const filter = searchParams.get("filter") || "all"; // "all", "submitted", "not_submitted", "failed"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 30;

    const where: Record<string, unknown> = {};
    if (q) where.title = { contains: q, mode: "insensitive" };
    if (filter === "submitted") where.indexStatus = "submitted";
    else if (filter === "failed") where.indexStatus = "failed";
    else if (filter === "not_submitted") where.indexStatus = null;

    const [sorotan, total, submitted, failed, notSubmitted] = await Promise.all([
      prisma.sorotan.findMany({
        where,
        include: {
          article: { select: { title: true, slug: true, category: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sorotan.count({ where }),
      prisma.sorotan.count({ where: { indexStatus: "submitted" } }),
      prisma.sorotan.count({ where: { indexStatus: "failed" } }),
      prisma.sorotan.count({ where: { indexStatus: null } }),
    ]);

    const totalAll = submitted + failed + notSubmitted;

    return successResponse({
      sorotan,
      total,
      stats: { total: totalAll, submitted, failed, notSubmitted },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST — submit sorotan URLs to Google Indexing API + IndexNow, track status
export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const body = await req.json();
    const { slugs } = body as { slugs: string[] };

    if (!slugs || slugs.length === 0) {
      return successResponse({ submitted: 0 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
    const indexNowUrls = slugs.map((s) => `${baseUrl}/sorotan/${s}`);

    // 1. Google Indexing API
    let googleOk = 0;
    let googleFail = 0;
    let googleAvailable = false;
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: "google_credentials_json" },
      });
      const credentials = setting?.value ? JSON.parse(setting.value) : null;

      if (credentials) {
        googleAvailable = true;
        const { google } = await import("googleapis");
        const auth = new google.auth.JWT({
          email: credentials.client_email,
          key: credentials.private_key,
          scopes: ["https://www.googleapis.com/auth/indexing"],
        });
        const indexing = google.indexing({ version: "v3", auth });

        for (let i = 0; i < Math.min(slugs.length, 20); i++) {
          const url = `${baseUrl}/sorotan/${slugs[i]}`;
          try {
            await indexing.urlNotifications.publish({
              requestBody: { url, type: "URL_UPDATED" },
            });
            await prisma.sorotan.updateMany({
              where: { slug: slugs[i] },
              data: { indexStatus: "submitted", lastIndexedAt: new Date() },
            });
            googleOk++;
          } catch {
            await prisma.sorotan.updateMany({
              where: { slug: slugs[i] },
              data: { indexStatus: "failed" },
            });
            googleFail++;
          }
        }
      }
    } catch {
      // Google API error
    }

    // 2. IndexNow (Bing/Yandex)
    let indexNowOk = false;
    try {
      const key = "acababc0b4221f7d8becd200e2bb2627";
      const res = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: "jurnalishukumbandung.com",
          key,
          keyLocation: `${baseUrl}/${key}.txt`,
          urlList: indexNowUrls,
        }),
      });
      indexNowOk = res.status >= 200 && res.status < 300;
    } catch { /* ignore */ }

    // 3. Update status based on actual results
    if (!googleAvailable) {
      // No Google credentials — status based on IndexNow result
      const status = indexNowOk ? "submitted" : "failed";
      await prisma.sorotan.updateMany({
        where: { slug: { in: slugs } },
        data: { indexStatus: status, lastIndexedAt: indexNowOk ? new Date() : undefined },
      });
    }

    return successResponse({
      submitted: slugs.length,
      google: { available: googleAvailable, ok: googleOk, failed: googleFail },
      indexNow: { ok: indexNowOk, urls: indexNowUrls.length },
      message: googleAvailable
        ? `Google: ${googleOk} ok, ${googleFail} gagal. IndexNow: ${indexNowOk ? "ok" : "gagal"}`
        : `IndexNow: ${indexNowOk ? "berhasil" : "gagal"} (Google credentials belum diset)`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
