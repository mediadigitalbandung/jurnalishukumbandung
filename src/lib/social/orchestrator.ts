import { prisma } from "@/lib/prisma";
import type { ArticleForPublish, PublishResult, SocialPublisher } from "./types";
import { FacebookPublisher } from "./facebook";
import { InstagramPublisher } from "./instagram";

/**
 * Orchestrator — entry point called from onArticlePublished.
 * Determines which platforms are enabled (global + per-article),
 * invokes each publisher in parallel, records result to social_posts table.
 */
export async function publishArticleToSocial(articleId: string): Promise<PublishResult[]> {
  // Load article with all needed data
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    include: {
      category: { select: { name: true, slug: true } },
      author: { select: { name: true } },
      tags: { select: { name: true, slug: true } },
    },
  });

  if (!article) {
    console.error(`[SOCIAL] Article ${articleId} not found`);
    return [];
  }

  // Load global settings
  const globalSettings = await prisma.socialMediaSettings.findFirst();
  if (!globalSettings?.autoPublishEnabled) {
    console.log("[SOCIAL] Auto-publish master switch is OFF");
    return [];
  }

  // Determine which platforms to publish to (per-article override > global)
  const [igSettings, fbSettings] = await Promise.all([
    prisma.instagramSettings.findFirst(),
    prisma.facebookSettings.findFirst(),
  ]);

  const publishToIg = article.publishToInstagram !== null
    ? article.publishToInstagram
    : !!igSettings?.enabled;

  const publishToFb = article.publishToFacebook !== null
    ? article.publishToFacebook
    : !!fbSettings?.enabled;

  const articleData: ArticleForPublish = {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    featuredImage: article.featuredImage,
    category: article.category,
    author: article.author,
    tags: article.tags,
    publishedAt: article.publishedAt,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
  };

  const publishers: SocialPublisher[] = [];
  if (publishToFb) publishers.push(new FacebookPublisher());
  if (publishToIg) publishers.push(new InstagramPublisher());

  if (publishers.length === 0) {
    console.log(`[SOCIAL] No platforms enabled for article ${articleId}`);
    return [];
  }

  // Run all publishers in parallel — each platform independent
  const results = await Promise.allSettled(
    publishers.map(async (pub) => {
      // Create pending log entry FIRST
      const logEntry = await prisma.socialPost.create({
        data: {
          articleId,
          platform: pub.platform,
          status: "pending",
        },
      });

      try {
        const result = await pub.publish(articleData);
        // Update log with result
        await prisma.socialPost.update({
          where: { id: logEntry.id },
          data: {
            status: result.status,
            externalPostId: result.externalPostId,
            externalUrl: result.externalUrl,
            postFormat: result.postFormat,
            captionFinal: result.captionFinal,
            slidesCount: result.slidesCount,
            errorMessage: result.errorMessage,
            publishedAt: result.status === "success" ? new Date() : undefined,
          },
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        await prisma.socialPost.update({
          where: { id: logEntry.id },
          data: { status: "failed", errorMessage: msg.slice(0, 500) },
        });
        return { platform: pub.platform, status: "failed" as const, errorMessage: msg };
      }
    })
  );

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { platform: "instagram" as const, status: "failed" as const, errorMessage: "Unknown" }
  );
}
