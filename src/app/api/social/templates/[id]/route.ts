import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/** GET /api/social/templates/[id] */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const template = await prisma.socialTemplate.findUnique({ where: { id: params.id } });
    if (!template) return errorResponse(new Error("Template not found"));
    return successResponse({ template });
  } catch (error) {
    return errorResponse(error);
  }
}

/** PUT /api/social/templates/[id] */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();

    // Handle isDefault: unset others when this one becomes default
    if (body.isDefault) {
      const tpl = await prisma.socialTemplate.findUnique({ where: { id: params.id } });
      if (tpl) {
        await prisma.socialTemplate.updateMany({
          where: { platform: tpl.platform, isDefault: true, id: { not: params.id } },
          data: { isDefault: false },
        });
      }
    }

    const updated = await prisma.socialTemplate.update({
      where: { id: params.id },
      data: body,
    });
    return successResponse({ template: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

/** DELETE /api/social/templates/[id] */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    await prisma.socialTemplate.delete({ where: { id: params.id } });
    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
