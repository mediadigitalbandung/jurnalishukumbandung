export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
  ApiError,
  logAudit,
} from "@/lib/api-utils";
import { LIVE_CONFIG } from "@/lib/live";

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
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
  notes: z.string().max(2000).optional().nullable(),
});

async function findByIdOrSlug(idOrSlug: string) {
  // Coba ID dulu (cuid format), kalau ga match cari by slug
  return await prisma.liveSession.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      broadcaster: { select: { id: true, name: true, avatar: true, role: true } },
      category: { select: { id: true, name: true, slug: true } },
    },
  });
}

// GET /api/live/[id] — single. Public visible if isPublic & status != FAILED.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const item = await findByIdOrSlug(params.id);
    if (!item) throw new ApiError("Live session tidak ditemukan", 404);

    // Auth check untuk private
    if (!item.isPublic) {
      try {
        const session = await requireAuth();
        const role = session.user.role;
        const isOwner = session.user.id === item.broadcasterId;
        const isAdmin = ["SUPER_ADMIN", "EDITOR"].includes(role);
        if (!isOwner && !isAdmin) {
          throw new ApiError("Live session ini private", 403);
        }
      } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError("Live session ini private — login dulu", 401);
      }
    }

    return successResponse(item);
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/live/[id] — update (broadcaster atau admin)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const item = await findByIdOrSlug(params.id);
    if (!item) throw new ApiError("Live session tidak ditemukan", 404);

    const isOwner = session.user.id === item.broadcasterId;
    const isAdmin = ["SUPER_ADMIN", "EDITOR"].includes(session.user.role);
    if (!isOwner && !isAdmin) {
      throw new ApiError("Tidak punya akses untuk edit live session ini", 403);
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.liveSession.update({
      where: { id: item.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
        ...(data.scheduledAt !== undefined && {
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.relatedArticleId !== undefined && { relatedArticleId: data.relatedArticleId }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.allowChat !== undefined && { allowChat: data.allowChat }),
        ...(data.allowDownload !== undefined && { allowDownload: data.allowDownload }),
        ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
        ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    await logAudit(
      session.user.id,
      "UPDATE",
      "live_session",
      item.id,
      `Update live session: ${item.title}`
    );

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/live/[id] — delete (broadcaster atau admin) + hapus recording file
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    const item = await findByIdOrSlug(params.id);
    if (!item) throw new ApiError("Live session tidak ditemukan", 404);

    const isOwner = session.user.id === item.broadcasterId;
    const isAdmin = ["SUPER_ADMIN", "EDITOR"].includes(session.user.role);
    if (!isOwner && !isAdmin) {
      throw new ApiError("Tidak punya akses", 403);
    }

    // Tidak boleh delete kalau LIVE
    if (item.status === "LIVE") {
      throw new ApiError("Stop dulu live-nya sebelum dihapus", 400);
    }

    // Hapus recording file kalau ada
    if (item.recordingUrl) {
      try {
        // Extract filename dari URL: /recordings/live/<key>_<ts>.mp4
        const urlPath = new URL(item.recordingUrl, "https://x").pathname;
        const filename = urlPath.replace(/^\/recordings\//, "");
        const fullPath = path.join(LIVE_CONFIG.recordingDir, filename);
        // Safety: pastikan path masih di dalam recording dir
        if (fullPath.startsWith(LIVE_CONFIG.recordingDir)) {
          await fs.unlink(fullPath).catch(() => null);
        }
      } catch {
        // ignore — file mungkin sudah ga ada
      }
    }

    await prisma.liveSession.delete({ where: { id: item.id } });

    await logAudit(
      session.user.id,
      "DELETE",
      "live_session",
      item.id,
      `Hapus live session: ${item.title}`
    );

    return successResponse({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
