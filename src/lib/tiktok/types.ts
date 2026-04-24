/**
 * TikTok Auto-Content System — Type Definitions
 */

export type ClipType = "video" | "image";
export type TextPosition =
  | "top" | "center" | "bottom"
  | "top-left" | "top-right"
  | "center-left" | "center-right"
  | "bottom-left" | "bottom-right";
export type Transition = "none" | "fade" | "slide" | "zoom";
export type RenderStatus = "draft" | "queued" | "rendering" | "rendered" | "failed";
export type PublishStatus = "not_published" | "draft_tiktok" | "published" | "failed";
export type BacksongMood = "serius" | "dramatis" | "santai" | "urgent" | "netral";
export type FrameStyle = "none" | "ticker-news" | "brand-green" | "breaking-news" | "minimal" | "lower-third";

export interface ClipInput {
  id: string;
  order: number;
  type: ClipType;
  sourceUrl: string;         // Absolute URL or path relative to public/
  sourceDuration?: number | null;
  durationSec: number;
  trimStart?: number | null;
  textOverlay?: string | null;
  textPosition?: TextPosition | null;
  textColor?: string | null;
  transition?: Transition | null;
  kenBurns?: boolean;
}

export interface RenderSpec {
  videoId: string;
  clips: ClipInput[];
  backsongUrl?: string | null;
  backsongVolume?: number;
  outputWidth?: number;     // default 1080
  outputHeight?: number;    // default 1920 (9:16 vertical)
  outputFps?: number;       // default 30
  maxDurationSec?: number;  // default 60 (TikTok limit)
  frameStyle?: FrameStyle;  // default "none"
  breakingText?: string | null; // Text for "breaking-news" frame
  title?: string | null;    // Video title (used in lower-third frame)
}

export interface RenderResult {
  success: boolean;
  outputPath?: string;       // Absolute server path
  outputUrl?: string;        // Public URL
  durationSec?: number;
  sizeBytes?: number;
  error?: string;
}

// TikTok Content Posting API payloads
export interface TiktokInitUploadPayload {
  post_info: {
    title?: string;
    privacy_level: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "SELF_ONLY";
    disable_duet?: boolean;
    disable_comment?: boolean;
    disable_stitch?: boolean;
    video_cover_timestamp_ms?: number;
  };
  source_info: {
    source: "FILE_UPLOAD";
    video_size: number;
    chunk_size: number;
    total_chunk_count: number;
  };
}

export interface TiktokUploadInitResponse {
  data: {
    publish_id: string;
    upload_url: string;
  };
  error: {
    code: string;
    message: string;
  };
}
