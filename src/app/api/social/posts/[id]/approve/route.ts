import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { approveDraft } from "@/lib/social/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const result = await approveDraft(params.id);
    return successResponse({ result });
  } catch (error) {
    return errorResponse(error);
  }
}
