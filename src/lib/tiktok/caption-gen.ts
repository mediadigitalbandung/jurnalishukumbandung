/**
 * AI Caption & Hashtag Generator untuk TikTok
 * Menggunakan Claude (primary) / DeepSeek (fallback) via shared AI client
 */

import { callAI } from "@/lib/ai-client";

export async function generateTiktokCaption(opts: {
  articleTitle?: string;
  articleExcerpt?: string;
  articleContent?: string;
  customPrompt?: string;
}): Promise<{ caption: string; hashtags: string[] }> {
  const system = `Kamu adalah social media manager untuk media berita hukum "Jurnalis Hukum Bandung" (@jurnalishukumbandung).
Tugas: buat caption TikTok yang ENGAGING, informatif, dan clickable untuk video berita hukum.

Aturan caption:
- Bahasa Indonesia sehari-hari yang natural (bukan kaku seperti press release)
- Hook di kalimat pertama (bikin orang berhenti scroll)
- 2-3 kalimat inti
- Akhiri dengan CTA ringan ("Simak selengkapnya" / "Gimana pendapatmu?")
- Total max 150 karakter
- Hindari click-bait berlebihan, tetap kredibel

Aturan hashtag:
- 8-12 hashtag
- Mix: brand (#jurnalishukumbandung), topik hukum (#hukumindonesia #pidana), lokasi (#bandung #jawabarat), trending umum (#fyp #foryou #fypシ)
- Lowercase, tanpa spasi
- Format: #tagname (tanpa tanda quote)

Format output (STRICT JSON, no markdown):
{"caption":"...","hashtags":["tag1","tag2",...]}`;

  const userPrompt = opts.customPrompt
    ? opts.customPrompt
    : `Artikel: "${opts.articleTitle || "(tanpa judul)"}"

Ringkasan: ${opts.articleExcerpt || "(tidak ada)"}

${opts.articleContent ? `Konten: ${opts.articleContent.replace(/<[^>]+>/g, "").slice(0, 800)}` : ""}

Buat caption TikTok + hashtag sesuai aturan.`;

  const text = await callAI(system, userPrompt, 500, 30000);

  // Parse JSON response (be lenient)
  const cleanText = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  try {
    const parsed = JSON.parse(cleanText);
    const caption = String(parsed.caption || "").trim().slice(0, 300);
    const rawTags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
    const hashtags = rawTags
      .map((t: unknown) => String(t).trim())
      .map((t: string) => (t.startsWith("#") ? t.slice(1) : t))
      .map((t: string) => t.replace(/[^\w]/g, "").toLowerCase())
      .filter((t: string) => t.length >= 2 && t.length <= 30)
      .slice(0, 15);
    return { caption, hashtags };
  } catch {
    // Fallback: extract from plain text
    const lines = cleanText.split("\n").map((l) => l.trim()).filter(Boolean);
    const caption = lines.find((l) => !l.startsWith("#"))?.slice(0, 300) || "";
    const hashtags = cleanText
      .match(/#\w+/g)
      ?.map((t) => t.slice(1).toLowerCase())
      .slice(0, 15) || [];
    return { caption, hashtags };
  }
}
