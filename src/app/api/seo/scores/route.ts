export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

type ScoreInput = {
  title: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  excerpt?: string | null;
  body: string;
  tags: string[];
  targetKeyword?: string;
};

type ScoreResult = {
  total: number;
  max: number;
  percentage: number;
  breakdown: Record<string, number>;
  issues: string[];
  wordCount: number;
  h2Count: number;
  linkCount: number;
};

function scoreContent(input: ScoreInput): ScoreResult {
  const breakdown: Record<string, number> = {};
  const issues: string[] = [];

  const text = stripHtml(input.body);
  const lowerText = text.toLowerCase();
  const kw = (input.targetKeyword || "").toLowerCase().trim();
  const kwFirst = kw.split(/\s+/)[0] || "";

  // 1. Title length 50-70 char (10 pts)
  const titleLen = (input.title || "").length;
  if (titleLen >= 50 && titleLen <= 70) breakdown.titleLength = 10;
  else if (titleLen >= 40 && titleLen <= 80) breakdown.titleLength = 6;
  else if (titleLen > 0) {
    breakdown.titleLength = 3;
    issues.push(`Title length ${titleLen} char (ideal 50-70)`);
  } else {
    breakdown.titleLength = 0;
    issues.push("Title kosong");
  }

  // 2. seoTitle 50-60 (10 pts)
  const seoTLen = (input.seoTitle || "").length;
  if (seoTLen >= 50 && seoTLen <= 60) breakdown.seoTitle = 10;
  else if (seoTLen >= 40 && seoTLen <= 70) breakdown.seoTitle = 6;
  else if (seoTLen > 0) {
    breakdown.seoTitle = 3;
    issues.push(`seoTitle ${seoTLen} char (ideal 50-60)`);
  } else {
    breakdown.seoTitle = 0;
    issues.push("seoTitle kosong");
  }

  // 3. seoDescription 145-160 (10 pts)
  const seoDLen = (input.seoDescription || "").length;
  if (seoDLen >= 145 && seoDLen <= 160) breakdown.seoDesc = 10;
  else if (seoDLen >= 120 && seoDLen <= 175) breakdown.seoDesc = 6;
  else if (seoDLen > 0) {
    breakdown.seoDesc = 3;
    issues.push(`seoDescription ${seoDLen} char (ideal 145-160)`);
  } else {
    breakdown.seoDesc = 0;
    issues.push("seoDescription kosong");
  }

  // 4. Excerpt (5 pts)
  if (input.excerpt && input.excerpt.length >= 50) breakdown.excerpt = 5;
  else if (input.excerpt) {
    breakdown.excerpt = 2;
    issues.push("Excerpt terlalu pendek");
  } else {
    breakdown.excerpt = 0;
    issues.push("Excerpt kosong");
  }

  // 5. Keyword in title (10 pts)
  if (!kw) {
    breakdown.kwInTitle = 0;
    issues.push("target_keyword tidak diset");
  } else if ((input.title || "").toLowerCase().includes(kw)) breakdown.kwInTitle = 10;
  else if (kwFirst && (input.title || "").toLowerCase().includes(kwFirst)) {
    breakdown.kwInTitle = 5;
    issues.push("Keyword utama tidak full di title");
  } else {
    breakdown.kwInTitle = 0;
    issues.push("Keyword utama tidak ada di title");
  }

  // 6. Keyword in H2 (10 pts)
  const h2Matches = Array.from((input.body || "").matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)).map(
    (m) => m[1].toLowerCase()
  );
  if (!kw) breakdown.kwInH2 = 0;
  else if (h2Matches.some((h) => h.includes(kw))) breakdown.kwInH2 = 10;
  else if (h2Matches.some((h) => h.includes(kwFirst))) {
    breakdown.kwInH2 = 5;
    issues.push("Keyword utama tidak ada di H2");
  } else {
    breakdown.kwInH2 = 0;
    issues.push("Tidak ada H2 dengan keyword");
  }

  // 7. Keyword in first 100 words (10 pts)
  const first100 = lowerText.split(/\s+/).slice(0, 100).join(" ");
  if (!kw) breakdown.kwInFirstPara = 0;
  else if (first100.includes(kw)) breakdown.kwInFirstPara = 10;
  else if (first100.includes(kwFirst)) {
    breakdown.kwInFirstPara = 5;
    issues.push("Keyword utama lemah di paragraf 1");
  } else {
    breakdown.kwInFirstPara = 0;
    issues.push("Keyword utama tidak ada di paragraf 1");
  }

  // 8. Word count (15 pts)
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 800) breakdown.wordCount = 15;
  else if (wordCount >= 500) breakdown.wordCount = 12;
  else if (wordCount >= 400) breakdown.wordCount = 8;
  else if (wordCount >= 200) {
    breakdown.wordCount = 4;
    issues.push(`Word count rendah: ${wordCount} (target 500+)`);
  } else {
    breakdown.wordCount = 0;
    issues.push(`Word count sangat rendah: ${wordCount}`);
  }

  // 9. Internal links (10 pts)
  const linkCount = (input.body.match(/<a[^>]*href=["']\/[^"']+["']/g) || []).length;
  if (linkCount >= 5) breakdown.internalLinks = 10;
  else if (linkCount >= 2) breakdown.internalLinks = 7;
  else if (linkCount >= 1) {
    breakdown.internalLinks = 4;
    issues.push("Internal link < 2");
  } else {
    breakdown.internalLinks = 0;
    issues.push("Tidak ada internal link");
  }

  // 10. Tags (5 pts)
  const tagCount = (input.tags || []).length;
  if (tagCount >= 5) breakdown.tags = 5;
  else if (tagCount >= 3) breakdown.tags = 3;
  else if (tagCount >= 1) {
    breakdown.tags = 1;
    issues.push(`Tags hanya ${tagCount}`);
  } else {
    breakdown.tags = 0;
    issues.push("Tidak ada tags");
  }

  // Bonus: FAQ (5 pts)
  let max = 100;
  const hasFaq = /<h2[^>]*>\s*(FAQ|Frequently)/i.test(input.body || "");
  if (hasFaq) {
    breakdown.faqBonus = 5;
    max = 105;
  }

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  const percentage = Math.round((total / max) * 100);

  return {
    total,
    max,
    percentage,
    breakdown,
    issues,
    wordCount,
    h2Count: h2Matches.length,
    linkCount,
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);
    const sortBy = searchParams.get("sort") || "score-asc"; // score-asc (worst first) | score-desc | recent

    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        excerpt: true,
        seoTitle: true,
        seoDescription: true,
        publishedAt: true,
        viewCount: true,
        featuredImage: true,
        category: { select: { name: true, slug: true } },
        tags: { select: { name: true } },
      },
      take: limit,
      orderBy: { publishedAt: "desc" },
    });

    const scored = articles.map((a) => {
      const result = scoreContent({
        title: a.title,
        seoTitle: a.seoTitle,
        seoDescription: a.seoDescription,
        excerpt: a.excerpt,
        body: a.content,
        tags: a.tags.map((t) => t.name),
        targetKeyword: a.tags[0]?.name || "",
      });
      return {
        id: a.id,
        slug: a.slug,
        title: a.title,
        category: a.category?.name || null,
        categorySlug: a.category?.slug || null,
        publishedAt: a.publishedAt,
        viewCount: a.viewCount,
        hasImage: !!a.featuredImage,
        targetKeyword: a.tags[0]?.name || null,
        ...result,
      };
    });

    // Sort
    if (sortBy === "score-asc") scored.sort((a, b) => a.percentage - b.percentage);
    else if (sortBy === "score-desc") scored.sort((a, b) => b.percentage - a.percentage);
    else if (sortBy === "recent") {
      // Already by publishedAt desc
    }

    // Distribution
    const dist = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0 };
    let totalPct = 0;
    for (const s of scored) {
      totalPct += s.percentage;
      if (s.percentage >= 90) dist.excellent++;
      else if (s.percentage >= 75) dist.good++;
      else if (s.percentage >= 60) dist.fair++;
      else if (s.percentage >= 40) dist.poor++;
      else dist.critical++;
    }

    return successResponse({
      total: scored.length,
      avgScore: scored.length ? Math.round(totalPct / scored.length) : 0,
      distribution: dist,
      articles: scored,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
