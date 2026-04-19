import { callAI, hasAIKey } from "@/lib/ai-client";

export type GeneratedCaption = {
  paraphrasedTitle: string;  // max 2 lines, ~60-80 chars
  shortSummary: string;       // 1-2 sentences, ~120-180 chars
};

type ArticleInput = {
  title: string;
  excerpt?: string | null;
  content: string;             // HTML or plain
  category?: { name: string } | null;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a paraphrased title + short summary via AI.
 * Falls back to simple truncation if no AI key configured.
 */
export async function generateCaptionForTemplate(article: ArticleInput): Promise<GeneratedCaption> {
  const plainContent = stripHtml(article.content).slice(0, 2000);
  const excerpt = article.excerpt ? stripHtml(article.excerpt) : "";

  // Fallback when no AI configured
  const hasKey = await hasAIKey();
  if (!hasKey) {
    return fallbackCaption(article.title, excerpt, plainContent);
  }

  const systemPrompt = `Anda adalah editor media hukum profesional. Tugas Anda membuat caption posting media sosial yang ringkas dan menarik dari artikel berita hukum.

ATURAN KETAT:
1. Gunakan Bahasa Indonesia formal namun memikat
2. Tidak boleh clickbait berlebihan atau sensasional
3. Akurat terhadap isi artikel — jangan menambah info yang tidak ada
4. Output HARUS berupa JSON valid tanpa markdown fence (tidak boleh \`\`\`)

FORMAT OUTPUT (JSON):
{
  "paraphrased_title": "Judul yang diparafrase, maksimal 70 karakter, harus muat dalam 2 baris di layar instagram",
  "short_summary": "Ringkasan 1-2 kalimat pendek, maksimal 180 karakter, deskriptif dan informatif"
}`;

  const userPrompt = `Artikel:
Judul asli: ${article.title}
Kategori: ${article.category?.name || "-"}
Excerpt: ${excerpt.slice(0, 300) || "(tidak ada)"}
Isi (awal): ${plainContent.slice(0, 1200)}

Buat paraphrased_title dan short_summary sesuai format JSON di atas.`;

  try {
    const raw = await callAI(systemPrompt, userPrompt, 400, 20000);
    // Extract JSON from response (tolerant to markdown fences)
    const cleaned = raw
      .replace(/```(?:json)?/g, "")
      .replace(/```/g, "")
      .trim();
    const jsonStart = cleaned.indexOf("{");
    const jsonEnd = cleaned.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON in response");
    const json = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));

    const paraphrasedTitle = String(json.paraphrased_title || article.title).trim().slice(0, 100);
    const shortSummary = String(json.short_summary || excerpt).trim().slice(0, 220);

    return { paraphrasedTitle, shortSummary };
  } catch (err) {
    console.error("[AI CAPTION] Failed, using fallback:", err);
    return fallbackCaption(article.title, excerpt, plainContent);
  }
}

/**
 * Fallback: derive title + summary from article without AI.
 */
function fallbackCaption(title: string, excerpt: string, content: string): GeneratedCaption {
  // Truncate title at word boundary near 70 chars
  const paraphrasedTitle = truncateAtWord(title, 70);
  // Summary: prefer excerpt, else first sentence of content
  const source = excerpt || content;
  const firstSentence = source.split(/(?<=[.!?])\s+/)[0] || source.slice(0, 180);
  const shortSummary = truncateAtWord(firstSentence, 180);
  return { paraphrasedTitle, shortSummary };
}

function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice).trim();
}
