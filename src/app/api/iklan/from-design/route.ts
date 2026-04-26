/**
 * POST /api/iklan/from-design
 *
 * Auto-create Ad record dari uploaded design (hasil dari Claude Design).
 * User cukup upload file PNG/JPG + minimal metadata, sistem create Ad lengkap.
 *
 * Body (JSON):
 * {
 *   imageUrl: string,         // URL hasil upload (dari /api/upload)
 *   clientName: string,       // dipakai jadi Ad.name
 *   slot: AdSlot,
 *   targetUrl: string,
 *   startDate?: string,        // ISO; default: now
 *   endDate?: string,          // ISO; default: now + 30 hari
 *   priority?: number,         // default 0
 *   targetPages?: string[]
 * }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const inputSchema = z.object({
  imageUrl: z.string().url().min(1),
  clientName: z.string().min(1).max(100),
  slot: z.enum(["HEADER", "SIDEBAR", "IN_ARTICLE", "FOOTER", "BETWEEN_SECTIONS", "POPUP", "FLOATING_BOTTOM"]),
  targetUrl: z.string().url().max(500),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  targetPages: z.array(z.string()).max(20).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const body = await req.json();
    const data = inputSchema.parse(body);

    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = data.endDate
      ? new Date(data.endDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 hari

    if (endDate <= startDate) {
      throw new ApiError("End date harus setelah start date", 400);
    }

    const ad = await prisma.ad.create({
      data: {
        name: `[${data.slot}] ${data.clientName}`,
        type: "IMAGE",
        imageUrl: data.imageUrl,
        targetUrl: data.targetUrl,
        slot: data.slot,
        startDate,
        endDate,
        isActive: true,
        priority: data.priority ?? 0,
        targetPages: data.targetPages || [],
      },
    });

    return successResponse(
      {
        ad,
        message: `Iklan untuk ${data.clientName} berhasil dibuat. Live dari ${startDate.toLocaleDateString("id-ID")} sampai ${endDate.toLocaleDateString("id-ID")}.`,
      },
      201
    );
  } catch (error) {
    return errorResponse(error);
  }
}
