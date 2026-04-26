export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { callAI, hasAIKey } from "@/lib/ai-client";
import { submitUrlToGoogle } from "@/lib/seo-utils";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

/**
 * Generate Sorotan SEO landing page untuk target keyword.
 *
 * Body: { angle?: string }   // optional custom angle, default = keyword itself
 *
 * Process:
 * 1. Find target keyword + best article + 5-10 related articles (mention keyword)
 * 2. AI generate comprehensive SEO landing 800-1200 kata yang:
 *    - Mengandung keyword density 1-2%
 *    - H1, multiple H2 dengan keyword variations
 *    - Link ke artikel terkait sebagai "Sumber" / "Baca Selengkapnya"
 *    - FAQ section
 * 3. Save sebagai Sorotan dengan angle="keyword-landing", linked ke bestArticle, related[]
 * 4. Submit ke Google Indexing API
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    if (!(await hasAIKey())) {
      return errorResponse(new Error("AI API key belum dikonfigurasi"));
    }

    const target = await prisma.targetKeyword.findUnique({ where: { id: params.id } });
    if (!target) return errorResponse(new Error("Target keyword not found"));
    if (!target.bestArticleId) {
      return errorResponse(new Error("No best article identified — sync GSC dulu"));
    }

    const kw = target.keyword;

    // Find best article + 5-10 related articles
    const bestArticle = await prisma.article.findUnique({
      where: { id: target.bestArticleId },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
        tags: { select: { name: true } },
      },
    });
    if (!bestArticle) return errorResponse(new Error("Best article not found"));

    // Find related articles (mention keyword in title/content/tag)
    const related = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        id: { not: bestArticle.id },
        OR: [
          { title: { contains: kw, mode: "insensitive" } },
          { content: { contains: kw, mode: "insensitive" } },
          { tags: { some: { name: { equals: kw, mode: "insensitive" } } } },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: { select: { name: true } },
        publishedAt: true,
      },
      orderBy: { viewCount: "desc" },
      take: 10,
    });

    // Multi-word fallback if related is empty
    let relatedFinal = related;
    if (related.length === 0) {
      const words = kw.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
      if (words.length > 0) {
        relatedFinal = await prisma.article.findMany({
          where: {
            status: "PUBLISHED",
            id: { not: bestArticle.id },
            AND: words.map((w) => ({
              OR: [
                { title: { contains: w, mode: "insensitive" as const } },
                { content: { contains: w, mode: "insensitive" as const } },
              ],
            })),
          },
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            category: { select: { name: true } },
            publishedAt: true,
          },
          orderBy: { viewCount: "desc" },
          take: 10,
        });
      }
    }

    if (relatedFinal.length === 0) {
      return errorResponse(new Error(`Tidak ada artikel terkait untuk "${kw}". Generate artikel terkait dulu, atau pilih keyword yang sudah ada coverage.`));
    }

    // Build context for AI
    type ArticleContext = {
      title: string;
      slug: string;
      excerpt: string | null;
      category: string | null;
      contentSample?: string;
      isPilar: boolean;
    };
    const articlesContext: ArticleContext[] = [
      {
        title: bestArticle.title,
        slug: bestArticle.slug,
        excerpt: bestArticle.excerpt,
        category: bestArticle.category?.name ?? null,
        contentSample: stripHtml(bestArticle.content).slice(0, 800),
        isPilar: true,
      },
      ...relatedFinal.map((a) => ({
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt,
        category: a.category?.name ?? null,
        isPilar: false,
      })),
    ];

    const articlesText = articlesContext
      .map((a, i) => {
        return `${i + 1}. ${a.isPilar ? "[PILAR] " : ""}${a.title}\n   slug: /berita/${a.slug}\n   kategori: ${a.category || "-"}\n   excerpt: ${a.excerpt || "(tidak ada)"}\n${a.contentSample ? `   sampel isi: ${a.contentSample}\n` : ""}`;
      })
      .join("\n");

    const systemPrompt = `Anda penulis SEO senior untuk JHB (Jurnalis Hukum Bandung).

Tugas: Tulis SEO landing page komprehensif yang BOOST ranking keyword target di Google.

KARAKTERISTIK LANDING:
- Bukan artikel berita baru, tapi HALAMAN HUB yang LINK ke artikel-artikel JHB sebagai sumber
- 800-1200 kata
- Keyword density 1-2% (natural, tidak stuffing)
- H1 mengandung keyword
- 5-7 H2 dengan keyword variations
- Setiap H2 punya 2-3 paragraf yang link ke artikel JHB sebagai "Selengkapnya: [Judul Artikel]"
- Penutup dengan FAQ section (4-6 Q&A)
- Bahasa Indonesia jurnalistik, EYD baku

ATURAN LINK:
- Setiap link ke artikel JHB pakai format: <a href="/berita/{slug}">{judul}</a>
- Link minimal 5x dalam content (sesuai jumlah artikel terkait)
- Anchor text variasi (jangan semua sama dengan judul)

OUTPUT: JSON valid saja, tanpa markdown fence:
{
  "title": "max 90 char, mengandung keyword",
  "slug": "url-slug-with-keyword (pakai dash, tanpa karakter khusus)",
  "seoTitle": "50-60 char, click-worthy + keyword",
  "seoDescription": "145-160 char, hook + benefit + CTA",
  "content": "<p>...</p><h2>...</h2><p>...<a href='/berita/...'>...</a></p>... HTML lengkap dengan link",
  "faqs": [{"q":"...","a":"..."}, ...],
  "wordCount": 0,
  "linkCount": 0
}`;

    const userPrompt = `KEYWORD TARGET: "${kw}"
TARGET POSISI: top ${target.targetPosition}

ARTIKEL JHB YANG TERSEDIA SEBAGAI SUMBER:

${articlesText}

Tulis SEO landing page komprehensif untuk keyword "${kw}". Link ke ${articlesContext.length} artikel di atas. Output JSON saja.`;

    const aiResponse = await callAI(systemPrompt, userPrompt, 4000, 120000);
    const cleaned = aiResponse
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return errorResponse(new Error(`AI response not valid JSON: ${cleaned.slice(0, 200)}`));
    }

    if (!parsed.title || !parsed.content || !parsed.slug) {
      return errorResponse(new Error("AI response incomplete (title/content/slug missing)"));
    }

    // Generate unique slug (append -kw if collision)
    let finalSlug = slugify(parsed.slug);
    if (!finalSlug) finalSlug = slugify(`${kw}-panduan-lengkap`);

    const existing = await prisma.sorotan.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    // Save Sorotan
    const created = await prisma.sorotan.create({
      data: {
        slug: finalSlug,
        title: parsed.title,
        content: parsed.content,
        angle: "keyword-landing",
        articleId: bestArticle.id,
        targetKeyword: kw,
        targetKeywordId: target.id,
        relatedArticleIds: relatedFinal.map((a) => a.id),
        seoTitle: parsed.seoTitle || null,
        seoDescription: parsed.seoDescription || null,
        indexStatus: null,
      },
    });

    // Submit to Google Indexing API
    let indexResult = null;
    try {
      const sorotanUrl = `${BASE_URL}/sorotan/${finalSlug}`;
      indexResult = await submitUrlToGoogle(`sorotan/${finalSlug}`, bestArticle.category?.slug);
      await prisma.sorotan.update({
        where: { id: created.id },
        data: { indexStatus: "submitted", lastIndexedAt: new Date() },
      });
      void sorotanUrl;
    } catch {
      await prisma.sorotan.update({
        where: { id: created.id },
        data: { indexStatus: "failed" },
      });
    }

    return successResponse({
      keyword: kw,
      sorotan: {
        id: created.id,
        slug: created.slug,
        title: created.title,
        url: `${BASE_URL}/sorotan/${created.slug}`,
        wordCount: parsed.wordCount || stripHtml(parsed.content).split(/\s+/).filter(Boolean).length,
        linkCount: parsed.linkCount || (parsed.content.match(/<a[^>]*href=/g) || []).length,
        relatedCount: relatedFinal.length,
        indexed: indexResult !== null,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
