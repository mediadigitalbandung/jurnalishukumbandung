export const dynamic = "force-dynamic";

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
      scope: "https://www.googleapis.com/auth/analytics.readonly",
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

interface GA4Row {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const [serviceAccountJson, propertyId] = await Promise.all([
      getSetting("google_service_account"),
      getSetting("ga4_property_id"),
    ]);

    if (!serviceAccountJson || !propertyId) {
      return successResponse({ configured: false });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    const endDate = "today";
    const startDate = `${days}daysAgo`;

    let accessToken: string;
    try {
      accessToken = await getAccessToken(serviceAccountJson);
    } catch {
      return successResponse({ configured: true, error: "Gagal autentikasi ke Google API" });
    }

    const baseUrl = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    // Run multiple reports in parallel
    const [dailyRes, deviceRes, countryRes, summaryRes] = await Promise.all([
      // Daily sessions + pageviews
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "date" }],
          metrics: [
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "newUsers" },
            { name: "bounceRate" },
          ],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      }),
      // Device category breakdown
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
        }),
      }),
      // Top countries
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),
      }),
      // Overall summary
      fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "newUsers" },
            { name: "totalUsers" },
            { name: "bounceRate" },
            { name: "averageSessionDuration" },
          ],
        }),
      }),
    ]);

    const [dailyJson, deviceJson, countryJson, summaryJson] = await Promise.all([
      dailyRes.json(),
      deviceRes.json(),
      countryRes.json(),
      summaryRes.json(),
    ]);

    // Parse daily data
    const dailyData = (dailyJson.rows || []).map((r: GA4Row) => {
      const rawDate = r.dimensionValues[0].value;
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      return {
        date,
        sessions: parseInt(r.metricValues[0].value),
        pageViews: parseInt(r.metricValues[1].value),
        newUsers: parseInt(r.metricValues[2].value),
        bounceRate: Math.round(parseFloat(r.metricValues[3].value) * 100) / 100,
      };
    });

    // Parse device breakdown
    const deviceData = (deviceJson.rows || []).map((r: GA4Row) => ({
      device: r.dimensionValues[0].value,
      sessions: parseInt(r.metricValues[0].value),
      pageViews: parseInt(r.metricValues[1].value),
    }));

    // Parse top countries
    const countryData = (countryJson.rows || []).map((r: GA4Row) => ({
      country: r.dimensionValues[0].value,
      sessions: parseInt(r.metricValues[0].value),
    }));

    // Parse summary
    const summaryRow = summaryJson.rows?.[0];
    const summary = summaryRow
      ? {
          sessions: parseInt(summaryRow.metricValues[0].value),
          pageViews: parseInt(summaryRow.metricValues[1].value),
          newUsers: parseInt(summaryRow.metricValues[2].value),
          totalUsers: parseInt(summaryRow.metricValues[3].value),
          bounceRate: Math.round(parseFloat(summaryRow.metricValues[4].value) * 10000) / 100,
          avgSessionDuration: Math.round(parseFloat(summaryRow.metricValues[5].value)),
        }
      : null;

    return successResponse({
      configured: true,
      days,
      summary,
      dailyData,
      deviceData,
      countryData,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
