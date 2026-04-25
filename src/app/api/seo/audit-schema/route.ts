/**
 * Audit JSON-LD schema markup across all PUBLISHED articles.
 * Identifies articles where schema generation might be incomplete or invalid.
 *
 * GET /api/seo/audit-schema
 *   Headers: Authorization: Bearer ${CRON_SECRET}
 *
 * Returns: counts + sample list of articles with schema issues.
 *
 * Note: schema markup in JHB is generated dynamically in article page component
 * (server-side render). This audit checks DATA COMPLETENESS — articles with
 * missing fields that would result in incomplete JSON-LD output.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SchemaIssue {
  id: string;
  slug: string;
  title: string;
  missing: string[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      featuredImage: true,
      publishedAt: true,
      updatedAt: true,
      content: true,
      faqData: true,
      author: { select: { name: true, avatar: true, bio: true } },
      category: { select: { name: true } },
    },
  });

  const issues: SchemaIssue[] = [];
  let perfectCount = 0;
  let withFaqSchema = 0;

  for (const a of articles) {
    const missing: string[] = [];

    // NewsArticle schema requirements
    if (!a.excerpt || a.excerpt.length < 50) missing.push("excerpt");
    if (!a.featuredImage) missing.push("featuredImage (Article needs image for rich result)");
    if (!a.publishedAt) missing.push("publishedAt");
    if (!a.author?.name) missing.push("author.name");
    if (!a.author?.bio || a.author.bio.length < 20) missing.push("author.bio (E-E-A-T signal)");
    if (!a.author?.avatar) missing.push("author.avatar");
    if (!a.category?.name) missing.push("category");

    // Content depth (Google rewards depth)
    const cleanLength = a.content.replace(/<[^>]*>/g, "").length;
    if (cleanLength < 300) missing.push(`content too short (${cleanLength} chars)`);

    // FAQ schema bonus
    if (a.faqData) {
      try {
        const faq = JSON.parse(a.faqData);
        if (Array.isArray(faq) && faq.length > 0) withFaqSchema++;
      } catch { /* ignore */ }
    }

    if (missing.length === 0) {
      perfectCount++;
    } else {
      issues.push({
        id: a.id,
        slug: a.slug,
        title: a.title,
        missing,
      });
    }
  }

  // Group missing fields stats
  const fieldStats: Record<string, number> = {};
  for (const issue of issues) {
    for (const m of issue.missing) {
      const key = m.split("(")[0].trim();
      fieldStats[key] = (fieldStats[key] || 0) + 1;
    }
  }

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    totals: {
      published: articles.length,
      perfect: perfectCount,
      withIssues: issues.length,
      withFaqSchema,
      withoutFaqSchema: articles.length - withFaqSchema,
    },
    fieldStats,
    sampleIssues: issues.slice(0, 30),
    actionHints: {
      featuredImageMissing: fieldStats["featuredImage"]
        ? `${fieldStats["featuredImage"]} artikel tanpa featuredImage — Google rich result tidak akan muncul. Manual upload diperlukan.`
        : "All articles have featured images.",
      authorBioMissing: fieldStats["author.bio"]
        ? `${fieldStats["author.bio"]} artikel dengan author bio kurang dari 20 char — E-E-A-T weak. Update penulis bio.`
        : "All authors have bios.",
      excerptMissing: fieldStats["excerpt"]
        ? `${fieldStats["excerpt"]} artikel tanpa excerpt — auto-generate via /api/seo/auto-fix-meta.`
        : "All articles have excerpts.",
      faqOpportunity: `${articles.length - withFaqSchema} artikel tanpa FAQ schema — peluang Featured Snippet via /api/articles/:id/generate-faq.`,
    },
  });
}
