export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  id: z.string().min(1),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  targetPosition: z.number().int().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export async function PUT(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.targetKeyword.update({
      where: { id: data.id },
      data: {
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.targetPosition !== undefined && { targetPosition: data.targetPosition }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
