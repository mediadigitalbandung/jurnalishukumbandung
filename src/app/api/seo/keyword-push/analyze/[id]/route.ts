export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

type Action = {
  type: "fix-meta" | "add-keyword-h2" | "add-internal-link" | "create-cluster" | "boost-indexing";
  severity: "high" | "medium" | "low";
  message: string;
  articleId?: string;
  articleSlug?: string;
  detail?: string;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const target = await prisma.targetKeyword.findUnique({ where: { id: params.id } });
    if (!target) return errorResponse(new Error("Target keyword not found"));

    const kw = target.keyword;
    const kwLower = kw.toLowerCase();

    // Find all articles that mention the keyword
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
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
        seoTitle: true,
        seoDescription: true,
        content: true,
        excerpt: true,
        featuredImage: true,
        viewCount: true,
        publishedAt: true,
        category: { select: { name: true, slug: true } },
        tags: { select: { name: true } },
      },
      orderBy: { viewCount: "desc" },
      take: 30,
    });

    if (articles.length === 0) {
      return successResponse({
        keyword: kw,
        articles: [],
        actions: [
          {
            type: "create-cluster",
            severity: "high",
            message: `Tidak ada artikel JHB yang mention "${kw}". Buat artikel baru atau topic cluster.`,
          } as Action,
        ],
      });
    }

    // Score each article for this keyword
    const scored = articles.map((a) => {
      const text = stripHtml(a.content).toLowerCase();
      const titleHasKw = a.title.toLowerCase().includes(kwLower);
      const seoTitleHasKw = (a.seoTitle || "").toLowerCase().includes(kwLower);
      const seoDescHasKw = (a.seoDescription || "").toLowerCase().includes(kwLower);
      const h2Has = /<h2[^>]*>([^<]+)<\/h2>/gi;
      const h2List = Array.from(a.content.matchAll(h2Has)).map((m) => m[1].toLowerCase());
      const h2HasKw = h2List.some((h) => h.includes(kwLower));
      const first300 = text.slice(0, 300);
      const firstParaHasKw = first300.includes(kwLower);
      const kwCount = (text.match(new RegExp(kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const density = wordCount > 0 ? (kwCount / wordCount) * 100 : 0;
      const linkCount = (a.content.match(/<a[^>]*href=["']\/[^"']+["']/g) || []).length;

      let score = 0;
      if (titleHasKw) score += 25;
      if (seoTitleHasKw) score += 15;
      if (seoDescHasKw) score += 10;
      if (h2HasKw) score += 15;
      if (firstParaHasKw) score += 15;
      if (density >= 0.5 && density <= 3) score += 10;
      if (linkCount >= 2) score += 5;
      if (wordCount >= 500) score += 5;

      return {
        article: a,
        score,
        kwCount,
        density: +density.toFixed(2),
        wordCount,
        linkCount,
        titleHasKw,
        seoTitleHasKw,
        seoDescHasKw,
        h2HasKw,
        firstParaHasKw,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    // Generate action plan
    const actions: Action[] = [];

    // Best article needs meta fixes
    if (!best.seoTitleHasKw || !best.seoDescHasKw) {
      actions.push({
        type: "fix-meta",
        severity: "high",
        articleId: best.article.id,
        articleSlug: best.article.slug,
        message: `Best article "${best.article.title.slice(0, 50)}..." perlu update seoTitle/seoDescription dengan keyword "${kw}".`,
        detail: `seoTitle has kw: ${best.seoTitleHasKw} | seoDesc has kw: ${best.seoDescHasKw}`,
      });
    }

    // Best article needs H2 with keyword
    if (!best.h2HasKw) {
      actions.push({
        type: "add-keyword-h2",
        severity: "medium",
        articleId: best.article.id,
        articleSlug: best.article.slug,
        message: `Tambah H2 yang mengandung "${kw}" di best article.`,
      });
    }

    // Internal link from related articles
    const linkCandidates = scored.slice(1, 8).filter(
      (s) => s.score < best.score && !s.article.content.includes(`/berita/${best.article.slug}`)
    );
    if (linkCandidates.length >= 2) {
      actions.push({
        type: "add-internal-link",
        severity: "medium",
        message: `${linkCandidates.length} artikel related belum link ke best article. Tambah anchor text "${kw}" → /berita/${best.article.slug}.`,
        detail: linkCandidates.map((c) => c.article.slug).join(", "),
      });
    }

    // Cluster suggestion if articles < 5 with strong signal
    const strongSignal = scored.filter((s) => s.score >= 50);
    if (strongSignal.length < 5) {
      actions.push({
        type: "create-cluster",
        severity: "low",
        message: `Hanya ${strongSignal.length} artikel kuat untuk "${kw}". Buat 3-5 artikel cluster untuk topic authority.`,
      });
    }

    // Indexing boost
    actions.push({
      type: "boost-indexing",
      severity: "high",
      articleId: best.article.id,
      articleSlug: best.article.slug,
      message: `Re-submit best article ke Google Indexing API untuk push posisi.`,
    });

    return successResponse({
      keyword: kw,
      currentPosition: target.currentPosition,
      targetPosition: target.targetPosition,
      bestArticle: {
        id: best.article.id,
        slug: best.article.slug,
        title: best.article.title,
        score: best.score,
        kwCount: best.kwCount,
        density: best.density,
        wordCount: best.wordCount,
        linkCount: best.linkCount,
        viewCount: best.article.viewCount,
        signals: {
          titleHasKw: best.titleHasKw,
          seoTitleHasKw: best.seoTitleHasKw,
          seoDescHasKw: best.seoDescHasKw,
          h2HasKw: best.h2HasKw,
          firstParaHasKw: best.firstParaHasKw,
        },
      },
      relatedArticles: scored.slice(1, 11).map((s) => ({
        id: s.article.id,
        slug: s.article.slug,
        title: s.article.title,
        score: s.score,
        viewCount: s.article.viewCount,
        category: s.article.category?.name,
      })),
      totalArticles: articles.length,
      actions,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
