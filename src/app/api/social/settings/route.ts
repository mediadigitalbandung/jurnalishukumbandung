import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/** GET — load all settings (global + IG + FB) */
export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const [global, ig, fb] = await Promise.all([
      prisma.socialMediaSettings.findFirst(),
      prisma.instagramSettings.findFirst(),
      prisma.facebookSettings.findFirst(),
    ]);

    // Mask tokens in response
    const maskedGlobal = global
      ? {
          ...global,
          metaAccessToken: global.metaAccessToken ? "***configured***" : null,
          metaRefreshToken: global.metaRefreshToken ? "***configured***" : null,
        }
      : null;

    return successResponse({
      global: maskedGlobal,
      instagram: ig,
      facebook: fb,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** PUT — update settings (body: { scope: "global"|"instagram"|"facebook", data: {...} }) */
export async function PUT(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();
    const { scope, data } = body as { scope: "global" | "instagram" | "facebook"; data: Record<string, unknown> };

    if (scope === "global") {
      // Don't overwrite tokens with masked values
      if (data.metaAccessToken === "***configured***") delete data.metaAccessToken;
      if (data.metaRefreshToken === "***configured***") delete data.metaRefreshToken;

      const existing = await prisma.socialMediaSettings.findFirst();
      const updated = existing
        ? await prisma.socialMediaSettings.update({ where: { id: existing.id }, data })
        : await prisma.socialMediaSettings.create({ data });
      return successResponse({ global: { ...updated, metaAccessToken: updated.metaAccessToken ? "***configured***" : null } });
    }

    if (scope === "instagram") {
      const existing = await prisma.instagramSettings.findFirst();
      const updated = existing
        ? await prisma.instagramSettings.update({ where: { id: existing.id }, data })
        : await prisma.instagramSettings.create({ data });
      return successResponse({ instagram: updated });
    }

    if (scope === "facebook") {
      const existing = await prisma.facebookSettings.findFirst();
      const updated = existing
        ? await prisma.facebookSettings.update({ where: { id: existing.id }, data })
        : await prisma.facebookSettings.create({ data });
      return successResponse({ facebook: updated });
    }

    return errorResponse(new Error("Invalid scope"));
  } catch (error) {
    return errorResponse(error);
  }
}
