export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

async function getSetting(key: string): Promise<string | null> {
  const s = await prisma.systemSetting.findUnique({ where: { key } });
  return s?.value ?? null;
}

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const [apiToken, zoneId] = await Promise.all([
      getSetting("cloudflare_api_token"),
      getSetting("cloudflare_zone_id"),
    ]);

    if (!apiToken || !zoneId) {
      return successResponse({ configured: false });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);
    const untilStr = new Date().toISOString().slice(0, 10);

    // Cloudflare GraphQL Analytics API
    const query = `{
      viewer {
        zones(filter: { zoneTag: "${zoneId}" }) {
          httpRequests1dGroups(
            limit: 100
            filter: { date_geq: "${sinceStr}", date_leq: "${untilStr}" }
            orderBy: [date_ASC]
          ) {
            dimensions { date }
            sum {
              requests
              cachedRequests
              pageViews
              bytes
              cachedBytes
              threats
            }
            uniq { uniques }
          }
        }
      }
    }`;

    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      return successResponse({ configured: true, error: `Cloudflare API error: ${res.status}` });
    }

    const json = await res.json();
    const zone = json?.data?.viewer?.zones?.[0];
    if (!zone) {
      return successResponse({ configured: true, error: "No zone data returned" });
    }

    const dailyData = (zone.httpRequests1dGroups || []).map((g: {
      dimensions: { date: string };
      sum: { requests: number; cachedRequests: number; pageViews: number; bytes: number; cachedBytes: number; threats: number };
      uniq: { uniques: number };
    }) => ({
      date: g.dimensions.date,
      requests: g.sum.requests,
      cachedRequests: g.sum.cachedRequests,
      pageViews: g.sum.pageViews,
      bytes: g.sum.bytes,
      cachedBytes: g.sum.cachedBytes,
      threats: g.sum.threats,
      uniques: g.uniq.uniques,
    }));

    // Aggregate totals
    const totals = dailyData.reduce(
      (acc: { requests: number; pageViews: number; bytes: number; cachedBytes: number; uniques: number; threats: number }, d: { requests: number; pageViews: number; bytes: number; cachedBytes: number; uniques: number; threats: number }) => ({
        requests: acc.requests + d.requests,
        pageViews: acc.pageViews + d.pageViews,
        bytes: acc.bytes + d.bytes,
        cachedBytes: acc.cachedBytes + d.cachedBytes,
        uniques: acc.uniques + d.uniques,
        threats: acc.threats + d.threats,
      }),
      { requests: 0, pageViews: 0, bytes: 0, cachedBytes: 0, uniques: 0, threats: 0 }
    );

    const cacheRatio = totals.bytes > 0
      ? Math.round((totals.cachedBytes / totals.bytes) * 100)
      : 0;

    return successResponse({
      configured: true,
      days,
      totals: { ...totals, cacheRatio },
      dailyData,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
