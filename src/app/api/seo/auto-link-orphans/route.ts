/**
 * Auto-link orphan articles — finds articles with <2 incoming internal links
 * and inserts contextual cross-links from related articles (same category/tags).
 *
 * POST /api/seo/auto-link-orphans
 *   Headers: Authorization: Bearer ${CRON_SECRET}
 *   Body: {
 *     limit?: number (max orphans to process, default 20),
 *     maxLinksPerLinker?: number (default 2 — avoid over-linking single article),
 *     dryRun?: boolean
 *   }
 *
 * Strategy:
 * 1. Find PUBLISHED articles last 90d → orphan if <2 incoming links
 * 2. For each orphan: find 3-5 candidate "linker" articles (same category/tags)
 * 3. Find natural anchor text in linker body (orphan title keywords)
 * 4. Insert <a> link before/after first matching paragraph
 * 5. Update linker article + log change
 *
 * Internal-link signal helps Google understand topic clusters → boost ranking.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
  maxLinksPerLinker: z.number().int().min(1).max(5).optional().default(2),
  dryRun: z.boolean().optional().default(false),
});

interface LinkChange {
  orphanSlug: string;
  orphanTitle: string;
  linkerSlug: string;
  anchorText: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { limit, maxLinksPerLinker, dryRun } = bodySchema.parse(body);

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Step 1: get all published articles last 90d
    const articles = await prisma.article.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { gte: ninetyDaysAgo, not: null },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        categoryId: true,
        tags: { select: { id: true, name: true } },
      },
    });

    // Step 2: count incoming links per article (regex /berita/[slug])
    const incomingCount = new Map<string, number>();
    for (const a of articles) incomingCount.set(a.slug, 0);
    for (const linker of articles) {
      const matches = linker.content.match(/\/berita\/([a-z0-9-]+)/gi) || [];
      for (const m of matches) {
        const targetSlug = m.replace("/berita/", "").toLowerCase();
        if (targetSlug === linker.slug) continue; // ignore self-links
        const cur = incomingCount.get(targetSlug);
        if (cur !== undefined) incomingCount.set(targetSlug, cur + 1);
      }
    }

    // Step 3: orphans = <2 incoming
    const orphans = articles
      .filter((a) => (incomingCount.get(a.slug) || 0) < 2)
      .slice(0, limit);

    const changes: LinkChange[] = [];
    const linksAddedByLinker = new Map<string, number>();
    const updates = new Map<string, string>(); // articleId → new content

    for (const orphan of orphans) {
      // Build keyword candidates from title + tags + category name
      const titleKeywords = extractKeywords(orphan.title);
      const tagKeywords = orphan.tags.flatMap((t) => extractKeywords(t.name));
      const allKeywords = Array.from(new Set([...titleKeywords, ...tagKeywords]));
      if (allKeywords.length === 0) continue;

      // Candidate linkers: same category OR share ≥1 tag, and not the orphan itself
      const orphanTagIds = new Set(orphan.tags.map((t) => t.id));
      const candidates = articles.filter((a) => {
        if (a.id === orphan.id) return false;
        if ((linksAddedByLinker.get(a.id) || 0) >= maxLinksPerLinker) return false;
        const sameCategory = a.categoryId === orphan.categoryId;
        const sharedTag = a.tags.some((t) => orphanTagIds.has(t.id));
        if (!sameCategory && !sharedTag) return false;
        const linkerContent = updates.get(a.id) || a.content;
        if (linkerContent.includes(`/berita/${orphan.slug}`)) return false;
        return true;
      });

      candidates.sort((a, b) => {
        const scoreA = (a.categoryId === orphan.categoryId ? 2 : 0) +
                       a.tags.filter((t) => orphanTagIds.has(t.id)).length;
        const scoreB = (b.categoryId === orphan.categoryId ? 2 : 0) +
                       b.tags.filter((t) => orphanTagIds.has(t.id)).length;
        return scoreB - scoreA;
      });

      // Try inline contextual link first (better SEO)
      let linked = false;
      for (const linker of candidates.slice(0, 8)) {
        const linkerContent = updates.get(linker.id) || linker.content;
        const result = insertContextualLink(linkerContent, orphan.slug, orphan.title, allKeywords);
        if (!result) continue;
        updates.set(linker.id, result.newContent);
        linksAddedByLinker.set(linker.id, (linksAddedByLinker.get(linker.id) || 0) + 1);
        changes.push({
          orphanSlug: orphan.slug,
          orphanTitle: orphan.title,
          linkerSlug: linker.slug,
          anchorText: result.anchorText,
        });
        linked = true;
        break;
      }

      // FALLBACK: append "Baca juga" link at end of TOP candidate (still legitimate SEO signal)
      if (!linked && candidates.length > 0) {
        const linker = candidates[0];
        const linkerContent = updates.get(linker.id) || linker.content;
        const newContent = appendBacaJuga(linkerContent, orphan.slug, orphan.title);
        updates.set(linker.id, newContent);
        linksAddedByLinker.set(linker.id, (linksAddedByLinker.get(linker.id) || 0) + 1);
        changes.push({
          orphanSlug: orphan.slug,
          orphanTitle: orphan.title,
          linkerSlug: linker.slug,
          anchorText: `Baca juga: ${orphan.title.slice(0, 60)}`,
        });
      }
    }

    // Step 4: persist updates
    let articlesUpdated = 0;
    if (!dryRun) {
      const entries = Array.from(updates.entries());
      for (const [articleId, newContent] of entries) {
        await prisma.article.update({
          where: { id: articleId },
          data: { content: newContent },
        });
        articlesUpdated++;
      }
    }

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      dryRun,
      orphansFound: orphans.length,
      linksInserted: changes.length,
      articlesUpdated,
      changes: changes.slice(0, 20),
      summary: {
        totalArticlesScanned: articles.length,
        totalOrphans: articles.filter((a) => (incomingCount.get(a.slug) || 0) < 2).length,
        wellLinked: articles.filter((a) => (incomingCount.get(a.slug) || 0) >= 2).length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Indonesian stopwords (incomplete but covers common ones)
const STOPWORDS = new Set([
  "yang", "dan", "di", "untuk", "dari", "dengan", "pada", "ini", "itu", "atau",
  "ke", "dalam", "akan", "tidak", "sudah", "telah", "juga", "ada", "oleh", "bisa",
  "saat", "ketika", "sampai", "tetapi", "namun", "tapi", "agar", "supaya",
  "berita", "info", "kabar", "news", "live", "update", "terbaru", "viral",
]);

function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .slice(0, 10);
}

/**
 * Append "Baca juga" block at end of last paragraph in linker content.
 * Lower-quality than inline contextual link but still gives Google signal.
 */
