import { prisma } from "@/lib/prisma";
import type {
  ArticleForPublish,
  Platform,
  PublishResult,
  PreviewPayload,
  PreparedPost,
  SocialPublisher,
  FacebookPostFormat,
} from "./types";
import { findTemplateForPlatform, renderAndStoreTemplate } from "./template-helper";
import { generateSocialCaption } from "./caption-generator";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

/**
 * Facebook Publisher — uses Meta Graph API.
 * Supports: link_share (default), photo (with template).
 */
export class FacebookPublisher implements SocialPublisher {
  platform: Platform = "facebook";

  async isReady(): Promise<boolean> {
    const [global, fb] = await Promise.all([
      prisma.socialMediaSettings.findFirst(),
      prisma.facebookSettings.findFirst(),
    ]);
    return !!(global?.metaAccessToken && global?.fbPageId && fb?.enabled);
  }

  async prepareDraft(article: ArticleForPublish): Promise<PreparedPost> {
    const [fbSettings, globalSettings] = await Promise.all([
      prisma.facebookSettings.findFirst(),
      prisma.socialMediaSettings.findFirst(),
    ]);
    const categoryOverride = (fbSettings?.categoryFormatOverride as Record<string, string> | null) || {};
    const postFormat = (categoryOverride[article.category.slug] as FacebookPostFormat)
      || (fbSettings?.defaultPostFormat as FacebookPostFormat)
      || "link_share";

    const caption = await generateSocialCaption(article, {
      platform: "facebook",
      hashtagCount: fbSettings?.hashtagCountTarget || 5,
      fixedHashtagsBrand: globalSettings?.fixedHashtagsBrand || [],
      fixedHashtagsPlatform: fbSettings?.fixedHashtagsFb || [],
      includeLink: true,
    });

    let renderedImageUrl: string | null = null;
    if (postFormat === "photo" && article.featuredImage) {
      try {
        const template = await findTemplateForPlatform("facebook", fbSettings?.aspectRatio);
        if (template) {
          renderedImageUrl = await renderAndStoreTemplate(template, article, {
            jpegQuality: fbSettings?.jpegQuality,
          });
        } else {
          renderedImageUrl = article.featuredImage;
        }
      } catch (err) {
        console.error("[FB] Template rendering failed, using raw image:", err);
        renderedImageUrl = article.featuredImage;
      }
    }

    return {
      platform: this.platform,
      caption,
      renderedImageUrl,
      postFormat,
      articleSlug: article.slug,
      articleId: article.id,
    };
  }

  async publish(article: ArticleForPublish): Promise<PublishResult> {
    const prepared = await this.prepareDraft(article);
    return this.postPrepared(prepared);
  }

  async postPrepared(prepared: PreparedPost): Promise<PublishResult> {
    const global = await prisma.socialMediaSettings.findFirst();
    const fbSettings = await prisma.facebookSettings.findFirst();
    if (!global?.metaAccessToken || !global?.fbPageId) {
      return {
        platform: this.platform,
        status: "failed",
        errorMessage: "Meta credentials not configured",
      };
    }

    const articleUrl = buildArticleUrl(prepared.articleSlug, fbSettings?.utmParams as Record<string, string> | null);

    try {
      if (prepared.postFormat === "link_share") {
        const result = await this.publishLinkShare(global.fbPageId, global.metaAccessToken, prepared.caption, articleUrl);
        return { ...result, renderedImageUrl: prepared.renderedImageUrl };
      }
      if (prepared.postFormat === "photo") {
        const imageUrl = prepared.renderedImageUrl;
        if (!imageUrl) {
          const result = await this.publishLinkShare(global.fbPageId, global.metaAccessToken, prepared.caption, articleUrl);
          return { ...result, renderedImageUrl: null };
        }
        const result = await this.publishPhoto(global.fbPageId, global.metaAccessToken, prepared.caption, imageUrl, articleUrl);
        return { ...result, renderedImageUrl: imageUrl };
      }
      return { platform: this.platform, status: "failed", errorMessage: "multi_photo not yet implemented" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      return { platform: this.platform, status: "failed", errorMessage: msg };
    }
  }

  async deletePost(externalPostId: string): Promise<{ success: boolean; error?: string }> {
    const global = await prisma.socialMediaSettings.findFirst();
    if (!global?.metaAccessToken) {
      return { success: false, error: "Meta access token not configured" };
    }
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${externalPostId}?access_token=${global.metaAccessToken}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        return { success: false, error: data.error?.message || `HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Unknown" };
    }
  }

  async preview(article: ArticleForPublish): Promise<PreviewPayload> {
    const [fbSettings, globalSettings] = await Promise.all([
      prisma.facebookSettings.findFirst(),
      prisma.socialMediaSettings.findFirst(),
    ]);
    const caption = await generateSocialCaption(article, {
      platform: "facebook",
      hashtagCount: fbSettings?.hashtagCountTarget || 5,
      fixedHashtagsBrand: globalSettings?.fixedHashtagsBrand || [],
      fixedHashtagsPlatform: fbSettings?.fixedHashtagsFb || [],
      includeLink: true,
    });
    const articleUrl = buildArticleUrl(article.slug, fbSettings?.utmParams as Record<string, string> | null);

    return {
      platform: this.platform,
      caption,
      images: article.featuredImage ? [article.featuredImage] : [],
      linkPreview: {
        title: article.seoTitle || article.title,
        description: article.seoDescription || article.excerpt || "",
        image: article.featuredImage || `${BASE_URL}/logo-jhb.png`,
        url: articleUrl,
      },
      postFormat: fbSettings?.defaultPostFormat || "link_share",
    };
  }

  private async publishLinkShare(pageId: string, token: string, message: string, url: string): Promise<PublishResult> {
    const endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, link: url, access_token: token }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        platform: this.platform,
        status: "failed",
        errorMessage: data.error?.message || `HTTP ${res.status}`,
      };
    }
    return {
      platform: this.platform,
      status: "success",
      externalPostId: data.id,
      externalUrl: data.id ? `https://facebook.com/${data.id}` : undefined,
      postFormat: "link_share",
      captionFinal: message,
    };
  }

  private async publishPhoto(pageId: string, token: string, message: string, imageUrl: string, articleUrl: string): Promise<PublishResult> {
    const endpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        message: `${message}\n\n${articleUrl}`,
        access_token: token,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return {
        platform: this.platform,
        status: "failed",
        errorMessage: data.error?.message || `HTTP ${res.status}`,
      };
    }
    return {
      platform: this.platform,
      status: "success",
      externalPostId: data.post_id || data.id,
      externalUrl: data.post_id ? `https://facebook.com/${data.post_id}` : undefined,
      postFormat: "photo",
      captionFinal: message,
    };
  }

}

function buildArticleUrl(slug: string, utm?: Record<string, string> | null): string {
  const url = `${BASE_URL}/berita/${slug}`;
  if (!utm) return url;
  const params = new URLSearchParams(utm);
  return `${url}?${params.toString()}`;
}
