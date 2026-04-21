import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  successResponse,
  errorResponse,
  requireRole,
  logAudit,
  ApiError,
} from "@/lib/api-utils";

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(12, "Password minimal 12 karakter").optional(),
  role: z.enum(["SUPER_ADMIN", "EDITOR", "JOURNALIST", "CONTRIBUTOR"]).optional(),
  specialization: z.string().max(100).optional(),
  avatar: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
});

// PUT /api/users/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      throw new ApiError("Pengguna tidak ditemukan", 404);
    }

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    // Privilege escalation guard: only SUPER_ADMIN can change roles
    if (data.role !== undefined && data.role !== user.role && session.user.role !== "SUPER_ADMIN") {
      throw new ApiError("Hanya SUPER_ADMIN yang dapat mengubah role pengguna", 403);
    }

    // Also prevent non-SUPER_ADMIN from toggling isActive on SUPER_ADMIN accounts
    if (data.isActive !== undefined && user.role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
      throw new ApiError("Hanya SUPER_ADMIN yang dapat mengubah status akun SUPER_ADMIN lain", 403);
    }

    // If email is being changed, check for duplicates
    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing) {
        throw new ApiError("Email sudah digunakan oleh pengguna lain", 400);
      }
    }

    // Hash password if provided
    const updateData: Record<string, unknown> = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        specialization: true,
        isActive: true,
      },
    });

    await logAudit(
      session.user.id,
      "UPDATE",
      "user",
      params.id,
      `Mengupdate pengguna: ${user.name} (${user.email})`
    );

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/users/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);

    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      throw new ApiError("Pengguna tidak ditemukan", 404);
    }

    if (user.id === session.user.id) {
      throw new ApiError("Tidak dapat menghapus akun sendiri", 400);
    }

    await prisma.user.delete({ where: { id: params.id } });

    await logAudit(
      session.user.id,
      "DELETE",
      "user",
      params.id,
      `Menghapus pengguna: ${user.name} (${user.email})`
    );

    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
