import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { successResponse, errorResponse, requireRole, requireAuth, logAudit, ApiError } from "@/lib/api-utils";

// GET /api/users
export async function GET() {
  try {
    const session = await requireAuth();
    const isAdmin = ["SUPER_ADMIN", "EDITOR"].includes(session.user.role);

    if (isAdmin) {
      // Admin: return full data
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          specialization: true,
          isActive: true,
          createdAt: true,
          _count: { select: { articles: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return successResponse(users);
    } else {
      // Non-admin: return only id, name, role for active users
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });

      return successResponse(users);
    }
  } catch (error) {
    return errorResponse(error);
  }
}

const createUserSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  name: z.string().min(2).max(100),
  role: z.enum(["SUPER_ADMIN", "EDITOR", "JOURNALIST", "CONTRIBUTOR"]),
  specialization: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
});

// POST /api/users
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(["SUPER_ADMIN"]);
    const body = await request.json();
    const data = createUserSchema.parse(body);
    data.email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ApiError("Email sudah terdaftar", 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    await logAudit(session.user.id, "CREATE", "user", user.id, `Membuat user: ${user.name} (${user.role})`);

    return successResponse(user, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
