import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyArticleStatusChange } from "@/lib/notifications";
import { sendArticlePublishedEmail } from "@/lib/email";
import { ApiError, successResponse, errorResponse } from "@/lib/api-utils";
import { onArticlePublished } from "@/lib/seo-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      throw new ApiError("Unauthorized", 401);
    }

    const now = new Date();
    const articles = await prisma.article.findMany({
      where: {
        status: "APPROVED",
        scheduledAt: { lte: now },
      },
      select: { id: true, title: true, slug: true, authorId: true, categoryId: true, scheduledAt: true },
    });

    if (articles.length === 0) {
      return successResponse({ published: 0, titles: [] });
    }

    // Batch fetch all authors in one query (avoid N+1)
    const authorIds = Array.from(new Set(articles.map(a => a.authorId)));
    const authors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, email: true },
    });
    const authorMap = new Map(authors.map(u => [u.id, u]));

    const published = [];
    for (const article of articles) {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          status: "PUBLISHED",
          publishedAt: article.scheduledAt || now,
          scheduledAt: null,
        },
      });
      await notifyArticleStatusChange(article.id, article.title, "PUBLISHED", article.authorId);
      const author = authorMap.get(article.authorId);
      if (author) await sendArticlePublishedEmail(author.email, article.title, article.slug);
      // SEO automation (non-blocking)
      onArticlePublished(article.slug, article.id, article.categoryId).catch(() => {});
      published.push(article.title);
    }

    return successResponse({
      published: published.length,
      titles: published,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
