import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { rejectDraft } from "@/lib/social/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    await rejectDraft(params.id);
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
