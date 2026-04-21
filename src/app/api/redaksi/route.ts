export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { successResponse, errorResponse, requireRole, logAudit } from "@/lib/api-utils";

// GET /api/redaksi — public
export async function GET() {
  try {
    const members = await prisma.redaksiMember.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    return successResponse(members);
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  position: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  desc: z.string().max(300).optional().nullable(),
  photo: z.string().url().optional().nullable(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

// POST /api/redaksi — admin only
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await request.json();
    const data = createSchema.parse(body);

    const member = await prisma.redaksiMember.create({
      data: {
        position: data.position,
        name: data.name,
        desc: data.desc || null,
        photo: data.photo || null,
        order: data.order ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    await logAudit(session.user.id, "CREATE", "redaksi", member.id, `Menambah redaksi: ${data.position} - ${data.name}`);
    return successResponse(member, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
