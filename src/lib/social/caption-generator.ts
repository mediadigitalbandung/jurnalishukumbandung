import { prisma } from "@/lib/prisma";
import { callAI, hasAIKey } from "@/lib/ai-client";
import type { ArticleForPublish } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

export type CaptionOptions = {
  platform: "instagram" | "facebook";
  hashtagCount: number;            // target jumlah hashtag
  fixedHashtagsBrand: string[];    // hashtag brand tetap (dari global settings)
  fixedHashtagsPlatform: string[]; // hashtag spesifik platform
  includeLink: boolean;            // default true — tambahkan "Lihat selengkapnya di..." link
};

/**
 * Generate caption with 2-paragraph summary + CTA + hashtags.
 * Hashtags combine: article tags + matched target keywords + fixed platform + fixed brand.
 */
export async function generateSocialCaption(
  article: ArticleForPublish,
  options: CaptionOptions
): Promise<string> {
  const title = article.seoTitle || article.title;
  const articleUrl = `${BASE_URL}/berita/${article.slug}`;

  // 1. Generate 2-paragraph summary
  const summary = await generateTwoParagraphSummary(article, options.platform);

  // 2. Build hashtag list
  const hashtags = await buildHashtags({
    articleTags: article.tags || [],
    articleTitle: article.title,
    articleContent: article.content,
    articleCategory: article.category?.name,
    fixedPlatform: options.fixedHashtagsPlatform,
    fixedBrand: options.fixedHashtagsBrand,
    targetCount: options.hashtagCount,
  });

  // 3. CTA
  const cta = options.platform === "instagram"
    ? `📖 Lihat selengkapnya di link bio atau kunjungi:\n${articleUrl}`
    : `📖 Lihat selengkapnya: ${articleUrl}`;

  // 4. Assemble
  const parts = [
    title,
    "",
    summary,
    "",
    cta,
  ];

  if (hashtags.length > 0) {
    parts.push("", hashtags.join(" "));
  }

  return parts.join("\n").trim();
}

/**
 * AI-generated 2-paragraph summary optimized for social media.
 * Falls back to excerpt + first paragraph if no AI key.
 */
async function generateTwoParagraphSummary(
  article: ArticleForPublish,
  platform: "instagram" | "facebook"
): Promise<string> {
  const plainContent = article.content
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 3000);

  const hasKey = await hasAIKey();
  if (!hasKey) {
    return fallbackSummary(article.excerpt, plainContent);
  }

  const systemPrompt = `Anda editor media hukum profesional JHB. Tulis ringkasan post sosial media ${platform === "instagram" ? "Instagram" : "Facebook"} dari artikel berita hukum.

ATURAN KETAT:
1. Tulis TEPAT 2 paragraf
2. Paragraf 1: Hook — intisari kasus/topik (2-3 kalimat)
3. Paragraf 2: Konteks/implikasi — mengapa penting, dampak, atau konteks hukumnya (2-3 kalimat)
4. Bahasa Indonesia formal tapi mengalir, tidak kaku
5. Tidak clickbait, akurat terhadap artikel
6. Tidak perlu sapaan pembuka ("Halo semua", dll)
7. Tidak perlu hashtag di akhir (akan ditambahkan terpisah)
8. Total maksimal 500 karakter

Output HANYA kedua paragraf tersebut, dipisah baris kosong. Tanpa markdown, tanpa preamble.`;

  const userPrompt = `Judul: ${article.title}
Kategori: ${article.category?.name || "Umum"}
Excerpt: ${article.excerpt || "(tidak ada)"}

Isi artikel:
${plainContent}`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 600, 25000);
    // Clean markdown fences if any
    const cleaned = result
      .replace(/```[a-z]*\n?/g, "")
      .replace(/```/g, "")
      .trim();
    if (cleaned.length > 30) return cleaned;
    return fallbackSummary(article.excerpt, plainContent);
  } catch (err) {
    console.error("[CAPTION AI] Failed:", err);
    return fallbackSummary(article.excerpt, plainContent);
  }
}

function fallbackSummary(excerpt: string | null, content: string): string {
  const sentences = (excerpt || content)
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 10)
    .slice(0, 6);
  if (sentences.length < 3) return sentences.join(" ");
  const mid = Math.ceil(sentences.length / 2);
  const para1 = sentences.slice(0, mid).join(" ");
  const para2 = sentences.slice(mid).join(" ");
  return `${para1}\n\n${para2}`;
}

/**
 * Build hashtag list by combining:
 * 1. Article's own tags (priority)
 * 2. Active target keywords from research (matched by relevance)
 * 3. Platform fixed hashtags
 * 4. Brand fixed hashtags
 *
 * Dedupes, normalizes, and truncates to targetCount.
 */
async function buildHashtags(params: {
  articleTags: { name: string; slug: string }[];
  articleTitle: string;
  articleContent: string;
  articleCategory?: string;
  fixedPlatform: string[];
  fixedBrand: string[];
  targetCount: number;
}): Promise<string[]> {
  const collected: string[] = [];
  const seen = new Set<string>();

  function addTag(raw: string) {
    const normalized = normalizeHashtag(raw);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    collected.push(normalized);
  }

  // 1. Brand hashtags first (always shown)
  params.fixedBrand.forEach(addTag);

  // 2. Article tags (from editor)
  params.articleTags.forEach((t) => addTag(t.name));

  // 3. Matched target keywords from research
  try {
    const targetKeywords = await prisma.targetKeyword.findMany({
      where: { isActive: true },
      select: { keyword: true },
    });
    const searchText = `${params.articleTitle} ${params.articleContent}`.toLowerCase();

    type ScoredKeyword = { keyword: string; score: number };
    const scored: ScoredKeyword[] = targetKeywords.map((k) => {
      const kw = k.keyword.toLowerCase().trim();
      if (!kw) return { keyword: k.keyword, score: 0 };

      // Exact phrase match = highest score
      if (searchText.includes(kw)) return { keyword: k.keyword, score: 100 };

      // Word-level match: all significant words must appear
      const words = kw.split(/\s+/).filter((w) => w.length > 3);
      if (words.length === 0) return { keyword: k.keyword, score: 0 };

      const matchedWords = words.filter((w) => searchText.includes(w));
      const ratio = matchedWords.length / words.length;
      return { keyword: k.keyword, score: ratio >= 0.7 ? Math.round(ratio * 80) : 0 };
    });

    // Sort by relevance, filter out zeros, take up to half of targetCount
    const matched = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(3, Math.floor(params.targetCount * 0.6)))
      .map((s) => s.keyword);

    matched.forEach(addTag);
  } catch (err) {
    console.error("[CAPTION] Failed to load target keywords:", err);
  }

  // 4. Category as hashtag
  if (params.articleCategory) addTag(params.articleCategory);

  // 5. Platform-specific fixed hashtags
  params.fixedPlatform.forEach(addTag);

  // Truncate to target count
  return collected.slice(0, params.targetCount);
}

function normalizeHashtag(raw: string): string {
  // Remove special chars, spaces, accents. Keep alphanumeric + underscore.
  const cleaned = raw
    .trim()
    .replace(/^#+/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_\s-]/g, "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word, i) =>
      i === 0
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
  if (cleaned.length < 2) return "";
  return `#${cleaned}`;
}
