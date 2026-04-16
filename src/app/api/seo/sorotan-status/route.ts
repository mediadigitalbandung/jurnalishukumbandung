import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse } from "@/lib/api-utils";
import { submitUrlToGoogle } from "@/lib/seo-utils";

export const dynamic = "force-dynamic";

// GET — list all sorotan with their parent article info
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 30;

    const where = q
      ? { title: { contains: q, mode: "insensitive" as const } }
      : {};

    const [sorotan, total] = await Promise.all([
      prisma.sorotan.findMany({
        where,
        include: {
          article: {
            select: { title: true, slug: true, category: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.sorotan.count({ where }),
    ]);

    return successResponse({
      sorotan,
      total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST — submit sorotan URLs to Google Indexing API + IndexNow
export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    const body = await req.json();
    const { slugs } = body as { slugs: string[] };

    if (!slugs || slugs.length === 0) {
      return successResponse({ submitted: 0 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

    // Submit each sorotan URL to IndexNow
    const indexNowUrls = slugs.map((s) => `${baseUrl}/sorotan/${s}`);

    // Also submit to Google Indexing API if available
    let googleResults: { url: string; status: string }[] = [];
    try {
      const { submitToGoogleIndexingApi } = await import("@/lib/seo-utils").then(async (m) => {
        // Get Google credentials
        const setting = await prisma.systemSetting.findUnique({
          where: { key: "google_credentials_json" },
        });
        const credentials = setting?.value ? JSON.parse(setting.value) : null;

        return {
          submitToGoogleIndexingApi: credentials
            ? async (url: string) => {
                const { google } = await import("googleapis");
                const auth = new google.auth.JWT({
                  email: credentials.client_email,
                  key: credentials.private_key,
                  scopes: ["https://www.googleapis.com/auth/indexing"],
                });
                const indexing = google.indexing({ version: "v3", auth });
                const res = await indexing.urlNotifications.publish({
                  requestBody: { url, type: "URL_UPDATED" },
                });
                return res.data;
              }
            : null,
        };
      });

      if (submitToGoogleIndexingApi) {
        for (const url of indexNowUrls.slice(0, 10)) {
          try {
            await submitToGoogleIndexingApi(url);
            googleResults.push({ url, status: "submitted" });
          } catch {
            googleResults.push({ url, status: "failed" });
          }
        }
      }
    } catch {
      // Google API not available — continue with IndexNow only
    }

    // Submit to IndexNow
    let indexNowStatus = 0;
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
      indexNowStatus = res.status;
    } catch { /* ignore */ }

    return successResponse({
      submitted: slugs.length,
      google: googleResults,
      indexNow: { status: indexNowStatus, urls: indexNowUrls.length },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
