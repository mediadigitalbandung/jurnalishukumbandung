/**
 * Auto-Create TikTok Helper Library
 *
 * Logic untuk smart defaults dalam membuat video TikTok dari konteks artikel
 * tanpa input manual user. Setiap helper di-design supaya independen dan testable.
 */

import { prisma } from "@/lib/prisma";
import type { FrameStyle } from "./types";

// ─── Constants ──────────────────────────────────────────────
export const AUTO_TARGET_DURATION = 60; // detik — TikTok sweet spot
export const AUTO_MIN_FILES = 1;
export const AUTO_MAX_FILES = 12;
export const AUTO_DEFAULT_IMAGE_DURATION = 4; // detik per foto kalau ga ada perhitungan lain
export const AUTO_DEFAULT_VIDEO_DURATION = 7; // ambil 7 detik pertama dari video (bisa di-trim manual nanti)

// ─── Mood / Frame style detection ──────────────────────────────
/**
 * Detect mood + frame style berdasarkan kategori + judul + content artikel.
 * Returns recommendation untuk frame style yang paling cocok.
 *
 * Heuristic:
 *  - Pidana/Kriminal/Korupsi → "breaking-news" (urgency)
 *  - Sidang/Putusan → "ticker-news" (live news feel)
 *  - Profil/Wawancara/Tokoh → "lower-third" (subject-focused)
 *  - Edukasi/Penjelasan → "minimal" (clean)
 *  - Default → "ticker-news"
 */
export function autoSelectFrameStyle(article: {
  title: string;
  content?: string | null;
  category?: { name?: string | null; slug?: string | null } | null;
}): FrameStyle {
  const text = (article.title + " " + (article.content?.replace(/<[^>]+>/g, "") || "")).toLowerCase();
  const category = (article.category?.name || article.category?.slug || "").toLowerCase();

  // Breaking news indicators
  const breakingKeywords = [
    "ditangkap", "tersangka", "korupsi", "ditahan", "kasus",
    "pembunuhan", "perampokan", "narkoba", "penipuan", "penggelapan",
    "pidana", "kriminal", "terorisme", "darurat", "breaking",
  ];
  if (breakingKeywords.some((k) => text.includes(k) || category.includes(k))) {
    return "breaking-news";
  }

  // Ticker / live court session
  const tickerKeywords = [
    "sidang", "putusan", "vonis", "majelis hakim", "persidangan",
    "pn ", "pengadilan", "mahkamah", "ma ", "mk ",
  ];
  if (tickerKeywords.some((k) => text.includes(k) || category.includes(k))) {
    return "ticker-news";
  }

  // Lower-third for profile/interview
  const profileKeywords = [
    "profil", "wawancara", "biografi", "tokoh", "pengacara",
    "advokat", "dosen", "akademisi", "ahli",
  ];
  if (profileKeywords.some((k) => text.includes(k) || category.includes(k))) {
    return "lower-third";
  }

  // Educational/analytical
  const educationalKeywords = [
    "penjelasan", "edukasi", "pengertian", "definisi", "panduan",
    "tutorial", "tips", "perbedaan", "analisis",
  ];
  if (educationalKeywords.some((k) => text.includes(k) || category.includes(k))) {
    return "minimal";
  }

  // Default: ticker for general news
  return "ticker-news";
}

// ─── Backsong auto-pick ─────────────────────────────────────────
/**
 * Pick backsong dari library berdasarkan mood detection.
 * Returns backsong ID atau null kalau tidak ada match.
 */
