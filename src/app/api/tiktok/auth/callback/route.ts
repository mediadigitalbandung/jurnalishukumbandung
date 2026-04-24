import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken, fetchCreatorInfo } from "@/lib/tiktok/tiktok-api";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

/** GET /api/tiktok/auth/callback — TikTok redirects here after OAuth approval */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorMsg = searchParams.get("error") || searchParams.get("error_description");

  const settingsPageUrl = `${BASE_URL.replace(/\/$/, "")}/panel/tiktok/settings`;

  if (errorMsg) {
    return NextResponse.redirect(`${settingsPageUrl}?tiktok_error=${encodeURIComponent(errorMsg)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${settingsPageUrl}?tiktok_error=no_code`);
  }

  try {
    const savedState = await prisma.systemSetting.findUnique({
      where: { key: "tiktok_oauth_state" },
    });
    if (!savedState || savedState.value !== state) {
      return NextResponse.redirect(`${settingsPageUrl}?tiktok_error=invalid_state`);
    }

    const settings = await prisma.tiktokSettings.findFirst();
    if (!settings?.clientKey || !settings?.clientSecret) {
      return NextResponse.redirect(`${settingsPageUrl}?tiktok_error=missing_credentials`);
    }

    const redirectUri = `${BASE_URL.replace(/\/$/, "")}/api/tiktok/auth/callback`;
    const tokenRes = await exchangeCodeForToken(
      settings.clientKey,
      settings.clientSecret,
      code,
      redirectUri
    );

    await prisma.tiktokSettings.update({
      where: { id: settings.id },
      data: {
        accessToken: tokenRes.access_token,
        refreshToken: tokenRes.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenRes.expires_in * 1000),
        openId: tokenRes.open_id,
      },
    });

    // Fetch creator username/display_name (non-critical — don't block OAuth if fails)
    try {
      const info = await fetchCreatorInfo();
      const resolvedName = info.username || info.display_name || null;
      if (resolvedName) {
        await prisma.tiktokSettings.update({
          where: { id: settings.id },
          data: { username: resolvedName },
        });
      } else {
        console.warn("[TIKTOK] OAuth success but no username/display_name in user info:", info);
      }
    } catch (e) {
      console.warn("[TIKTOK] fetchCreatorInfo failed after OAuth:", e);
    }

    // Clean up state
    await prisma.systemSetting.delete({ where: { key: "tiktok_oauth_state" } }).catch(() => {});

    return NextResponse.redirect(`${settingsPageUrl}?tiktok_success=1`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(`${settingsPageUrl}?tiktok_error=${encodeURIComponent(msg)}`);
  }
}
