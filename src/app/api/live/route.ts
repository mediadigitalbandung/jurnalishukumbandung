export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
  ApiError,
  logAudit,
} from "@/lib/api-utils";
import { generateStreamKey, slugifyLiveTitle } from "@/lib/live";

const createSchema = z.object({
  title: z.string().min(3, "Judul minimal 3 karakter").max(200),
  description: z.string().max(2000).optional().nullable(),
  thumbnail: z.string().url().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  relatedArticleId: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  allowChat: z.boolean().optional(),
  allowDownload: z.boolean().optional(),
  seoTitle: z.string().max(150).optional().nullable(),
  seoDescription: z.string().max(300).optional().nullable(),
});

// GET /api/live — list. Public sees PUBLISHED public sessions; auth users see all (filtered by role).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // optional filter
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const includePrivate = searchParams.get("includePrivate") === "true";

    const where: Record<string, unknown> = {};

    // Auth check — non-auth hanya boleh lihat public
    let isAuth = false;
    let userId = "";
    let userRole = "";
    try {
      const session = await requireAuth();
      isAuth = true;
      userId = session.user.id;
      userRole = session.user.role;
    } catch {
      isAuth = false;
    }

    if (!isAuth || !includePrivate) {
      where.isPublic = true;
    }

    if (status) {
      const allowed = ["SCHEDULED", "LIVE", "ENDED", "ARCHIVED", "FAILED"];
      if (allowed.includes(status)) where.status = status;
    } else if (!isAuth) {
      // Public default: tampilkan LIVE + ARCHIVED + SCHEDULED. Sembunyikan ENDED tanpa recording.
      where.status = { in: ["LIVE", "ARCHIVED", "SCHEDULED"] };
    }

    // Journalist hanya boleh lihat semua public + miliknya sendiri
    if (isAuth && userRole === "JOURNALIST" && includePrivate) {
      delete where.isPublic;
      where.OR = [{ isPublic: true }, { broadcasterId: userId }];
    }

    const items = await prisma.liveSession.findMany({
      where,
      orderBy: [{ status: "asc" }, { startedAt: "desc" }, { scheduledAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        broadcaster: { select: { id: true, name: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
      },
    });

    return successResponse({
      items,
      stats: {
        total: items.length,
        live: items.filter((i) => i.status === "LIVE").length,
        scheduled: items.filter((i) => i.status === "SCHEDULED").length,
        archived: items.filter((i) => i.status === "ARCHIVED").length,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/live — create new session (any logged-in journalist+)
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const role = session.user.role;
    const allowed = ["SUPER_ADMIN", "EDITOR", "JOURNALIST"];
    if (!allowed.includes(role)) {
      throw new ApiError("Tidak punya akses untuk membuat live session", 403);
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    // Generate unique slug
    let slug = slugifyLiveTitle(data.title);
    if (!slug) slug = "live";
    const existing = await prisma.liveSession.findUnique({ where: { slug } });
    if (existing) slug = slugifyLiveTitle(data.title, Date.now().toString(36));

    // Generate unique stream key (24 hex chars)
    let streamKey = generateStreamKey();
    // Loop max 5x to avoid astronomically rare collision
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.liveSession.findUnique({ where: { streamKey } });
      if (!exists) break;
      streamKey = generateStreamKey();
    }

    const created = await prisma.liveSession.create({
      data: {
        title: data.title,
        slug,
        streamKey,
        description: data.description || null,
        thumbnail: data.thumbnail || null,
        status: "SCHEDULED",
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        broadcasterId: session.user.id,
        categoryId: data.categoryId || null,
        relatedArticleId: data.relatedArticleId || null,
        isPublic: data.isPublic !== false,
        allowChat: data.allowChat !== false,
        allowDownload: data.allowDownload === true,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
      },
    });

    await logAudit(
      session.user.id,
      "CREATE",
      "live_session",
      created.id,
      `Buat live session: ${created.title} [${created.slug}]`
    );

    return successResponse(created, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
