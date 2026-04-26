export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "crypto";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

async function getSetting(key: string): Promise<string | null> {
  const s = await prisma.systemSetting.findUnique({ where: { key } });
  return s?.value ?? null;
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  ).toString("base64url");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key, "base64url");
  const jwt = `${header}.${payload}.${sig}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) throw new Error("Failed to get Google access token");
  return tokenJson.access_token;
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const [serviceAccountJson, siteUrl] = await Promise.all([
      getSetting("google_service_account"),
      getSetting("search_console_site_url"),
    ]);

    if (!serviceAccountJson || !siteUrl) {
      return successResponse({ configured: false });
    }

    const accessToken = await getAccessToken(serviceAccountJson);

    // Pull last 7 days from GSC
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        dimensions: ["query"],
        rowLimit: 1000,
      }),
    });
    const data = await res.json();

    type Q = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
    const allQueries = (data.rows || []) as Q[];

    // Load all active target keywords
    const targets = await prisma.targetKeyword.findMany({ where: { isActive: true } });

    let updated = 0;
    let snapshotCount = 0;

    for (const target of targets) {
      const lower = target.keyword.toLowerCase();
      // Find best matching query (exact > partial)
      const exact = allQueries.find((q) => q.keys[0].toLowerCase() === lower);
      let match: { position: number; impressions: number; clicks: number; ctr: number } | null = null;
      if (exact) {
        match = {
          position: exact.position,
          impressions: exact.impressions,
          clicks: exact.clicks,
          ctr: exact.ctr,
        };
      } else {
        // Aggregate partial matches (queries containing keyword)
        const partials = allQueries.filter((q) => q.keys[0].toLowerCase().includes(lower));
        if (partials.length > 0) {
          const totalImpressions = partials.reduce((s, q) => s + q.impressions, 0);
          const totalClicks = partials.reduce((s, q) => s + q.clicks, 0);
          // Weighted avg position by impressions
          const weightedPos = totalImpressions > 0
            ? partials.reduce((s, q) => s + q.position * q.impressions, 0) / totalImpressions
            : null;
          if (weightedPos !== null) {
            match = {
              position: weightedPos,
              impressions: totalImpressions,
              clicks: totalClicks,
              ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
            };
          }
        }
      }

      // Find best article (article with target_keyword tag matching)
      let bestArticle: { id: string; slug: string } | null = null;
      const tagMatch = await prisma.tag.findFirst({
        where: {
          OR: [
            { name: { equals: target.keyword, mode: "insensitive" } },
            { slug: target.keyword.toLowerCase().replace(/\s+/g, "-") },
          ],
        },
        include: {
          articles: {
            where: { status: "PUBLISHED" },
            select: { id: true, slug: true, viewCount: true },
            orderBy: { viewCount: "desc" },
            take: 1,
          },
        },
      });
      if (tagMatch?.articles[0]) {
        bestArticle = { id: tagMatch.articles[0].id, slug: tagMatch.articles[0].slug };
      } else {
        // Fallback: find article with keyword in title
        const titleMatch = await prisma.article.findFirst({
          where: {
            status: "PUBLISHED",
            title: { contains: target.keyword, mode: "insensitive" },
          },
          select: { id: true, slug: true },
          orderBy: { viewCount: "desc" },
        });
        if (titleMatch) bestArticle = { id: titleMatch.id, slug: titleMatch.slug };
      }

      // Determine status
      let status = "no-data";
      if (match) {
        if (match.position <= target.targetPosition) status = "on-track";
        else status = "needs-push";
      }

      // Update TargetKeyword
      await prisma.targetKeyword.update({
        where: { id: target.id },
        data: {
          currentPosition: match?.position ?? null,
          currentImpressions: match?.impressions ?? 0,
          currentClicks: match?.clicks ?? 0,
          currentCtr: match?.ctr ?? 0,
          bestArticleId: bestArticle?.id ?? null,
          bestArticleSlug: bestArticle?.slug ?? null,
          lastSyncedAt: new Date(),
          status,
        },
      });

      // Snapshot
      if (match) {
        await prisma.keywordRankSnapshot.create({
          data: {
            keywordId: target.id,
            position: match.position,
            impressions: match.impressions,
            clicks: match.clicks,
            ctr: match.ctr,
          },
        });
        snapshotCount++;
      }

      updated++;
    }

    return successResponse({
      configured: true,
      updated,
      snapshotCount,
      totalKeywords: targets.length,
      period: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