function appendBacaJuga(content: string, orphanSlug: string, orphanTitle: string): string {
  const linkHtml = `\n<p class="baca-juga"><strong>Baca juga:</strong> <a href="/berita/${orphanSlug}" title="${escapeHtml(orphanTitle)}">${escapeHtml(orphanTitle)}</a></p>\n`;
  // Inject before last </p> if exists, else just append
  const lastClose = content.lastIndexOf("</p>");
  if (lastClose >= 0) {
    return content.slice(0, lastClose + 4) + linkHtml + content.slice(lastClose + 4);
  }
  return content + linkHtml;
}

/**
 * Insert link to orphan into linker content. Returns null if no good insertion point.
 * Strategy:
 * 1. Find first paragraph in body that contains 1+ keyword
 * 2. Wrap a short phrase (2-4 words) around the keyword as anchor
 * 3. Skip if paragraph already has too many links (>3)
 */
function insertContextualLink(
  content: string,
  orphanSlug: string,
  orphanTitle: string,
  keywords: string[]
): { newContent: string; anchorText: string } | null {
  // Skip if linker already has many links (avoid spam look)
  const existingLinks = (content.match(/<a\s/gi) || []).length;
  if (existingLinks > 15) return null;

  // Match paragraphs (split by </p> or double newline)
  const paragraphs = content.split(/(<\/p>|\n\n)/);
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    if (!p || p.length < 100) continue; // need substantial paragraph
    if (p.includes(`/berita/${orphanSlug}`)) continue; // already linked
    const linksInParagraph = (p.match(/<a\s/gi) || []).length;
    if (linksInParagraph > 1) continue; // already has too many links

    const lower = p.toLowerCase();

    // Find first keyword that appears in paragraph (not inside an existing tag/link)
    for (const kw of keywords) {
      const idx = lower.indexOf(kw);
      if (idx === -1) continue;

      // Skip if inside an HTML tag or existing <a>
      const beforeIdx = p.slice(0, idx);
      const openTags = (beforeIdx.match(/<(?!\/)/g) || []).length;
      const closeTags = (beforeIdx.match(/<\//g) || []).length;
      if (openTags > closeTags) continue; // inside tag

      // Build anchor text: take 2-4 word phrase containing keyword
      const wordsBefore = p.slice(Math.max(0, idx - 30), idx).split(/\s+/);
      const wordsAfter = p.slice(idx + kw.length, idx + kw.length + 50).split(/\s+/);
      const anchorWords = [
        wordsBefore[wordsBefore.length - 1] || "",
        kw,
        ...wordsAfter.slice(0, 2),
      ].filter((w) => w && w.length > 0).join(" ");

      const cleanAnchor = anchorWords
        .replace(/[<>"]/g, "")
        .trim()
        .slice(0, 60);

      if (cleanAnchor.length < 8) continue;

      // Replace first occurrence of cleanAnchor in paragraph with link
      const anchorRegex = new RegExp(escapeRegex(cleanAnchor), "i");
      const match = p.match(anchorRegex);
      if (!match) continue;

      const newParagraph = p.replace(
        anchorRegex,
        `<a href="/berita/${orphanSlug}" title="${escapeHtml(orphanTitle)}">${match[0]}</a>`
      );
      paragraphs[i] = newParagraph;
      return { newContent: paragraphs.join(""), anchorText: match[0] };
    }
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
