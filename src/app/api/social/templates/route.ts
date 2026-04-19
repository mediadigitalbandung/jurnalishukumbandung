import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/** GET /api/social/templates — list all templates */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform");

    const where = platform ? { platform } : undefined;
    const templates = await prisma.socialTemplate.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });

    return successResponse({ templates });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/social/templates — create template */
export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();

    const {
      name,
      platform,
      aspectRatio,
      templateImageUrl,
      photoSlotX = 0,
      photoSlotY = 0,
      photoSlotWidth = 1,
      photoSlotHeight = 1,
      textLayers = null,
      isActive = true,
      isDefault = false,
    } = body;

    if (!name || !platform || !aspectRatio || !templateImageUrl) {
      return errorResponse(new Error("Missing required fields: name, platform, aspectRatio, templateImageUrl"));
    }

    // If setting as default, unset other defaults for this platform
    if (isDefault) {
      await prisma.socialTemplate.updateMany({
        where: { platform, isDefault: true },
        data: { isDefault: false },
      });
    }

    const created = await prisma.socialTemplate.create({
      data: {
        name,
        platform,
        aspectRatio,
        templateImageUrl,
        photoSlotX,
        photoSlotY,
        photoSlotWidth,
        photoSlotHeight,
        textLayers,
        isActive,
        isDefault,
      },
    });

    return successResponse({ template: created });
  } catch (error) {
    return errorResponse(error);
  }
}
