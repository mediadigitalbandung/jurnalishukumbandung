import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, requireRole } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireRole([Role.SUPER_ADMIN, Role.EDITOR]);

    const [totalSubscribers, recentBroadcasts] = await Promise.all([
      prisma.pushSubscription.count({ where: { failedCount: { lt: 5 } } }),
      prisma.pushBroadcast.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return successResponse({ totalSubscribers, recentBroadcasts });
  } catch (err) {
    return errorResponse(err);
  }
}
