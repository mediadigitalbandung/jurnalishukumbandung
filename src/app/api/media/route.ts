import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  successResponse,
  errorResponse,
  requireAuth,
  ApiError,
} from "@/lib/api-utils";

const createMediaSchema = z.object({
  filename: z.string().min(1),
  url: z.string().url(),
  type: z.string().min(1),
  size: z.number().int().min(0),
});

// GET /api/media — list all media, paginated, with search & usedIn
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const uploadedBy = searchParams.get("uploadedBy") || undefined;
    const search = searchParams.get("q")?.trim() || "";

    const where: Record<string, unknown> = {};
    if (uploadedBy) where.uploadedBy = uploadedBy;
    if (search) {
      where.OR = [
        { caption: { contains: search, mode: "insensitive" } },
        { source: { contains: search, mode: "insensitive" } },
        { filename: { contains: search, mode: "insensitive" } },
      ];
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.media.count({ where }),
    ]);

    // Find which articles use each image
    const mediaUrls = media.map((m) => m.url);
    const articles = await prisma.article.findMany({
      where: {
        OR: [
          { featuredImage: { in: mediaUrls } },
          ...mediaUrls.map((url) => ({ content: { contains: url } })),
        ],
      },
      select: { title: true, featuredImage: true, content: true },
    });

    // Map URL -> article titles
    const urlToTitles: Record<string, string[]> = {};
    for (const a of articles) {
      for (const url of mediaUrls) {
        if (a.featuredImage === url || (a.content && a.content.includes(url))) {
          if (!urlToTitles[url]) urlToTitles[url] = [];
          if (!urlToTitles[url].includes(a.title)) urlToTitles[url].push(a.title);
        }
      }
    }

    const enriched = media.map((m) => ({
      ...m,
      usedIn: urlToTitles[m.url] || [],
    }));

    return successResponse({
      media: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/media — create media record
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body = await request.json();
    const data = createMediaSchema.parse(body);

    const media = await prisma.media.create({
      data: {
        filename: data.filename,
        url: data.url,
        type: data.type,
        size: data.size,
        uploadedBy: session.user.id,
        uploaderName: session.user.name,
      },
    });

    return successResponse(media, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(new ApiError(error.errors[0].message, 400));
    }
    return errorResponse(error);
  }
}

// DELETE /api/media — delete media by id (query param)
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      throw new ApiError("ID media diperlukan", 400);
    }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      throw new ApiError("Media tidak ditemukan", 404);
    }

    // Only uploader or admin can delete
    const isAdmin = session.user.role === "SUPER_ADMIN";
    if (media.uploadedBy !== session.user.id && !isAdmin) {
      throw new ApiError("Anda tidak memiliki izin untuk menghapus media ini", 403);
    }

    await prisma.media.delete({ where: { id } });

    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
