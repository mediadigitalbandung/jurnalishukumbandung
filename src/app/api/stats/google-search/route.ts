import { NextRequest } from "next/server";
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

  const crypto = await import("crypto");
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

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const [serviceAccountJson, siteUrl] = await Promise.all([
      getSetting("google_service_account"),
      getSetting("search_console_site_url"),
    ]);

    if (!serviceAccountJson || !siteUrl) {
      return successResponse({ configured: false });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "28");

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    let accessToken: string;
    try {
      accessToken = await getAccessToken(serviceAccountJson);
    } catch {
      return successResponse({ configured: true, error: "Gagal autentikasi ke Google API" });
    }

    const baseUrl = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // Fetch: overall summary + daily breakdown + top queries + top pages
    const [summaryRes, dailyRes, queriesRes, pagesRes] = await Promise.all([
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ startDate: startStr, endDate: endStr, rowLimit: 1 }),
      }),
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          startDate: startStr,
          endDate: endStr,
          dimensions: ["date"],
          rowLimit: 100,
        }),
      }),
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          startDate: startStr,
          endDate: endStr,
          dimensions: ["query"],
          rowLimit: 1000,
        }),
      }),
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          startDate: startStr,
          endDate: endStr,
          dimensions: ["page"],
          rowLimit: 500,
        }),
      }),
    ]);

    const [summaryJson, dailyJson, queriesJson, pagesJson] = await Promise.all([
      summaryRes.json(),
      dailyRes.json(),
      queriesRes.json(),
      pagesRes.json(),
    ]);

    // Aggregate summary from daily rows
    const dailyRows: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }[] =
      dailyJson.rows || [];

    const totals = dailyRows.reduce(
      (acc, r) => ({
        clicks: acc.clicks + r.clicks,
        impressions: acc.impressions + r.impressions,
      }),
      { clicks: 0, impressions: 0 }
    );
    const avgCtr =
      dailyRows.length > 0
        ? dailyRows.reduce((a, r) => a + r.ctr, 0) / dailyRows.length
        : 0;
    const avgPosition =
      dailyRows.length > 0
        ? dailyRows.reduce((a, r) => a + r.position, 0) / dailyRows.length
        : 0;

    const dailyData = dailyRows.map((r) => ({
      date: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Math.round(r.ctr * 10000) / 100,
      position: Math.round(r.position * 10) / 10,
    }));

    const topQueries = (queriesJson.rows || []).map((r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Math.round(r.ctr * 10000) / 100,
      position: Math.round(r.position * 10) / 10,
    }));

    const topPages = (pagesJson.rows || []).map((r: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
      page: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Math.round(r.ctr * 10000) / 100,
      position: Math.round(r.position * 10) / 10,
    }));

    void summaryJson; // not used directly

    return successResponse({
      configured: true,
      days,
      totals: {
        clicks: totals.clicks,
        impressions: totals.impressions,
        avgCtr: Math.round(avgCtr * 10000) / 100,
        avgPosition: Math.round(avgPosition * 10) / 10,
      },
      dailyData,
      topQueries,
      topPages,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
