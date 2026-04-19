import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-utils";
import { renderTemplate, type TemplateConfig, type ArticleData } from "@/lib/social/template-renderer";

export const dynamic = "force-dynamic";

/**
 * POST /api/social/templates/preview
 * Body: { template: TemplateConfig, articleId?: string }
 * Returns: binary image/jpeg
 *
 * Renders a preview using either:
 *   - The given articleId (load from DB), or
 *   - The most recent published article with a featured image
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await req.json();
    const { template, articleId } = body as { template: TemplateConfig; articleId?: string };

    if (!template || !template.templateImageUrl || !template.aspectRatio) {
      return NextResponse.json(
        { success: false, error: "Invalid template config" },
        { status: 400 }
      );
    }

    let article;
    if (articleId) {
      article = await prisma.article.findUnique({
        where: { id: articleId },
        select: {
          title: true,
          featuredImage: true,
          publishedAt: true,
          category: { select: { name: true } },
          author: { select: { name: true } },
        },
      });
    } else {
      article = await prisma.article.findFirst({
        where: { status: "PUBLISHED", featuredImage: { not: null } },
        orderBy: { publishedAt: "desc" },
        select: {
          title: true,
          featuredImage: true,
          publishedAt: true,
          category: { select: { name: true } },
          author: { select: { name: true } },
        },
      });
    }

    if (!article || !article.featuredImage) {
      return NextResponse.json(
        { success: false, error: "No article with featured image available for preview" },
        { status: 404 }
      );
    }

    const buffer = await renderTemplate(template, article as ArticleData);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Render failed";
    console.error("[TEMPLATE PREVIEW]", error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
