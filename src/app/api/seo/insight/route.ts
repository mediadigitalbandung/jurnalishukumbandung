export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "crypto";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

// Industry benchmark CTR by position (Advanced Web Ranking 2023-2024)
const EXPECTED_CTR: Record<number, number> = {
  1: 39.8, 2: 18.7, 3: 10.2, 4: 7.2, 5: 5.1,
  6: 4.4, 7: 3.0, 8: 2.1, 9: 1.9, 10: 1.6,
};

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

type Query = { query: string; clicks: number; impressions: number; ctr: number; position: number };

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "28");

    const [serviceAccountJson, siteUrl] = await Promise.all([
      getSetting("google_service_account"),
      getSetting("search_console_site_url"),
    ]);

    if (!serviceAccountJson || !siteUrl) {
      return successResponse({ configured: false });
    }

    const accessToken = await getAccessToken(serviceAccountJson);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

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

    const queries: Query[] = (data.rows || []).map((r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));

    // Categorize
    const top3 = queries.filter((q) => q.position >= 1 && q.position <= 3);
    const page1 = queries.filter((q) => q.position > 3 && q.position <= 10);
    const opportunity = queries
      .filter((q) => q.position > 10 && q.position <= 30 && q.impressions >= 50);
    const page23 = queries.filter((q) => q.position > 10 && q.position <= 30);
    const deep = queries.filter((q) => q.position > 30);

    const lowCtr = queries.filter((q) => {
      if (q.position > 10 || q.impressions < 30) return false;
      const expected = EXPECTED_CTR[Math.round(q.position)] || 1;
      return q.ctr * 100 < expected * 0.5;
    });

    const lowCtrWithExpected = lowCtr.map((q) => ({
      ...q,
      expectedCtr: EXPECTED_CTR[Math.round(q.position)] || 1,
    }));

    return successResponse({
      configured: true,
      period: {
        days,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
      },
      summary: {
        total: queries.length,
        top3: top3.length,
        page1: page1.length,
        opportunity: opportunity.length,
        lowCtr: lowCtr.length,
        page23: page23.length,
        deep: deep.length,
      },
      queries: {
        top3: top3.sort((a, b) => b.clicks - a.clicks),
        page1: page1.sort((a, b) => b.clicks - a.clicks),
        opportunity: opportunity.sort((a, b) => b.impressions - a.impressions),
        lowCtr: lowCtrWithExpected.sort((a, b) => b.impressions - a.impressions),
        page23: page23.sort((a, b) => a.position - b.position),
        deep: deep.sort((a, b) => b.impressions - a.impressions),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
