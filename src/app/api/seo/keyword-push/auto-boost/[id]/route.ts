export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { submitUrlToGoogle, purgeCloudflareCache } from "@/lib/seo-utils";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const target = await prisma.targetKeyword.findUnique({
      where: { id: params.id },
      select: { id: true, keyword: true, bestArticleId: true, bestArticleSlug: true, boostCount: true },
    });
    if (!target) return errorResponse(new Error("Target keyword not found"));
    if (!target.bestArticleSlug) return errorResponse(new Error("No best article identified — run sync first"));

    const article = await prisma.article.findUnique({
      where: { id: target.bestArticleId! },
      select: { id: true, slug: true, title: true, category: { select: { slug: true } } },
    });
    if (!article) return errorResponse(new Error("Best article not found in DB"));

    const actions: { action: string; status: string; detail?: string }[] = [];

    // Action 1: Re-submit ke Google Indexing API + IndexNow
    try {
      const result = await submitUrlToGoogle(article.slug, article.category?.slug);
      actions.push({
        action: "google-indexing",
        status: "ok",
        detail: `Submitted ${article.slug} via Google Indexing API + IndexNow`,
      });
      void result;
    } catch (e) {
      actions.push({
        action: "google-indexing",
        status: "fail",
        detail: e instanceof Error ? e.message : "Unknown",
      });
    }

    // Action 2: Purge Cloudflare cache untuk artikel + homepage
    try {
      await purgeCloudflareCache([
        `${BASE_URL}/berita/${article.slug}`,
        BASE_URL,
        `${BASE_URL}/sitemap.xml`,
      ]);
      actions.push({ action: "cache-purge", status: "ok", detail: "Cloudflare cache purged" });
    } catch (e) {
      actions.push({
        action: "cache-purge",
        status: "fail",
        detail: e instanceof Error ? e.message : "Unknown",
      });
    }

    // Action 3: Update lastIndexedAt + indexStatus
    await prisma.article.update({
      where: { id: article.id },
      data: { lastIndexedAt: new Date(), indexStatus: "submitted" },
    });
    actions.push({ action: "db-mark-submitted", status: "ok" });

    // Action 4: Update target keyword counter
    await prisma.targetKeyword.update({
      where: { id: target.id },
      data: {
        lastBoostedAt: new Date(),
        boostCount: target.boostCount + 1,
      },
    });
    actions.push({ action: "increment-boost-count", status: "ok" });

    return successResponse({
      keyword: target.keyword,
      bestArticle: { id: article.id, slug: article.slug, title: article.title },
      actions,
      success: actions.filter((a) => a.status === "ok").length,
      failed: actions.filter((a) => a.status === "fail").length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
