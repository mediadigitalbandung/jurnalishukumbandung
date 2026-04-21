export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireRole } from "@/lib/api-utils";

// GET /api/audit-logs
export async function GET(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const action = searchParams.get("action");

    const where = action ? { action } : {};

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return successResponse({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
