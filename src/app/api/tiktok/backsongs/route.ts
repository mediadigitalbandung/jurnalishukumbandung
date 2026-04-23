import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().min(1),
  durationSec: z.number().min(0.1),
  mood: z.enum(["serius", "dramatis", "santai", "urgent", "netral"]).nullable().optional(),
  license: z.string().max(500).nullable().optional(),
});

/** GET /api/tiktok/backsongs */
export async function GET() {
  try {
    await requireAuth();
    const backsongs = await prisma.tiktokBacksong.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(backsongs);
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/tiktok/backsongs */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = createSchema.parse(body);

    const backsong = await prisma.tiktokBacksong.create({
      data: {
        name: data.name,
        url: data.url,
        durationSec: data.durationSec,
        mood: data.mood || null,
        license: data.license || null,
        uploadedBy: session.user.id,
      },
    });
    return successResponse(backsong, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
