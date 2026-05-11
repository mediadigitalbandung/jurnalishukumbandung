export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import { ApiError, errorResponse, requireAuth, successResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { EDITOR_ROLES } from "@/lib/roles";

const ALLOWED_DAYS = [7, 30, 60, 90] as const;
type AllowedDays = (typeof ALLOWED_DAYS)[number];

function parseDays(raw: string | null): AllowedDays {
  const n = parseInt(raw || "30", 10);
  return (ALLOWED_DAYS as readonly number[]).includes(n) ? (n as AllowedDays) : 30;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (!EDITOR_ROLES.includes(session.user.role)) {
      throw new ApiError("Forbidden — hanya editor", 403);
    }

    const { searchParams } = new URL(request.url);
    const days = parseDays(searchParams.get("days"));

    // Default: editor sees own stats. SUPER_ADMIN may pass ?userId=X for any editor.
    const requestedUserId = searchParams.get("userId");
    let targetUserId = session.user.id;
    if (requestedUserId && requestedUserId !== session.user.id) {
      if (session.user.role !== "SUPER_ADMIN") {
        throw new ApiError("Forbidden", 403);
      }
      targetUserId = requestedUserId;
    }

    const now = new Date();
    const since = new Date(now);
    since.setDate(now.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const baseWhere = {
      reviewedBy: targetUserId,
      reviewedAt: { gte: since, lte: now },
    } as const;

    const [statusCounts, recentReviews, dailyReviews] = await Promise.all([
      prisma.article.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { id: true },
      }),
      prisma.article.findMany({
        where: baseWhere,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          reviewNote: true,
          reviewedAt: true,
          author: { select: { id: true, name: true } },
        },
        orderBy: { reviewedAt: "desc" },
        take: 10,
      }),
      prisma.article.findMany({
        where: baseWhere,
        select: { reviewedAt: true, status: true },
        orderBy: { reviewedAt: "asc" },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) statusMap[s.status] = s._count.id;

    const approved = (statusMap["APPROVED"] || 0) + (statusMap["PUBLISHED"] || 0);
    const rejected = statusMap["REJECTED"] || 0;
    const pending = statusMap["IN_REVIEW"] || 0;
    const totalReview = approved + rejected + pending;

    // Build daily reviews map across the full period (zero-filled)
    const dayMap: Record<string, { approved: number; rejected: number; total: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      dayMap[d.toISOString().slice(0, 10)] = { approved: 0, rejected: 0, total: 0 };
    }
    for (const r of dailyReviews) {
      if (!r.reviewedAt) continue;
      const key = r.reviewedAt.toISOString().slice(0, 10);
      if (!(key in dayMap)) continue;
      dayMap[key].total++;
      if (r.status === "APPROVED" || r.status === "PUBLISHED") dayMap[key].approved++;
      else if (r.status === "REJECTED") dayMap[key].rejected++;
    }
    const reviewsPerDay = Object.entries(dayMap).map(([date, v]) => ({
      date,
      approved: v.approved,
      rejected: v.rejected,
      total: v.total,
    }));

    const approvalRate = totalReview > 0 ? Math.round((approved / totalReview) * 100) : 0;
    const rejectionRate = totalReview > 0 ? Math.round((rejected / totalReview) * 100) : 0;
    const pendingRate = totalReview > 0 ? Math.round((pending / totalReview) * 100) : 0;
    const avgPerDay = days > 0 ? Math.round((totalReview / days) * 10) / 10 : 0;

    return successResponse({
      period: { days, since: since.toISOString(), until: now.toISOString() },
      summary: {
        totalReview,
        approved,
        rejected,
        pending,
        approvalRate,
        rejectionRate,
        pendingRate,
        avgPerDay,
      },
      reviewsPerDay,
      recentReviews: recentReviews.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        status: a.status,
        reviewNote: a.reviewNote,
        reviewedAt: a.reviewedAt?.toISOString() || null,
        authorName: a.author?.name || null,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
