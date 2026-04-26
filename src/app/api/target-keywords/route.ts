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

// POST: create keyword(s). Accepts BOTH formats:
//   - Single:  { keyword: string, notes?: string, source?: string }
//   - Bulk:    { keywords: [{ keyword: string, notes?: string }], source?: string }
// Returns created keyword(s) with full record (id, etc) for follow-up updates.
export async function POST(request: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const body = await request.json();

    // Normalize input: support both single + bulk formats
    type KwInput = { keyword: string; notes?: string };
    let inputs: KwInput[] = [];
    const source = (body as { source?: string }).source || "manual";

    if (Array.isArray((body as { keywords?: KwInput[] }).keywords)) {
      inputs = (body as { keywords: KwInput[] }).keywords;
    } else if (typeof (body as { keyword?: string }).keyword === "string") {
      inputs = [{
        keyword: (body as { keyword: string }).keyword,
        notes: (body as { notes?: string }).notes,
      }];
    } else {
      throw new ApiError("Body harus { keyword: string } atau { keywords: [...] }", 400);
    }

    if (inputs.length === 0) {
      throw new ApiError("keyword tidak boleh kosong", 400);
    }

    const created: Array<{ id: string; keyword: string }> = [];
    const skipped: string[] = [];

    for (const item of inputs) {
      const kw = item.keyword?.trim().toLowerCase();
      if (!kw || kw.length < 3 || kw.length > 100) {
        skipped.push(item.keyword || "(empty)");
        continue;
      }

      try {
        const record = await prisma.targetKeyword.create({
          data: {
            keyword: kw,
            source,
            notes: item.notes?.slice(0, 500) || null,
          },
          select: { id: true, keyword: true },
        });
        created.push(record);
      } catch {
        skipped.push(kw);
      }
    }

    // For single-keyword mode, also return `data: { id, keyword }` shape that frontend expects.
    const responseData: {
      added: number;
      skipped: string[];
      created: typeof created;
      id?: string;
      keyword?: string;
    } = {
      added: created.length,
      skipped,
      created,
    };
    if (created.length === 1) {
      responseData.id = created[0].id;
      responseData.keyword = created[0].keyword;
    }

    return successResponse(responseData, 201);
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
