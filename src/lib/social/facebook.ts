import { prisma } from "@/lib/prisma";
import type {
  ArticleForPublish,
  Platform,
  PublishResult,
  PreviewPayload,
  SocialPublisher,
  FacebookPostFormat,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

/**
 * Facebook Publisher — uses Meta Graph API.
 * Primary format: link_share (auto-generates preview card from OG tags).
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

  async publish(article: ArticleForPublish): Promise<PublishResult> {
    const global = await prisma.socialMediaSettings.findFirst();
    const fbSettings = await prisma.facebookSettings.findFirst();

    if (!global?.metaAccessToken || !global?.fbPageId) {
      return {
        platform: this.platform,
        status: "failed",
        errorMessage: "Meta credentials not configured",
      };
    }

    // Determine post format (per-category override or default)
    const categoryOverride = (fbSettings?.categoryFormatOverride as Record<string, string> | null) || {};
    const postFormat = (categoryOverride[article.category.slug] as FacebookPostFormat) || (fbSettings?.defaultPostFormat as FacebookPostFormat) || "link_share";

    // Generate caption (placeholder — will be replaced by AI in Milestone B)
    const caption = await this.generateCaption(article, fbSettings);
    const articleUrl = buildArticleUrl(article.slug, fbSettings?.utmParams as Record<string, string> | null);

    try {
      if (postFormat === "link_share") {
        return await this.publishLinkShare(global.fbPageId, global.metaAccessToken, caption, articleUrl);
      }
      if (postFormat === "photo") {
        return await this.publishPhoto(global.fbPageId, global.metaAccessToken, caption, article.featuredImage || "", articleUrl);
      }
      // multi_photo — not implemented in MVP
      return { platform: this.platform, status: "failed", errorMessage: "multi_photo not yet implemented" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown";
      return { platform: this.platform, status: "failed", errorMessage: msg };
    }
  }

  async preview(article: ArticleForPublish): Promise<PreviewPayload> {
    const fbSettings = await prisma.facebookSettings.findFirst();
    const caption = await this.generateCaption(article, fbSettings);
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

  /** Link-share post — FB auto-generates preview from OG tags. */
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

  /** Photo post — single image + message (link included in message). */
  private async publishPhoto(pageId: string, token: string, message: string, imageUrl: string, articleUrl: string): Promise<PublishResult> {
    if (!imageUrl) {
      // Fallback to link-share
      return this.publishLinkShare(pageId, token, message, articleUrl);
    }
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
      postFormat: "photo",
      captionFinal: message,
    };
  }

  /** Generate caption — placeholder template for now, AI integration later. */
  private async generateCaption(article: ArticleForPublish, fbSettings: { fixedHashtagsFb?: string[]; hashtagCountTarget?: number } | null): Promise<string> {
    const title = article.seoTitle || article.title;
    const teaser = article.excerpt || article.content.replace(/<[^>]+>/g, "").slice(0, 300);
    const hashtags = (fbSettings?.fixedHashtagsFb || []).slice(0, fbSettings?.hashtagCountTarget || 4).map((h) => h.startsWith("#") ? h : `#${h}`).join(" ");

    return `${title}\n\n${teaser}\n\n${hashtags}`.trim();
  }
}

function buildArticleUrl(slug: string, utm?: Record<string, string> | null): string {
  const url = `${BASE_URL}/berita/${slug}`;
  if (!utm) return url;
  const params = new URLSearchParams(utm);
  return `${url}?${params.toString()}`;
}
