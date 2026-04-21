export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  successResponse,
  errorResponse,
  requireAuth,
} from "@/lib/api-utils";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100).optional(),
  avatar: z.string().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  specialization: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  nomorKartuPers: z.string().max(50).optional().nullable(),
  organisasiPers: z.string().max(100).optional().nullable(),
  pendidikan: z.string().max(200).optional().nullable(),
  pengalaman: z.string().max(2000).optional().nullable(),
  keahlian: z.string().max(500).optional().nullable(),
  portofolio: z.string().max(300).optional().nullable(),
  mediaSosial: z.string().max(200).optional().nullable(),
  alamat: z.string().max(500).optional().nullable(),
});

const profileFields = {
  id: true, email: true, name: true, role: true, bio: true,
  specialization: true, avatar: true, phone: true,
  nomorKartuPers: true, organisasiPers: true, pendidikan: true,
  pengalaman: true, keahlian: true, portofolio: true,
  mediaSosial: true, alamat: true, createdAt: true,
  _count: { select: { articles: true } },
};

export async function GET() {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: profileFields,
    });
    if (!user) return errorResponse(new Error("User tidak ditemukan"));
    return successResponse(user);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updateData[key] = value;
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: profileFields,
    });

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
