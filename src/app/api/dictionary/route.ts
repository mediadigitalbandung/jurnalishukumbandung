export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

/** GET /api/dictionary?search=&category= — list entries */
export async function GET(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR", "JOURNALIST", "CONTRIBUTOR"]);
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const category = searchParams.get("category") || undefined;

    const where: Record<string, unknown> = {};
    if (search) where.word = { contains: search };
    if (category) where.category = category;

    const entries = await prisma.dictionaryEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return successResponse({ entries, total: entries.length });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  word: z.string().min(2).max(80).trim(),
  originalWord: z.string().max(80).optional(),
  category: z.enum(["legal", "person", "place", "other"]).optional(),
  notes: z.string().max(500).optional().nullable(),
});

/** POST /api/dictionary — add word */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EDITOR", "JOURNALIST", "CONTRIBUTOR"]);
    const body = await req.json();
    const data = createSchema.parse(body);

    const normalized = data.word.trim().toLowerCase();
    if (!/^[a-zA-ZÀ-ſ\s'.-]+$/.test(data.word)) {
      throw new ApiError("Kata hanya boleh huruf, spasi, tanda petik, titik, atau tanda hubung", 400);
    }

    // Upsert — if already exists, return existing
    const existing = await prisma.dictionaryEntry.findUnique({ where: { word: normalized } });
    if (existing) {
      return successResponse({ entry: existing, created: false, message: "Kata sudah ada di kamus" });
    }

    const entry = await prisma.dictionaryEntry.create({
      data: {
        word: normalized,
        originalWord: data.originalWord || data.word,
        category: data.category || "other",
        addedBy: session.user.id,
        addedByName: session.user.name || session.user.email,
        notes: data.notes,
      },
    });

    return successResponse({ entry, created: true });
  } catch (error) {
    return errorResponse(error);
  }
}
