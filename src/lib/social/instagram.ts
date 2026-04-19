import { prisma } from "@/lib/prisma";
import type {
  ArticleForPublish,
  Platform,
  PublishResult,
  PreviewPayload,
  PreparedPost,
  SocialPublisher,
} from "./types";
import { findTemplateForPlatform, renderAndStoreTemplate } from "./template-helper";
import { generateSocialCaption } from "./caption-generator";

/**
 * Instagram Publisher — uses Instagram Graph API.
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

  /** Prepare rendered image + caption — no actual posting. */
  async prepareDraft(article: ArticleForPublish): Promise<PreparedPost> {
    const [igSettings, globalSettings] = await Promise.all([
      prisma.instagramSettings.findFirst(),
      prisma.socialMediaSettings.findFirst(),
    ]);
    const caption = await generateSocialCaption(article, {
      platform: "instagram",
      hashtagCount: igSettings?.hashtagCountTarget || 15,
      fixedHashtagsBrand: globalSettings?.fixedHashtagsBrand || [],
      fixedHashtagsPlatform: igSettings?.fixedHashtagsIg || [],
      includeLink: true,
    });

    // Try to render with a template, fall back to raw featured image
    let imageUrl = article.featuredImage;
    try {
      const template = await findTemplateForPlatform("instagram", igSettings?.aspectRatio);
      if (template) {
        imageUrl = await renderAndStoreTemplate(template, article, {
          jpegQuality: igSettings?.jpegQuality,
        });
      }
    } catch (err) {
      console.error("[IG] Template rendering failed, using raw image:", err);
    }

    return {
      platform: this.platform,
      caption,
      renderedImageUrl: imageUrl,
      postFormat: "photo",
      articleSlug: article.slug,
      articleId: article.id,
    };
  }

  async publish(article: ArticleForPublish): Promise<PublishResult> {
    if (!article.featuredImage) {
      return {
        platform: this.platform,
        status: "failed",
        errorMessage: "Instagram requires featured image",
      };
    }
    const prepared = await this.prepareDraft(article);
    return this.postPrepared(prepared);
  }

  /** Post a pre-prepared draft to Instagram. */
  async postPrepared(prepared: PreparedPost): Promise<PublishResult> {
    const global = await prisma.socialMediaSettings.findFirst();
    if (!global?.metaAccessToken || !global?.igUserId) {
      return {
        platform: this.platform,
        status: "failed",
        errorMessage: "Meta credentials not configured",
      };
    }
    if (!prepared.renderedImageUrl) {
      return {
        platform: this.platform,
        status: "failed",
        errorMessage: "No image URL in prepared draft",
      };
    }

    try {
      // Step 1: Create media container
      const containerEndpoint = `https://graph.facebook.com/v21.0/${global.igUserId}/media`;
      const containerRes = await fetch(containerEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: prepared.renderedImageUrl,
          caption: prepared.caption,
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

      // Fetch the permalink for the published post
      let externalUrl = `https://www.instagram.com/p/${publishData.id}`;
      try {
        const permalinkRes = await fetch(
          `https://graph.facebook.com/v21.0/${publishData.id}?fields=permalink&access_token=${global.metaAccessToken}`
        );
        const permalinkData = await permalinkRes.json();
        if (permalinkData.permalink) externalUrl = permalinkData.permalink;
      } catch { /* ignore */ }

      return {
        platform: this.platform,
        status: "success",
        externalPostId: publishData.id,
        externalUrl,
        postFormat: prepared.postFormat,
        captionFinal: prepared.caption,
        slidesCount: 1,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      return { platform: this.platform, status: "failed", errorMessage: msg };
    }
  }

  /**
   * Instagram Graph API does NOT support deleting published media via API.
   * Meta limitation — posts must be deleted manually from the Instagram app/website.
   * This method always returns a descriptive error so UI can handle it gracefully.
   */
  async deletePost(_externalPostId: string): Promise<{ success: boolean; error?: string }> {
    return {
      success: false,
      error: "Instagram tidak mendukung delete post via API. Hapus manual di app/web Instagram, lalu gunakan 'Tandai Dihapus' untuk update status.",
    };
  }

  async preview(article: ArticleForPublish): Promise<PreviewPayload> {
    const [igSettings, globalSettings] = await Promise.all([
      prisma.instagramSettings.findFirst(),
      prisma.socialMediaSettings.findFirst(),
    ]);
    const caption = await generateSocialCaption(article, {
      platform: "instagram",
      hashtagCount: igSettings?.hashtagCountTarget || 15,
      fixedHashtagsBrand: globalSettings?.fixedHashtagsBrand || [],
      fixedHashtagsPlatform: igSettings?.fixedHashtagsIg || [],
      includeLink: true,
    });
    return {
      platform: this.platform,
      caption,
      images: article.featuredImage ? [article.featuredImage] : [],
      postFormat: "photo",
    };
  }
}
