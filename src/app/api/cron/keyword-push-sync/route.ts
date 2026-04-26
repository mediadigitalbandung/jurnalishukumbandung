export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/keyword-push-sync
 *
 * Cron job: sync TargetKeyword positions dari GSC + create snapshot.
 *
 * Protected by CRON_SECRET bearer token.
 *
 * Recommended crontab:
 *   0 1 * * * curl -sH "Authorization: Bearer SECRET" https://jurnalishukumbandung.com/api/cron/keyword-push-sync
 *
 * Run daily at 01:00 UTC (08:00 WIB) to capture fresh GSC data.
 */

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
  if (!tokenJson.access_token) throw new Error("Failed to get access token");
  return tokenJson.access_token;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [serviceAccountJson, siteUrl] = await Promise.all([
      getSetting("google_service_account"),
      getSetting("search_console_site_url"),
    ]);

    if (!serviceAccountJson || !siteUrl) {
      return Response.json({ success: false, error: "GSC not configured" }, { status: 200 });
    }

    const accessToken = await getAccessToken(serviceAccountJson);
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

    const targets = await prisma.targetKeyword.findMany({ where: { isActive: true } });

    let updated = 0;
    let snapshotCount = 0;

    for (const target of targets) {
      const lower = target.keyword.toLowerCase();
      const exact = allQueries.find((q) => q.keys[0].toLowerCase() === lower);
      let match: { position: number; impressions: number; clicks: number; ctr: number } | null = null;

      if (exact) {
        match = { position: exact.position, impressions: exact.impressions, clicks: exact.clicks, ctr: exact.ctr };
      } else {
        const partials = allQueries.filter((q) => q.keys[0].toLowerCase().includes(lower));
        if (partials.length > 0) {
          const totalImp = partials.reduce((s, q) => s + q.impressions, 0);
          const totalClicks = partials.reduce((s, q) => s + q.clicks, 0);
          const weightedPos = totalImp > 0
            ? partials.reduce((s, q) => s + q.position * q.impressions, 0) / totalImp
            : null;
          if (weightedPos !== null) {
            match = {
              position: weightedPos,
              impressions: totalImp,
              clicks: totalClicks,
              ctr: totalImp > 0 ? totalClicks / totalImp : 0,
            };
          }
        }
      }

      let status = "no-data";
      if (match) {
        status = match.position <= target.targetPosition ? "on-track" : "needs-push";
      }

      await prisma.targetKeyword.update({
        where: { id: target.id },
        data: {
          currentPosition: match?.position ?? null,
          currentImpressions: match?.impressions ?? 0,
          currentClicks: match?.clicks ?? 0,
          currentCtr: match?.ctr ?? 0,
          lastSyncedAt: new Date(),
          status,
        },
      });

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

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      updated,
      snapshotCount,
      totalKeywords: targets.length,
    });
  } catch (e) {
    return Response.json({
      success: false,
      error: e instanceof Error ? e.message : "Unknown",
    }, { status: 500 });
  }
}
