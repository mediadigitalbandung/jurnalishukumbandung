export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

// GET: list sorotan untuk satu target keyword
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const target = await prisma.targetKeyword.findUnique({ where: { id: params.id } });
    if (!target) return errorResponse(new Error("Target keyword not found"));

    const sorotanList = await prisma.sorotan.findMany({
      where: {
        OR: [
          { targetKeywordId: params.id },
          { angle: "keyword-landing", targetKeyword: { equals: target.keyword, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        seoTitle: true,
        seoDescription: true,
        relatedArticleIds: true,
        indexStatus: true,
        lastIndexedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse({
      keyword: target.keyword,
      total: sorotanList.length,
      sorotanList: sorotanList.map((s) => ({
        ...s,
        url: `${BASE_URL}/sorotan/${s.slug}`,
        relatedCount: s.relatedArticleIds.length,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE: delete sorotan by ID
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const { searchParams } = new URL(req.url);
    const sorotanId = searchParams.get("sorotanId");
    if (!sorotanId) return errorResponse(new Error("sorotanId query param required"));

    // Verify sorotan belongs to keyword (security)
    const sorotan = await prisma.sorotan.findUnique({
      where: { id: sorotanId },
      select: { targetKeywordId: true },
    });
    if (!sorotan) return errorResponse(new Error("Sorotan not found"));
    if (sorotan.targetKeywordId !== params.id) {
      return errorResponse(new Error("Sorotan does not belong to this keyword"));
    }

    await prisma.sorotan.delete({ where: { id: sorotanId } });
    return successResponse({ deleted: sorotanId });
  } catch (error) {
    return errorResponse(error);
  }
}