export async function autoSelectBacksong(article: {
  title: string;
  content?: string | null;
  category?: { name?: string | null } | null;
}): Promise<string | null> {
  // Detect mood from text
  const text = (article.title + " " + (article.content?.replace(/<[^>]+>/g, "") || "")).toLowerCase();

  let preferredMood: "serius" | "dramatis" | "santai" | "urgent" | "netral" = "netral";

  const dramatic = ["meledak", "heboh", "ribut", "bentrok", "demo", "darurat", "marah", "gugatan", "vonis", "penjara"];
  const urgent = ["ditangkap", "ditahan", "buron", "menyerahkan diri", "kabur", "breaking", "live", "siaran"];
  const serious = ["putusan", "majelis hakim", "undang-undang", "uu ", "konstitusi", "regulasi", "pasal"];
  const calm = ["edukasi", "panduan", "penjelasan", "tutorial", "tips"];

  if (dramatic.some((k) => text.includes(k))) preferredMood = "dramatis";
  else if (urgent.some((k) => text.includes(k))) preferredMood = "urgent";
  else if (serious.some((k) => text.includes(k))) preferredMood = "serius";
  else if (calm.some((k) => text.includes(k))) preferredMood = "santai";

  // Try preferred mood first
  let backsong = await prisma.tiktokBacksong.findFirst({
    where: { isActive: true, mood: preferredMood },
    orderBy: { createdAt: "desc" },
  });

  // Fallback: any netral, then any active
  if (!backsong) {
    backsong = await prisma.tiktokBacksong.findFirst({
      where: { isActive: true, mood: "netral" },
      orderBy: { createdAt: "desc" },
    });
  }
  if (!backsong) {
    backsong = await prisma.tiktokBacksong.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  return backsong?.id || null;
}

// ─── Clip duration distribution ────────────────────────────────
/**
 * Distribute total durasi ke N clips secara merata.
 * Foto dapat porsi lebih kecil (~3-5s) supaya cepat berganti, video bisa lebih lama (5-8s).
 *
 * Returns array of {durationSec} matching input clip count.
 */
export function autoDistributeDurations(
  clipTypes: Array<"video" | "image">,
  totalDurationSec = AUTO_TARGET_DURATION
): number[] {
  if (clipTypes.length === 0) return [];

  // Strategy: video gets 1.5x weight vs image (videos lebih engaging, foto rentan terasa stagnan)
  const weights = clipTypes.map((t) => (t === "video" ? 1.5 : 1));
  const totalWeight = weights.reduce((s, w) => s + w, 0);

  const durations = weights.map((w) => (w / totalWeight) * totalDurationSec);

  // Clamp setiap clip ke 2-12 detik (jangan terlalu pendek/panjang per clip)
  const clamped = durations.map((d) => Math.max(2, Math.min(12, d)));

  // Adjust supaya total tetap sesuai target
  const totalClamped = clamped.reduce((s, d) => s + d, 0);
  const scaleFactor = totalDurationSec / totalClamped;
  const final = clamped.map((d) => Math.round(d * scaleFactor * 10) / 10);

  // Ensure last clip absorbs rounding error supaya total exact
  const sum = final.reduce((s, d) => s + d, 0);
  const diff = totalDurationSec - sum;
  if (Math.abs(diff) > 0.01) {
    final[final.length - 1] = Math.max(2, Math.round((final[final.length - 1] + diff) * 10) / 10);
  }

  return final;
}

// ─── Subtitle count recommendation ──────────────────────────────
/**
 * Berdasarkan total durasi, recommend jumlah subtitle segment yang ideal.
 * Sweet spot: 5-7 detik per segment untuk readability TikTok.
 */
export function autoSubtitleCount(totalDurationSec: number): number {
  const segments = Math.round(totalDurationSec / 6);
  return Math.max(3, Math.min(12, segments));
}

// ─── Validation untuk input file user ──────────────────────────
export interface AutoCreateInput {
  articleId: string;
  files: Array<{
    url: string;
    type: "video" | "image";
    sourceDurationSec?: number | null;
  }>;
  targetDurationSec?: number;
  frameStyle?: FrameStyle;
  renderEngine?: "ffmpeg" | "hyperframes";
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAutoCreateInput(input: AutoCreateInput): ValidationResult {
  const errors: string[] = [];

  if (!input.articleId) errors.push("articleId wajib");

  if (!input.files || input.files.length === 0) {
    errors.push("Minimal upload 1 file (foto atau video)");
  } else if (input.files.length < AUTO_MIN_FILES) {
    errors.push(`Minimal ${AUTO_MIN_FILES} file`);
  } else if (input.files.length > AUTO_MAX_FILES) {
    errors.push(`Maksimal ${AUTO_MAX_FILES} file (sekarang ${input.files.length})`);
  }

  const target = input.targetDurationSec ?? AUTO_TARGET_DURATION;
  if (target < 10 || target > 180) {
    errors.push("Target durasi harus 10-180 detik");
  }

  if (input.frameStyle && !["none", "ticker-news", "brand-green", "breaking-news", "minimal", "lower-third", "custom"].includes(input.frameStyle)) {
    errors.push("Frame style tidak valid");
  }

  if (input.renderEngine && !["ffmpeg", "hyperframes"].includes(input.renderEngine)) {
    errors.push("Render engine tidak valid");
  }

  return { valid: errors.length === 0, errors };
}
