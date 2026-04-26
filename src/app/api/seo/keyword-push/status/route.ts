export const dynamic = "force-dynamic";

import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const keywords = await prisma.targetKeyword.findMany({
      orderBy: [
        { priority: "asc" }, // HIGH < LOW alphabetically — flip below
        { currentPosition: "asc" },
      ],
      include: {
        snapshots: {
          orderBy: { snappedAt: "desc" },
          take: 14,
        },
      },
    });

    // Calculate trend per keyword (last vs prev snapshot)
    const enriched = keywords.map((k) => {
      const snaps = k.snapshots;
      let trend: "up" | "down" | "flat" | "new" = "new";
      let trendDiff: number | null = null;
      if (snaps.length >= 2) {
        const last = snaps[0];
        const prev = snaps[1];
        if (last.position !== null && prev.position !== null) {
          trendDiff = +(prev.position - last.position).toFixed(1);
          if (Math.abs(trendDiff) < 0.3) trend = "flat";
          else if (trendDiff > 0) trend = "up"; // position decreased = ranking up
          else trend = "down";
        }
      } else if (snaps.length === 1 && snaps[0].position !== null) {
        trend = "flat";
      }

      // Auto-classify status
      let status = k.status;
      if (k.currentPosition === null) status = "no-data";
      else if (k.currentPosition <= k.targetPosition) status = "on-track";
      else if (trend === "up" || trend === "flat") status = "needs-push";
      else if (trend === "down") status = "stagnant";

      return {
        id: k.id,
        keyword: k.keyword,
        priority: k.priority,
        targetPosition: k.targetPosition,
        currentPosition: k.currentPosition,
        currentImpressions: k.currentImpressions,
        currentClicks: k.currentClicks,
        currentCtr: k.currentCtr,
        bestArticleSlug: k.bestArticleSlug,
        bestArticleId: k.bestArticleId,
        lastSyncedAt: k.lastSyncedAt,
        lastBoostedAt: k.lastBoostedAt,
        boostCount: k.boostCount,
        notes: k.notes,
        isActive: k.isActive,
        status,
        trend,
        trendDiff,
        snapshotCount: snaps.length,
        history: snaps.slice(0, 14).reverse().map((s) => ({
          date: s.snappedAt.toISOString().slice(0, 10),
          position: s.position,
          impressions: s.impressions,
          clicks: s.clicks,
        })),
      };
    });

    // Sort: HIGH priority first, then by needs-push, then current position
    const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    const statusOrder: Record<string, number> = {
      "needs-push": 0,
      "stagnant": 1,
      "no-data": 2,
      "on-track": 3,
    };
    enriched.sort((a, b) => {
      const p = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
      if (p !== 0) return p;
      const s = (statusOrder[a.status] ?? 2) - (statusOrder[b.status] ?? 2);
      if (s !== 0) return s;
      return (a.currentPosition ?? 999) - (b.currentPosition ?? 999);
    });

    const summary = {
      total: enriched.length,
      active: enriched.filter((k) => k.isActive).length,
      onTrack: enriched.filter((k) => k.status === "on-track").length,
      needsPush: enriched.filter((k) => k.status === "needs-push").length,
      stagnant: enriched.filter((k) => k.status === "stagnant").length,
      noData: enriched.filter((k) => k.status === "no-data").length,
      byPriority: {
        HIGH: enriched.filter((k) => k.priority === "HIGH").length,
        MEDIUM: enriched.filter((k) => k.priority === "MEDIUM").length,
        LOW: enriched.filter((k) => k.priority === "LOW").length,
      },
    };

    return successResponse({ summary, keywords: enriched });
  } catch (error) {
    return errorResponse(error);
  }
}
