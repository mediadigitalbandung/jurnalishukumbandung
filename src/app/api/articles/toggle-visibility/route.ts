import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

// POST /api/articles/toggle-visibility — hide or unhide article
export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const body = await req.json();
    const { articleId, action } = body as { articleId: string; action: "hide" | "unhide" };

    if (!articleId || !action) {
      throw new ApiError("articleId dan action (hide/unhide) diperlukan", 400);
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true, title: true },
    });

    if (!article) throw new ApiError("Artikel tidak ditemukan", 404);

    if (action === "hide") {
      // Hide: set status to ARCHIVED
      await prisma.article.update({
        where: { id: articleId },
        data: { status: "ARCHIVED" },
      });
      revalidatePath("/");
      revalidatePath("/berita");
      return successResponse({ message: `Artikel "${article.title}" disembunyikan`, status: "ARCHIVED" });
    } else {
      // Unhide: restore to PUBLISHED
      await prisma.article.update({
        where: { id: articleId },
        data: { status: "PUBLISHED" },
      });
      revalidatePath("/");
      revalidatePath("/berita");
      return successResponse({ message: `Artikel "${article.title}" ditampilkan kembali`, status: "PUBLISHED" });
    }
  } catch (error) {
    return errorResponse(error);
  }
}
