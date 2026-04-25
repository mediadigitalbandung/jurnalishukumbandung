import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  clientKey: z.string().nullable().optional(),
  clientSecret: z.string().nullable().optional(),
  defaultBacksongId: z.string().nullable().optional(),
  defaultHashtags: z.array(z.string()).optional(),
  maxDurationSec: z.number().int().min(3).max(180).optional(),
  outputWidth: z.number().int().optional(),
  outputHeight: z.number().int().optional(),
  outputFps: z.number().int().min(24).max(60).optional(),
  autoPublishEnabled: z.boolean().optional(),
  draftModeEnabled: z.boolean().optional(),
  aiCaptionEnabled: z.boolean().optional(),
  aiHashtagEnabled: z.boolean().optional(),
  renderEngine: z.enum(["ffmpeg", "hyperframes"]).optional(),
});

/** GET /api/tiktok/settings */
export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);
    let settings = await prisma.tiktokSettings.findFirst();
    if (!settings) {
      settings = await prisma.tiktokSettings.create({ data: {} });
    }

    // Mask secrets in response, expose length+preview for verification
    const safe = {
      ...settings,
      clientSecret: settings.clientSecret ? "•••••••••" : null,
      clientSecretLength: settings.clientSecret?.length || 0,
      clientSecretPreview: settings.clientSecret ? `${settings.clientSecret.slice(0, 4)}…${settings.clientSecret.slice(-4)}` : null,
      clientKeyValid: !!(settings.clientKey && /^[a-z0-9]{16,20}$/i.test(settings.clientKey)),
      clientSecretValid: !!(settings.clientSecret && settings.clientSecret.length >= 30 && settings.clientSecret.length <= 50),
      accessToken: settings.accessToken ? "•••••••••" : null,
      refreshToken: settings.refreshToken ? "•••••••••" : null,
      hasClientSecret: !!settings.clientSecret,
      hasAccessToken: !!settings.accessToken,
      hasRefreshToken: !!settings.refreshToken,
    };

    return successResponse(safe);
  } catch (error) {
    return errorResponse(error);
  }
}

/** PUT /api/tiktok/settings */
export async function PUT(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const body = await req.json();
    const data = updateSchema.parse(body);

    let settings = await prisma.tiktokSettings.findFirst();
    if (!settings) {
      settings = await prisma.tiktokSettings.create({ data: {} });
    }

    const updated = await prisma.tiktokSettings.update({
      where: { id: settings.id },
      data,
    });

    return successResponse({ message: "Settings tersimpan", settings: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
