import { NextRequest } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { errorResponse, successResponse, requireRole } from "@/lib/api-utils";
import { broadcast } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // up to 5min for large broadcasts

const SendSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  topic: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole([Role.SUPER_ADMIN, Role.EDITOR]);
    const body = await req.json();
    const payload = SendSchema.parse(body);

    const result = await broadcast(payload, {
      sentBy: session.user.id,
      topic: payload.topic,
    });

    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
