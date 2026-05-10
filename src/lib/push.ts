import webpush, { PushSubscription as WebPushSub, SendResult } from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:redaksi@jurnalishukumbandung.com";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    throw new Error("VAPID keys not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  imageUrl?: string;
  tag?: string;          // dedupe key
  requireInteraction?: boolean;
}

export interface BroadcastResult {
  totalSent: number;
  totalFailed: number;
  totalGone: number;
}

/**
 * Send a single push notification. Returns the web-push SendResult, or null if subscription is gone (410).
 * Caller should handle deletion of gone subscriptions.
 */
export async function sendOne(
  subscription: WebPushSub,
  payload: PushPayload,
): Promise<{ ok: boolean; statusCode?: number; gone?: boolean; error?: string }> {
  ensureConfigured();
  try {
    const result: SendResult = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // 24h TTL — drop if undeliverable in a day
    );
    return { ok: true, statusCode: result.statusCode };
  } catch (err: unknown) {
    const e = err as { statusCode?: number; body?: string; message?: string };
    const status = e?.statusCode;
    // 404 / 410 → subscription gone, should be deleted
    if (status === 404 || status === 410) {
      return { ok: false, statusCode: status, gone: true, error: e.body || e.message };
    }
    return { ok: false, statusCode: status, error: e.body || e.message || "unknown" };
  }
}

/**
 * Broadcast to all subscriptions (optionally filtered by topic).
 * Auto-deletes subscriptions that return 410/404.
 * Records audit row in PushBroadcast.
 */
export async function broadcast(
  payload: PushPayload,
  opts: { topic?: string; sentBy: string } = { sentBy: "system" },
): Promise<BroadcastResult & { broadcastId: string }> {
  ensureConfigured();

  const where = opts.topic
    ? { topics: { has: opts.topic }, failedCount: { lt: 5 } }
    : { failedCount: { lt: 5 } };

  const subs = await prisma.pushSubscription.findMany({ where });

  // Send in parallel batches of 100 to avoid hammering push services
  const BATCH = 100;
  let totalSent = 0;
  let totalFailed = 0;
  let totalGone = 0;
  const goneIds: string[] = [];
  const failedIds: string[] = [];

  for (let i = 0; i < subs.length; i += BATCH) {
    const slice = subs.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map((s) =>
        sendOne(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        ).then((r) => ({ id: s.id, ...r })),
      ),
    );
    for (const r of results) {
      if (r.ok) {
        totalSent++;
      } else if (r.gone) {
        totalGone++;
        goneIds.push(r.id);
      } else {
        totalFailed++;
        failedIds.push(r.id);
      }
    }
  }

  // Cleanup: delete gone, increment failedCount on transient failures
  if (goneIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: goneIds } } });
  }
  if (failedIds.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: failedIds } },
      data: { failedCount: { increment: 1 } },
    });
  }
  // Reset failedCount + bump lastSeenAt for successful sends
  if (totalSent > 0) {
    await prisma.pushSubscription.updateMany({
      where: {
        id: { in: subs.filter((s, i) => !goneIds.includes(s.id) && !failedIds.includes(s.id)).map((s) => s.id) },
      },
      data: { failedCount: 0, lastSeenAt: new Date() },
    });
  }

  const log = await prisma.pushBroadcast.create({
    data: {
      title: payload.title,
      body: payload.body,
      url: payload.url,
      imageUrl: payload.imageUrl,
      topic: opts.topic,
      sentBy: opts.sentBy,
      totalSent,
      totalFailed,
      totalGone,
    },
  });

  return { totalSent, totalFailed, totalGone, broadcastId: log.id };
}
