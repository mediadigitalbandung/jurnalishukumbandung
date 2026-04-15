import { NextRequest } from "next/server";
import { runFullSeoPing } from "@/lib/seo-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/seo-ping
 *
 * Periodic SEO automation cron job:
 * - Re-submit sitemaps to Google Search Console
 * - Ping Google & Bing sitemaps
 * - Submit key URLs to IndexNow
 *
 * Protected by CRON_SECRET bearer token.
 * Set up in crontab or external cron (e.g. every 30 minutes):
 *   curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://jurnalishukumbandung.com/api/cron/seo-ping
 */
export async function GET(req: NextRequest) {
  // Auth: require CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runFullSeoPing();
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error("[CRON] SEO ping failed:", error);
    return Response.json({ error: "SEO ping failed" }, { status: 500 });
  }
}
