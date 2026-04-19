import { prisma } from "@/lib/prisma";
import type {
  ArticleForPublish,
  Platform,
  PublishResult,
  PreviewPayload,
  SocialPublisher,
} from "./types";
import { findTemplateForPlatform, renderAndStoreTemplate } from "./template-helper";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

/**
 * Instagram Publisher — uses Instagram Graph API.
 * Primary format: Carousel (image + CTA slide).
 * NOTE: Full image processing (sharp, watermark, CTA) deferred to Milestone C.
 *       MVP publishes single-image post with caption.
 */
export class InstagramPublisher implements SocialPublisher {
  platform: Platform = "instagram";

  async isReady(): Promise<boolean> {
    const [global, ig] = await Promise.all([
      prisma.socialMediaSettings.findFirst(),
      prisma.instagramSettings.findFirst(),
    ]);
    return !!(global?.metaAccessToken && global?.igUserId && ig?.enabled);
  }

  async publish(article: ArticleForPublish): Promise<PublishResult> {
    const global = await prisma.socialMediaSettings.findFirst();
    const igSettings = await prisma.instagramSettings.findFirst();

    if (!global?.metaAccessToken || !global?.igUserId) {
      return {
        platform: this.platform,
        status: "failed",
        errorMessage: "Meta credentials not configured",
      };
    }

    if (!article.featuredImage) {
      return {
        platform: this.platform,
        status: "failed",
        errorMessage: "Instagram requires featured image",
      };
    }

    const caption = await this.generateCaption(article, igSettings);

    // Try to render with a template, fall back to raw featured image
    let imageUrl = article.featuredImage;
    try {
      const template = await findTemplateForPlatform("instagram", igSettings?.aspectRatio);
      if (template) {
        imageUrl = await renderAndStoreTemplate(template, article, {
          jpegQuality: igSettings?.jpegQuality,
        });
        console.log(`[IG] Using template, rendered image: ${imageUrl}`);
      }
    } catch (err) {
      console.error("[IG] Template rendering failed, using raw image:", err);
    }

    try {
      // Step 1: Create media container
      const containerEndpoint = `https://graph.facebook.com/v21.0/${global.igUserId}/media`;
      const containerRes = await fetch(containerEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: global.metaAccessToken,
        }),
      });
      const containerData = await containerRes.json();
      if (!containerRes.ok || containerData.error) {
        return {
          platform: this.platform,
          status: "failed",
          errorMessage: containerData.error?.message || `Container creation failed: HTTP ${containerRes.status}`,
        };
      }

      // Step 2: Publish media
      const publishEndpoint = `https://graph.facebook.com/v21.0/${global.igUserId}/media_publish`;
      const publishRes = await fetch(publishEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: global.metaAccessToken,
        }),
      });
      const publishData = await publishRes.json();
      if (!publishRes.ok || publishData.error) {
        return {
          platform: this.platform,
          status: "failed",
          errorMessage: publishData.error?.message || `Publish failed: HTTP ${publishRes.status}`,
        };
      }

      return {
        platform: this.platform,
        status: "success",
        externalPostId: publishData.id,
        externalUrl: `https://www.instagram.com/p/${publishData.id}`,
        postFormat: "photo",
        captionFinal: caption,
        slidesCount: 1,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      return { platform: this.platform, status: "failed", errorMessage: msg };
    }
  }

  async preview(article: ArticleForPublish): Promise<PreviewPayload> {
    const igSettings = await prisma.instagramSettings.findFirst();
    const caption = await this.generateCaption(article, igSettings);
    return {
      platform: this.platform,
      caption,
      images: article.featuredImage ? [article.featuredImage] : [],
      postFormat: "carousel",
    };
  }

  /** Generate caption — placeholder, AI integration later. */
  private async generateCaption(article: ArticleForPublish, igSettings: { fixedHashtagsIg?: string[]; hashtagCountTarget?: number } | null): Promise<string> {
    const title = article.seoTitle || article.title;
    const teaser = article.excerpt || article.content.replace(/<[^>]+>/g, "").slice(0, 800);
    const hashtags = (igSettings?.fixedHashtagsIg || [])
      .slice(0, igSettings?.hashtagCountTarget || 12)
      .map((h) => h.startsWith("#") ? h : `#${h}`)
      .join(" ");
    const cta = "Baca selengkapnya di link bio → @jurnalishukumbdg";

    return `${title}\n\n${teaser}\n\n${cta}\n\n${hashtags}`.trim();
  }
}
