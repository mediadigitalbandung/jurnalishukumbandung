import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { FacebookPublisher } from "@/lib/social/facebook";
import { InstagramPublisher } from "@/lib/social/instagram";
import type { ArticleForPublish } from "@/lib/social/types";

export const dynamic = "force-dynamic";

/** POST — preview what will be published (no actual API call to Meta) */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { articleId, platform } = await req.json() as { articleId: string; platform: "instagram" | "facebook" };

    if (!articleId || !platform) throw new ApiError("articleId dan platform diperlukan", 400);

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        category: { select: { name: true, slug: true } },
        author: { select: { name: true } },
        tags: { select: { name: true, slug: true } },
      },
    });
    if (!article) throw new ApiError("Artikel tidak ditemukan", 404);

    const articleData: ArticleForPublish = {
      id: article.id, title: article.title, slug: article.slug,
      excerpt: article.excerpt, content: article.content,
      featuredImage: article.featuredImage, category: article.category,
      author: article.author, tags: article.tags,
      publishedAt: article.publishedAt,
      seoTitle: article.seoTitle, seoDescription: article.seoDescription,
    };

    const publisher = platform === "instagram" ? new InstagramPublisher() : new FacebookPublisher();
    const preview = await publisher.preview(articleData);

    return successResponse(preview);
  } catch (error) {
    return errorResponse(error);
  }
}
