import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { buildAuthUrl } from "@/lib/tiktok/tiktok-api";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

/** GET /api/tiktok/auth — initiate OAuth flow, return auth URL
 *  Query: ?mode=minimal → only user.info.basic scope (for debug/test)
 */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const settings = await prisma.tiktokSettings.findFirst();
    if (!settings?.clientKey || !settings?.clientSecret) {
      throw new ApiError("Set clientKey & clientSecret dulu di Settings", 400);
    }

    const mode = req.nextUrl.searchParams.get("mode");
    const scope = mode === "minimal" ? "user.info.basic" : undefined;

    const state = randomBytes(16).toString("hex");
    // Store state di SystemSetting sementara untuk verify callback
    await prisma.systemSetting.upsert({
      where: { key: "tiktok_oauth_state" },
      update: { value: state },
      create: { key: "tiktok_oauth_state", value: state },
    });

    const redirectUri = `${BASE_URL.replace(/\/$/, "")}/api/tiktok/auth/callback`;
    const authUrl = buildAuthUrl(settings.clientKey, redirectUri, state, scope);

    return successResponse({ authUrl });
  } catch (error) {
    return errorResponse(error);
  }
}
