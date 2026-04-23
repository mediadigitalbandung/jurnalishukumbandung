import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { join } from "path";
import { unlink } from "fs/promises";

export const dynamic = "force-dynamic";

/** DELETE /api/tiktok/backsongs/:id — hapus backsong (SUPER_ADMIN only) */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole(["SUPER_ADMIN"]);
    const b = await prisma.tiktokBacksong.findUnique({ where: { id: params.id } });
    if (!b) throw new ApiError("Backsong tidak ditemukan", 404);

    // Best-effort delete file
    if (b.url) {
      try {
        const url = new URL(b.url);
        const p = join(process.cwd(), "public", url.pathname);
        await unlink(p).catch(() => {});
      } catch { /* ignore */ }
    }

    await prisma.tiktokBacksong.delete({ where: { id: params.id } });
    return successResponse({ message: "Backsong dihapus" });
  } catch (error) {
    return errorResponse(error);
  }
}
