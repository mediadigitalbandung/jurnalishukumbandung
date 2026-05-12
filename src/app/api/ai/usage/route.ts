export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const userId = searchParams.get("userId") || undefined;
    const skip = (page - 1) * limit;

    const where = userId ? { userId } : {};

    const [logs, total, totalsAgg, byUserAgg, byFeatureAgg] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.aIUsageLog.count({ where }),
      prisma.aIUsageLog.aggregate({
        where,
        _sum: { totalTokens: true },
        _count: { _all: true },
      }),
      // Group by user — Prisma groupBy is much cheaper than loading all rows in memory
      prisma.aIUsageLog.groupBy({
        by: ["userId", "userName"],
        where,
        _sum: { totalTokens: true },
        _count: { _all: true },
      }),
      prisma.aIUsageLog.groupBy({
        by: ["feature"],
        where,
        _sum: { totalTokens: true },
        _count: { _all: true },
      }),
    ]);

    const totalTokens = totalsAgg._sum.totalTokens || 0;
    const totalRequests = totalsAgg._count._all || 0;

    // Collapse multiple (userId, userName) rows into one per userId (user may
    // have changed display name over time → multiple groupBy rows).
    const byUserMap: Record<string, { name: string; tokens: number; requests: number }> = {};
    for (const g of byUserAgg) {
      const existing = byUserMap[g.userId];
      if (existing) {
        existing.tokens += g._sum.totalTokens || 0;
        existing.requests += g._count._all;
      } else {
        byUserMap[g.userId] = {
          name: g.userName,
          tokens: g._sum.totalTokens || 0,
          requests: g._count._all,
        };
      }
    }
    const byUser = Object.entries(byUserMap).map(([userId, data]) => ({
      userId,
      ...data,
    }));

    const byFeature = byFeatureAgg.map((g) => ({
      feature: g.feature,
      tokens: g._sum.totalTokens || 0,
      requests: g._count._all,
    }));

    return successResponse({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: { totalTokens, totalRequests, byUser, byFeature },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
