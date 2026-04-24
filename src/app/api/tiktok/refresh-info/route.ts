import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { fetchCreatorInfo } from "@/lib/tiktok/tiktok-api";

export const dynamic = "force-dynamic";

/** POST /api/tiktok/refresh-info — re-fetch username & avatar from TikTok API */
export async function POST(_req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const settings = await prisma.tiktokSettings.findFirst();
    if (!settings?.accessToken) {
      throw new ApiError("TikTok belum terhubung", 400);
    }
    const info = await fetchCreatorInfo();
    const resolvedName = info.username || info.display_name || null;
    if (!resolvedName) {
      return successResponse({
        message: "Fetch berhasil tapi username/display_name kosong",
        info,
      });
    }
    await prisma.tiktokSettings.update({
      where: { id: settings.id },
      data: { username: resolvedName },
    });
    return successResponse({ username: resolvedName, info });
  } catch (error) {
    return errorResponse(error);
  }
}
