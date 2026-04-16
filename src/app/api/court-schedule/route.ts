import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireAuth, requireRole, ApiError } from "@/lib/api-utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(3).max(255),
  court: z.string().min(2),
  courtType: z.enum(["umum", "tipikor", "militer", "agama", "tun"]).default("umum"),
  caseNumber: z.string().optional(),
  defendant: z.string().optional(),
  judge: z.string().optional(),
  agenda: z.string().optional(),
  date: z.string().datetime(),
  time: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["scheduled", "live", "done", "postponed"]).default("scheduled"),
  isHighlight: z.boolean().default(false),
  articleSlug: z.string().optional(),
});

// GET — public list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const court = searchParams.get("court");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (court) where.court = { contains: court, mode: "insensitive" };
    if (status) where.status = status;
    if (from) where.date = { gte: new Date(from) };
    else where.date = { gte: new Date(new Date().setHours(0, 0, 0, 0)) }; // default: today onwards

    const schedules = await prisma.courtSchedule.findMany({
      where,
      orderBy: [{ date: "asc" }, { isHighlight: "desc" }],
      take: limit,
    });

    return successResponse(schedules);
  } catch (error) {
    return errorResponse(error);
  }
}

// POST — admin create
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await request.json();
    const data = createSchema.parse(body);

    const schedule = await prisma.courtSchedule.create({
      data: {
        ...data,
        date: new Date(data.date),
        createdBy: session.user.id,
      },
    });

    return successResponse(schedule, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
