import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse, getSession } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  topics: z.array(z.string()).optional().default([]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SubscribeSchema.parse(body);
    const session = await getSession();

    const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

    const sub = await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.endpoint },
      create: {
        endpoint: parsed.endpoint,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        topics: parsed.topics,
        userAgent,
        userId: session?.user?.id || null,
      },
      update: {
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        topics: parsed.topics,
        userAgent,
        userId: session?.user?.id || null,
        lastSeenAt: new Date(),
        failedCount: 0,
        lastError: null,
      },
    });

    return successResponse({ id: sub.id });
  } catch (err) {
    return errorResponse(err);
  }
}
