import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

const ALLOWED_KEYS = [
  "site_name",
  "site_description",
  "contact_email",
  "alamat_redaksi",
  "website_url",
  "deepseek_api_key",
  "resend_api_key",
  "notification_email_from",
  "enable_comments",
  "enable_ai",
  "maintenance_mode",
] as const;

const settingSchema = z.object({
  key: z.string().min(1, "Key wajib diisi").max(100),
  value: z.string().max(5000),
});

export async function GET() {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const settings = await prisma.systemSetting.findMany();
    const keyValue: Record<string, string> = {};
    for (const s of settings) {
      keyValue[s.key] = s.value;
    }

    return successResponse(keyValue);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN"]);

    const body = await req.json();
    const data = settingSchema.parse(body);

    await prisma.systemSetting.upsert({
      where: { key: data.key },
      update: { value: data.value },
      create: { key: data.key, value: data.value },
    });

    return successResponse({ key: data.key, value: data.value });
  } catch (error) {
    return errorResponse(error);
  }
}
