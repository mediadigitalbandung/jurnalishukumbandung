import { prisma } from "@/lib/prisma";
import { renderTemplate, type TemplateConfig, type ArticleData } from "./template-renderer";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

/**
 * Find the best template for a given platform+aspect ratio.
 * Priority: isDefault > isActive > most recent.
 */
export async function findTemplateForPlatform(
  platform: "instagram" | "facebook",
  aspectRatio?: string
): Promise<TemplateConfig | null> {
  const templates = await prisma.socialTemplate.findMany({
    where: {
      isActive: true,
      OR: [{ platform }, { platform: "both" }],
      ...(aspectRatio ? { aspectRatio } : {}),
    },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    take: 1,
  });

  if (templates.length === 0) return null;

  const t = templates[0];
  return {
    templateImageUrl: t.templateImageUrl,
    aspectRatio: t.aspectRatio as TemplateConfig["aspectRatio"],
    photoSlotX: t.photoSlotX,
    photoSlotY: t.photoSlotY,
    photoSlotWidth: t.photoSlotWidth,
    photoSlotHeight: t.photoSlotHeight,
    textLayers: (t.textLayers as TemplateConfig["textLayers"]) || null,
  };
}

/**
 * Render a template + article, save to /public/uploads, return the public URL.
 * Used by social media publishers to get a processable image URL for Meta API.
 */
export async function renderAndStoreTemplate(
  template: TemplateConfig,
  article: ArticleData,
  options: { jpegQuality?: number } = {}
): Promise<string> {
  const buffer = await renderTemplate(template, article, options);

  const uploadDirConfig = process.env.UPLOAD_DIR || "public/uploads";
  const absoluteUploadDir = join(process.cwd(), uploadDirConfig, "social");
  await mkdir(absoluteUploadDir, { recursive: true });

  const filename = `social-${Date.now()}-${randomBytes(4).toString("hex")}.jpg`;
  const filePath = join(absoluteUploadDir, filename);
  await writeFile(filePath, buffer);

  return `${BASE_URL.replace(/\/$/, "")}/uploads/social/${filename}`;
}
