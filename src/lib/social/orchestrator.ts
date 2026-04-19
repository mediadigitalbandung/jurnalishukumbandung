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

  const draftMode = !!globalSettings.draftModeEnabled;

  // Run all publishers in parallel — each platform independent
  const results = await Promise.allSettled(
    publishers.map(async (pub) => {
      const logEntry = await prisma.socialPost.create({
        data: {
          articleId,
          platform: pub.platform,
          status: draftMode ? "draft" : "pending",
        },
      });

      try {
        if (draftMode) {
          // Draft mode: render + caption only, no posting
          if (!pub.prepareDraft) {
            throw new Error(`${pub.platform} publisher does not support draft mode`);
          }
          const prepared = await pub.prepareDraft(articleData);
          await prisma.socialPost.update({
            where: { id: logEntry.id },
            data: {
              status: "draft",
              captionFinal: prepared.caption,
              renderedImageUrl: prepared.renderedImageUrl,
              postFormat: prepared.postFormat,
            },
          });
          return {
            platform: pub.platform,
            status: "draft" as const,
            captionFinal: prepared.caption,
            postFormat: prepared.postFormat,
          };
        }

        // Direct publish
        const result = await pub.publish(articleData);
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

/**
 * Approve a draft SocialPost — actually posts it to the platform.
 */
export async function approveDraft(socialPostId: string): Promise<PublishResult> {
  const draft = await prisma.socialPost.findUnique({ where: { id: socialPostId } });
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "draft") throw new Error(`Post is not a draft (status: ${draft.status})`);

  const article = await prisma.article.findUnique({ where: { id: draft.articleId }, select: { slug: true } });
  if (!article) throw new Error("Article not found");

  const publisher = draft.platform === "instagram" ? new InstagramPublisher() : new FacebookPublisher();
  if (!publisher.postPrepared) throw new Error(`${draft.platform} does not support draft approval`);

  const result = await publisher.postPrepared({
    platform: draft.platform as "instagram" | "facebook",
    caption: draft.captionFinal || "",
    renderedImageUrl: draft.renderedImageUrl,
    postFormat: draft.postFormat || "photo",
    articleSlug: article.slug,
    articleId: draft.articleId,
  });

  await prisma.socialPost.update({
    where: { id: socialPostId },
    data: {
      status: result.status,
      externalPostId: result.externalPostId,
      externalUrl: result.externalUrl,
      errorMessage: result.errorMessage,
      publishedAt: result.status === "success" ? new Date() : null,
    },
  });

  return result;
}

/**
 * Reject a draft — deletes the row + rendered image file.
 */
export async function rejectDraft(socialPostId: string): Promise<void> {
  const draft = await prisma.socialPost.findUnique({ where: { id: socialPostId } });
  if (!draft) throw new Error("Draft not found");
  if (draft.status !== "draft") throw new Error(`Post is not a draft (status: ${draft.status})`);

  // Best-effort: delete the rendered image file
  if (draft.renderedImageUrl) {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const url = new URL(draft.renderedImageUrl);
      const localPath = path.join(process.cwd(), "public", url.pathname);
      await fs.unlink(localPath);
    } catch { /* ignore */ }
  }

  await prisma.socialPost.delete({ where: { id: socialPostId } });
}

/**
 * Takedown a published post — delete from platform + mark as deleted in DB.
 */
export async function takedownPost(socialPostId: string): Promise<{ success: boolean; error?: string }> {
  const post = await prisma.socialPost.findUnique({ where: { id: socialPostId } });
  if (!post) return { success: false, error: "Post not found" };
  if (post.status !== "success" || !post.externalPostId) {
    return { success: false, error: "Post is not published or has no external ID" };
  }

  const publisher = post.platform === "instagram" ? new InstagramPublisher() : new FacebookPublisher();
  if (!publisher.deletePost) return { success: false, error: `${post.platform} does not support delete` };

  const result = await publisher.deletePost(post.externalPostId);
  if (result.success) {
    await prisma.socialPost.update({
      where: { id: socialPostId },
      data: { status: "deleted" },
    });
  }
  return result;
}
