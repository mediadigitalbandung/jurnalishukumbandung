import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * Manually mark a post as deleted in DB — does NOT call platform API.
 * Useful for Instagram (no delete API) or after manual deletion on platform.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const updated = await prisma.socialPost.update({
      where: { id: params.id },
      data: { status: "deleted" },
    });
    return successResponse({ post: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
