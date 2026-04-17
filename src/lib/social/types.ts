/**
 * Platform-agnostic types for social media auto-publishing.
 * Used by IG, FB, and future platforms (Threads, X, TikTok).
 */

export type Platform = "instagram" | "facebook" | "threads" | "x";

export type FacebookPostFormat = "link_share" | "photo" | "multi_photo";

export type PublishStatus = "pending" | "success" | "failed";

export interface ArticleForPublish {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featuredImage: string | null;
  category: { name: string; slug: string };
  author: { name: string };
  tags: { name: string; slug: string }[];
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PlatformConfig {
  platform: Platform;
  enabled: boolean;
  captionToneOverride?: string | null;
  hashtagCountTarget: number;
  fixedHashtags: string[];
  // Platform-specific extras as generic map
  extras?: Record<string, unknown>;
}

export interface PublishResult {
  platform: Platform;
  status: PublishStatus;
  externalPostId?: string;
  externalUrl?: string;
  postFormat?: string;
  captionFinal?: string;
  slidesCount?: number;
  errorMessage?: string;
}

export interface PreviewPayload {
  platform: Platform;
  caption: string;
  images: string[];                // URLs of processed images
  linkPreview?: { title: string; description: string; image: string; url: string };
  postFormat?: string;
  estimatedReach?: number;
}

export interface SocialPublisher {
  platform: Platform;

  /** Check if publisher is configured and ready (credentials + settings). */
  isReady(): Promise<boolean>;

  /** Publish article immediately. */
  publish(article: ArticleForPublish): Promise<PublishResult>;

  /** Preview what would be published (without actually posting). */
  preview(article: ArticleForPublish): Promise<PreviewPayload>;

  /** Schedule a future publish. Returns provider-side schedule ID or DB-side id. */
  schedule?(article: ArticleForPublish, at: Date): Promise<PublishResult>;
}
