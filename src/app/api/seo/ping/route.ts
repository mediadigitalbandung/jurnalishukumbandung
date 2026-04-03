import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { pingSitemapToSearchEngines, submitUrlToGoogle } from "@/lib/seo-utils";

export async function POST(req: Request) {
  try {
    await requireRole(["SUPER_ADMIN", "CHIEF_EDITOR"]);

    const body = await req.json().catch(() => ({}));
    const { slug } = body as { slug?: string };

    const results: Record<string, unknown> = {};

    // Ping sitemap to search engines
    results.sitemapPing = await pingSitemapToSearchEngines();

    // If specific article slug provided, submit that URL too
    if (slug) {
      results.urlSubmission = await submitUrlToGoogle(slug);
    }

    return successResponse(results);
  } catch (error) {
    return errorResponse(error);
  }
}
