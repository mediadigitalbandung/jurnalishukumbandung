import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  successResponse,
  errorResponse,
  getSession,
  ApiError,
} from "@/lib/api-utils";
import { commentRateLimit } from "@/lib/rate-limit";
import { sanitizeText, sanitizeEmail } from "@/lib/sanitize";

const createCommentSchema = z.object({
  authorName: z.string().min(2, "Nama minimal 2 karakter").max(100),
  authorEmail: z.string().email("Email tidak valid").transform((v) => v.toLowerCase()),
  content: z.string().min(3, "Komentar minimal 3 karakter").max(2000),
  parentId: z.string().optional(),
});

// GET /api/articles/:id/comments — public: approved only, admin/editor: all
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const article = await prisma.article.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!article) {
      throw new ApiError("Artikel tidak ditemukan", 404);
    }

    // Check if user is admin/editor
    const session = await getSession();
    const role = session?.user?.role || "";
    const isEditorOrAdmin = ["SUPER_ADMIN", "EDITOR"].includes(role);

    // Pagination — cegah response gigantic kalau artikel viral punya 10k+ komen.
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    const where = {
      articleId: params.id,
      ...(isEditorOrAdmin ? {} : { isApproved: true }),
    };

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.comment.count({ where }),
    ]);

    return successResponse({
      comments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/articles/:id/comments — public, creates unapproved comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { success: allowed } = commentRateLimit(ip);
    if (!allowed) {
      throw new ApiError("Terlalu banyak komentar. Coba lagi dalam beberapa menit.", 429);
    }

    const article = await prisma.article.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!article) {
      throw new ApiError("Artikel tidak ditemukan", 404);
    }
    if (article.status !== "PUBLISHED") {
      throw new ApiError("Komentar hanya bisa dikirim pada artikel yang sudah dipublikasi", 400);
    }

    const body = await request.json();
    const data = createCommentSchema.parse(body);

    const comment = await prisma.comment.create({
      data: {
        authorName: sanitizeText(data.authorName),
        authorEmail: sanitizeEmail(data.authorEmail),
        content: sanitizeText(data.content),
        parentId: data.parentId || null,
        articleId: params.id,
        isApproved: false,
      },
    });

    return successResponse(comment, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(new ApiError(error.errors[0].message, 400));
    }
    return errorResponse(error);
  }
}
