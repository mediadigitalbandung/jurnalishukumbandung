import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const UnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = UnsubscribeSchema.parse(body);

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });

    return successResponse({ unsubscribed: true });
  } catch (err) {
    return errorResponse(err);
  }
}
