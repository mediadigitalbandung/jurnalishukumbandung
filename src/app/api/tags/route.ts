import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { successResponse, errorResponse, requireRole, logAudit } from "@/lib/api-utils";
import { slugify } from "@/lib/utils";

// GET /api/tags?page=1&limit=30&q=keyword
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "30"));
    const q = searchParams.get("q")?.trim() || "";

    const where = q ? { name: { contains: q, mode: "insensitive" as const } } : {};

    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy: { name: "asc" },
        include: { _count: { select: { articles: true } } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tag.count({ where }),
    ]);

    return successResponse({
      tags,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

const createTagSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(60).optional(),
});

// POST /api/tags
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await request.json();
    const data = createTagSchema.parse(body);

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        slug: data.slug || slugify(data.name),
      },
    });

    await logAudit(session.user.id, "CREATE", "tag", tag.id, `Membuat tag: ${tag.name}`);

    return successResponse(tag, 201);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/tags
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse(new Error("ID tag diperlukan"));
    }

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { articles: true } } },
    });

    if (!tag) {
      return errorResponse(new Error("Tag tidak ditemukan"));
    }

    await prisma.tag.delete({ where: { id } });

    await logAudit(session.user.id, "DELETE", "tag", id, `Menghapus tag: ${tag.name}`);

    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
