import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { takedownPost } from "@/lib/social/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const result = await takedownPost(params.id);
    if (!result.success) throw new Error(result.error || "Takedown failed");
    return successResponse({ takedown: true });
  } catch (error) {
    return errorResponse(error);
  }
}
