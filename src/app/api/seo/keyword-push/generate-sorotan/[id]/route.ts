export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit untuk multi-generate

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { callAI, hasAIKey } from "@/lib/ai-client";
import { submitUrlToGoogle } from "@/lib/seo-utils";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

// Pool angle untuk variasi (hindari duplicate content)
const ANGLE_VARIATIONS = [
  { id: "panduan-lengkap", title: "Panduan Lengkap", focus: "explainer komprehensif, definisi + konteks + langkah" },
  { id: "kronologi-detail", title: "Kronologi Detail", focus: "urutan waktu kejadian, timeline lengkap" },
  { id: "profil-pihak", title: "Profil Pihak Terlibat", focus: "biografi singkat tokoh, peran, latar belakang" },
  { id: "analisis-hukum", title: "Analisis Hukum", focus: "dasar hukum, pasal, yurisprudensi, ratio decidendi" },
  { id: "dampak-implikasi", title: "Dampak & Implikasi", focus: "konsekuensi hukum/sosial/ekonomi, pelajaran" },
  { id: "regulasi-terkait", title: "Regulasi Terkait", focus: "UU, peraturan, kebijakan yang relevan" },
  { id: "faq-tanya-jawab", title: "FAQ Tanya Jawab", focus: "30 Q&A umum tentang topik" },
  { id: "perbandingan-kasus", title: "Perbandingan Kasus", focus: "compare dengan kasus serupa di Indonesia" },
  { id: "perspektif-akademisi", title: "Perspektif Akademisi", focus: "view ahli hukum, jurnal akademis" },
  { id: "dampak-bandung", title: "Dampak ke Bandung Raya", focus: "implikasi spesifik untuk masyarakat Bandung" },
  { id: "tips-langkah", title: "Tips & Langkah Praktis", focus: "actionable steps untuk pembaca" },
  { id: "sejarah-perkembangan", title: "Sejarah & Perkembangan", focus: "evolusi topik dari masa ke masa" },
  { id: "data-statistik", title: "Data & Statistik", focus: "angka, grafik, fakta kuantitatif" },
  { id: "studi-kasus", title: "Studi Kasus", focus: "1-2 kasus konkret sebagai contoh" },
  { id: "kontroversi", title: "Kontroversi & Pro-Kontra", focus: "pandangan berlawanan, debat publik" },
];

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

type ArticleContext = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  contentSample?: string;
  isPilar: boolean;
};

