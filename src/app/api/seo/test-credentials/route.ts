export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { testGoogleCredentials } from "@/lib/seo-utils";

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const body = await req.json();
    const { credentialsJson } = body;

    if (!credentialsJson || typeof credentialsJson !== "string") {
      return errorResponse(new Error("credentialsJson wajib diisi"));
    }

    const result = await testGoogleCredentials(credentialsJson);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
