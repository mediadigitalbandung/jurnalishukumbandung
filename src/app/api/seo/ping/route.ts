import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import {
  pingSitemapToSearchEngines,
  submitUrlToGoogle,
  submitSitemapToSearchConsole,
  runFullSeoPing,
} from "@/lib/seo-utils";

export async function POST(req: Request) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const body = await req.json().catch(() => ({}));
    const { slug, action } = body as { slug?: string; action?: string };

    const results: Record<string, unknown> = {};

    if (action === "full") {
      // Full SEO re-ping (same as cron)
      results.fullPing = await runFullSeoPing();
    } else {
      // Ping sitemaps to Google & Bing
      results.sitemapPing = await pingSitemapToSearchEngines();

      // Submit sitemaps to Google Search Console
      results.searchConsole = await submitSitemapToSearchConsole();

      // If specific article slug provided, submit that URL too
      if (slug) {
        results.urlSubmission = await submitUrlToGoogle(slug);
      }
    }

    return successResponse(results);
  } catch (error) {
    return errorResponse(error);
  }
}