async function generateOneSorotan(
  target: { id: string; keyword: string; targetPosition: number; bestArticleId: string | null },
  bestArticle: { id: string; slug: string; title: string; excerpt: string | null; content: string; category: { name: string; slug: string } | null },
  relatedArticles: Array<{ id: string; slug: string; title: string; excerpt: string | null; category: { name: string } | null }>,
  angleConfig: typeof ANGLE_VARIATIONS[number],
  variationNumber: number
): Promise<{ ok: true; sorotan: { id: string; slug: string; title: string; url: string; wordCount: number; linkCount: number; angle: string } } | { ok: false; error: string }> {
  const kw = target.keyword;

  const articlesContext: ArticleContext[] = [
    {
      id: bestArticle.id,
      title: bestArticle.title,
      slug: bestArticle.slug,
      excerpt: bestArticle.excerpt,
      category: bestArticle.category?.name ?? null,
      contentSample: stripHtml(bestArticle.content).slice(0, 800),
      isPilar: true,
    },
    ...relatedArticles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt,
      category: a.category?.name ?? null,
      isPilar: false,
    })),
  ];

  const articlesText = articlesContext
    .map((a, i) => `${i + 1}. ${a.isPilar ? "[PILAR] " : ""}${a.title}\n   slug: /berita/${a.slug}\n   kategori: ${a.category || "-"}\n   excerpt: ${a.excerpt || "(tidak ada)"}\n${a.contentSample ? `   sampel isi: ${a.contentSample}\n` : ""}`)
    .join("\n");

  const systemPrompt = `Anda penulis SEO senior untuk JHB (Jurnalis Hukum Bandung).

Tugas: Tulis SEO landing page UNIK dengan angle "${angleConfig.title}" untuk keyword target.

ANGLE FOCUS: ${angleConfig.focus}

KARAKTERISTIK LANDING:
- Bukan artikel berita baru, tapi HALAMAN HUB yang LINK ke artikel-artikel JHB sebagai sumber
- 800-1200 kata
- Keyword density 1-2% (natural)
- H1 mengandung keyword (variasi dengan angle)
- 5-7 H2 dengan keyword variations
- Setiap H2 punya 2-3 paragraf yang link ke artikel JHB sebagai "Selengkapnya: [Judul]"
- Penutup dengan FAQ (4-6 Q&A)
- WAJIB UNIK — beda dari sorotan lain dengan angle berbeda
- Bahasa Indonesia jurnalistik, EYD baku

ATURAN LINK:
- Format: <a href="/berita/{slug}">{judul}</a>
- Min 5 link, anchor text variasi

OUTPUT: JSON valid saja, tanpa markdown fence:
{
  "title": "max 90 char, mengandung keyword + angle",
  "slug": "url-slug-with-keyword (pakai dash) — TAMBAHKAN angle suffix supaya unik",
  "seoTitle": "50-60 char, click-worthy",
  "seoDescription": "145-160 char",
  "content": "<p>...</p><h2>...</h2>... HTML lengkap dengan link",
  "faqs": [{"q":"...","a":"..."}, ...],
  "wordCount": 0,
  "linkCount": 0
}`;

  const userPrompt = `KEYWORD: "${kw}"
ANGLE: ${angleConfig.title} (${angleConfig.id})
VARIASI #${variationNumber}

ARTIKEL JHB SEBAGAI SUMBER:
${articlesText}

Tulis landing page UNIK untuk keyword "${kw}" dengan angle "${angleConfig.title}". Output JSON saja.`;

  try {
    const aiResponse = await callAI(systemPrompt, userPrompt, 4000, 120000);
    const cleaned = aiResponse
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (!parsed.title || !parsed.content || !parsed.slug) {
      return { ok: false, error: "AI response incomplete" };
    }

    let finalSlug = slugify(parsed.slug);
    if (!finalSlug) finalSlug = slugify(`${kw}-${angleConfig.id}`);

    // Append angle ID kalau ga ada di slug, untuk uniqueness
    if (!finalSlug.includes(angleConfig.id)) {
      finalSlug = `${finalSlug}-${angleConfig.id}`.slice(0, 90);
    }

    const existing = await prisma.sorotan.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
    }

    const created = await prisma.sorotan.create({
      data: {
        slug: finalSlug,
        title: parsed.title,
        content: parsed.content,
        angle: "keyword-landing",
        articleId: bestArticle.id,
        targetKeyword: kw,
        targetKeywordId: target.id,
        relatedArticleIds: relatedArticles.map((a) => a.id),
        seoTitle: parsed.seoTitle || null,
        seoDescription: parsed.seoDescription || null,
        indexStatus: null,
      },
    });

    // Submit Google Indexing (fire-and-forget, no await)
    submitUrlToGoogle(`sorotan/${finalSlug}`, bestArticle.category?.slug)
      .then(async () => {
        await prisma.sorotan.update({
          where: { id: created.id },
          data: { indexStatus: "submitted", lastIndexedAt: new Date() },
        }).catch(() => {});
      })
      .catch(async () => {
        await prisma.sorotan.update({
          where: { id: created.id },
          data: { indexStatus: "failed" },
        }).catch(() => {});
      });

    return {
      ok: true,
      sorotan: {
        id: created.id,
        slug: created.slug,
        title: created.title,
        url: `${BASE_URL}/sorotan/${created.slug}`,
        wordCount: parsed.wordCount || stripHtml(parsed.content).split(/\s+/).filter(Boolean).length,
        linkCount: parsed.linkCount || (parsed.content.match(/<a[^>]*href=/g) || []).length,
        angle: angleConfig.id,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

/**
 * POST /api/seo/keyword-push/generate-sorotan/[id]?count=N
 *
 * Generate N sorotan SEO untuk satu keyword dengan angle BERBEDA-BEDA.
 * count: 1-5 (capped untuk timeout safety; total ~30-60s × N)
 *
 * UI bisa loop call ini berkali-kali untuk total > 5.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    if (!(await hasAIKey())) {
      return errorResponse(new Error("AI API key belum dikonfigurasi"));
    }

    const { searchParams } = new URL(req.url);
    const count = Math.min(Math.max(parseInt(searchParams.get("count") || "1"), 1), 5);

    const target = await prisma.targetKeyword.findUnique({ where: { id: params.id } });
    if (!target) return errorResponse(new Error("Target keyword not found"));
    if (!target.bestArticleId) return errorResponse(new Error("No best article — sync GSC dulu"));

    const bestArticle = await prisma.article.findUnique({
      where: { id: target.bestArticleId },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        category: { select: { name: true, slug: true } },
      },
    });
    if (!bestArticle) return errorResponse(new Error("Best article not found"));

    const kw = target.keyword;

    // Find related articles
    let related = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        id: { not: bestArticle.id },
        OR: [
          { title: { contains: kw, mode: "insensitive" } },
          { content: { contains: kw, mode: "insensitive" } },
          { tags: { some: { name: { equals: kw, mode: "insensitive" } } } },
        ],
      },
      select: { id: true, slug: true, title: true, excerpt: true, category: { select: { name: true } } },
      orderBy: { viewCount: "desc" },
      take: 10,
    });

    if (related.length === 0) {
      const words = kw.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
      if (words.length > 0) {
        related = await prisma.article.findMany({
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
          select: { id: true, slug: true, title: true, excerpt: true, category: { select: { name: true } } },
          orderBy: { viewCount: "desc" },
          take: 10,
        });
      }
    }

    if (related.length === 0) {
      return errorResponse(new Error(`Tidak ada artikel terkait untuk "${kw}"`));
    }

    // Get existing sorotan untuk avoid same angle
    const existingSorotan = await prisma.sorotan.findMany({
      where: { targetKeywordId: target.id, angle: "keyword-landing" },
      select: { slug: true },
    });
    const usedAngles = new Set(
      existingSorotan
        .map((s) => ANGLE_VARIATIONS.find((a) => s.slug.includes(a.id))?.id)
        .filter((x): x is string => !!x)
    );

    // Pick N unused angles
    const availableAngles = ANGLE_VARIATIONS.filter((a) => !usedAngles.has(a.id));
    const anglesToUse = availableAngles.slice(0, count);

    if (anglesToUse.length === 0) {
      return errorResponse(new Error(`Semua ${ANGLE_VARIATIONS.length} angle sudah dipakai. Hapus sorotan lama atau pilih keyword berbeda.`));
    }

    // Generate sequential
    const results: Array<{ ok: boolean; sorotan?: unknown; error?: string }> = [];
    for (let i = 0; i < anglesToUse.length; i++) {
      const result = await generateOneSorotan(
        target,
        bestArticle,
        related,
        anglesToUse[i],
        existingSorotan.length + i + 1
      );
      results.push(result);
    }

    return successResponse({
      keyword: target.keyword,
      requested: count,
      generated: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      anglesUsed: anglesToUse.map((a) => a.id),
      anglesRemaining: availableAngles.length - anglesToUse.length,
      results,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
