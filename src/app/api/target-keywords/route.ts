import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { successResponse, errorResponse, requireRole, ApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

// GET: list all keywords (active first)
export async function GET() {
  try {
    const keywords = await prisma.targetKeyword.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return successResponse({ keywords });
  } catch (err) {
    return errorResponse(err);
  }
}

// POST: bulk create keywords (from research or manual)
// Body: { keywords: [{ keyword: string, notes?: string }], source?: "manual"|"ai_research" }
export async function POST(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await request.json();
    const { keywords, source = "manual" } = body as {
      keywords: { keyword: string; notes?: string }[];
      source?: string;
    };

    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new ApiError("keywords harus berupa array dan tidak kosong", 400);
    }

    let added = 0;
    const skipped: string[] = [];

    for (const item of keywords) {
      const kw = item.keyword?.trim().toLowerCase();
      if (!kw || kw.length < 3 || kw.length > 100) continue;

      try {
        await prisma.targetKeyword.create({
          data: {
            keyword: kw,
            source,
            notes: item.notes?.slice(0, 500) || null,
          },
        });
        added++;
      } catch {
        skipped.push(kw);
      }
    }

    return successResponse({ added, skipped }, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

// DELETE: remove keyword by id — ?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new ApiError("id wajib diisi", 400);

    await prisma.targetKeyword.delete({ where: { id } });
    return successResponse({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

// PATCH: toggle active status — body: { id, isActive }
export async function PATCH(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await request.json();
    const { id, isActive } = body as { id: string; isActive: boolean };
    if (!id) throw new ApiError("id wajib diisi", 400);

    const updated = await prisma.targetKeyword.update({
      where: { id },
      data: { isActive },
    });
    return successResponse({ keyword: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
