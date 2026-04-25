export const dynamic = "force-dynamic";
export const maxDuration = 90; // beri ruang sebelum Vercel/Next timeout

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

/**
 * Load Test per-artikel — simulasi N visitor concurrent untuk validasi capacity
 * sebelum artikel di-boost via sosmed.
 *
 * Hard limits: concurrency ≤50, totalRequests ≤200, per-request timeout 10s,
 * total timeout 60s. Header X-Load-Test dikirim di setiap request supaya
 * viewCount TIDAK naik (lihat src/app/berita/[slug]/page.tsx).
 */

const startSchema = z.object({
  concurrency: z.number().int().min(1).max(50),
  totalRequests: z.number().int().min(1).max(200),
});

const PER_REQUEST_TIMEOUT = 10_000;
const TOTAL_TIMEOUT = 60_000;
const LOAD_TEST_HEADER_VALUE = "1";

interface RequestResult {
  status: number | null;
  ms: number;
  error?: string;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

/** GET /api/articles/:id/load-test — list 10 test run terakhir */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const runs = await prisma.loadTestRun.findMany({
      where: { articleId: params.id },
      orderBy: { startedAt: "desc" },
      take: 10,
    });
    return successResponse({ runs });
  } catch (error) {
    return errorResponse(error);
  }
}

/** POST /api/articles/:id/load-test — kick off synchronous test, return metrics */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json().catch(() => ({}));
    const { concurrency, totalRequests } = startSchema.parse(body);

    const article = await prisma.article.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, title: true, status: true },
    });
    if (!article) throw new ApiError("Artikel tidak ditemukan", 404);
    if (article.status !== "PUBLISHED") {
      throw new ApiError("Hanya artikel PUBLISHED yang bisa di-test", 400);
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
    const targetUrl = `${baseUrl.replace(/\/$/, "")}/berita/${article.slug}`;

    // Create run record
    const run = await prisma.loadTestRun.create({
      data: {
        articleId: article.id,
        articleSlug: article.slug,
        articleTitle: article.title,
        initiatedBy: session.user.id,
        initiatedByName: session.user.name || session.user.email,
        concurrency,
        totalRequests,
        status: "running",
      },
    });

    const startTime = Date.now();
    const results: RequestResult[] = [];

    /** Run a single request with timeout */
    const runOne = async (): Promise<RequestResult> => {
      const t0 = Date.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), PER_REQUEST_TIMEOUT);
      try {
        // Add cache-busting query so Cloudflare doesn't serve cached response
        const url = `${targetUrl}?_lt=${run.id}-${results.length}`;
        const res = await fetch(url, {
          signal: ctrl.signal,
          headers: {
            "X-Load-Test": LOAD_TEST_HEADER_VALUE,
            "User-Agent": `JHB-LoadTest/1.0 (run=${run.id})`,
            // Skip cache aggressively
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          redirect: "manual",
        });
        return { status: res.status, ms: Date.now() - t0 };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "unknown";
        const isTimeout =
          msg.includes("aborted") || msg.toLowerCase().includes("timeout");
        return {
          status: null,
          ms: Date.now() - t0,
          error: isTimeout ? "timeout" : msg.slice(0, 200),
        };
      } finally {
        clearTimeout(timer);
      }
    };

    /** Worker pool: maintain `concurrency` in-flight until totalRequests hit */
    let issued = 0;
    let aborted = false;
    const totalDeadline = startTime + TOTAL_TIMEOUT;

    const worker = async () => {
      while (!aborted && issued < totalRequests) {
        if (Date.now() >= totalDeadline) {
          aborted = true;
          break;
        }
        issued++;
        const r = await runOne();
        results.push(r);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, totalRequests) }, () => worker())
    );

    const totalDurationMs = Date.now() - startTime;

    // Aggregate
    const successResults = results.filter(
      (r) => r.status !== null && r.status >= 200 && r.status < 400
    );
    const errorResults = results.filter(
      (r) => r.status === null || r.status >= 400
    );
    const successTimes = successResults.map((r) => r.ms).sort((a, b) => a - b);

    const statusCodeCount: Record<string, number> = {};
    for (const r of results) {
      const key = r.status === null ? "ERR" : String(r.status);
      statusCodeCount[key] = (statusCodeCount[key] || 0) + 1;
    }

    // Group error messages
    const errorByMsg: Record<string, number> = {};
    for (const r of results) {
      if (r.error) {
        errorByMsg[r.error] = (errorByMsg[r.error] || 0) + 1;
      } else if (r.status !== null && r.status >= 400) {
        const key = `HTTP ${r.status}`;
        errorByMsg[key] = (errorByMsg[key] || 0) + 1;
      }
    }
    const errorMessages = Object.entries(errorByMsg).map(([message, count]) => ({
      count,
      message,
    }));

    const avgMs =
      successTimes.length > 0
        ? successTimes.reduce((a, b) => a + b, 0) / successTimes.length
        : null;

    // Update run with metrics
    const completed = await prisma.loadTestRun.update({
      where: { id: run.id },
      data: {
        status: aborted ? "failed" : "completed",
        errorReason: aborted ? "Timeout total >60s" : null,
        successCount: successResults.length,
        errorCount: errorResults.length,
        avgMs,
        p50Ms: successTimes.length > 0 ? percentile(successTimes, 0.5) : null,
        p95Ms: successTimes.length > 0 ? percentile(successTimes, 0.95) : null,
        p99Ms: successTimes.length > 0 ? percentile(successTimes, 0.99) : null,
        maxMs: successTimes.length > 0 ? successTimes[successTimes.length - 1] : null,
        minMs: successTimes.length > 0 ? successTimes[0] : null,
        statusCodes: statusCodeCount,
        errorMessages,
        totalDurationMs,
        completedAt: new Date(),
      },
    });

    return successResponse(completed);
  } catch (error) {
    return errorResponse(error);
  }
}
