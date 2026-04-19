import { prisma } from "@/lib/prisma";
import { renderTemplate, type TemplateConfig, type ArticleData } from "./template-renderer";
import { generateCaptionForTemplate } from "./ai-caption";
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
 * Check if template uses AI-generated placeholders.
 */
function templateUsesAIText(template: TemplateConfig): boolean {
  if (!template.textLayers) return false;
  return template.textLayers.some((l) =>
    /\{\{(paraphrased_title|short_summary)\}\}/.test(l.text)
  );
}

/**
 * Enrich article data with AI-generated paraphrased title + short summary.
 * Only calls AI if the template actually uses these placeholders.
 */
export async function enrichArticleForTemplate(
  template: TemplateConfig,
  article: ArticleData & { content?: string; excerpt?: string | null }
): Promise<ArticleData> {
  if (!templateUsesAIText(template)) return article;

  // Skip if already enriched
  if (article.paraphrasedTitle && article.shortSummary) return article;

  try {
    const caption = await generateCaptionForTemplate({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content || "",
      category: article.category,
    });
    return {
      ...article,
      paraphrasedTitle: caption.paraphrasedTitle,
      shortSummary: caption.shortSummary,
    };
  } catch (err) {
    console.error("[TEMPLATE] AI enrich failed, using raw title:", err);
    return {
      ...article,
      paraphrasedTitle: article.title,
      shortSummary: article.excerpt || "",
    };
  }
}

/**
 * Render a template + article, save to /public/uploads, return the public URL.
 * Auto-enriches article with AI captions if template uses AI placeholders.
 */
export async function renderAndStoreTemplate(
  template: TemplateConfig,
  article: ArticleData & { content?: string; excerpt?: string | null },
  options: { jpegQuality?: number } = {}
): Promise<string> {
  const enriched = await enrichArticleForTemplate(template, article);
  const buffer = await renderTemplate(template, enriched, options);

  const uploadDirConfig = process.env.UPLOAD_DIR || "public/uploads";
  const absoluteUploadDir = join(process.cwd(), uploadDirConfig, "social");
  await mkdir(absoluteUploadDir, { recursive: true });

  const filename = `social-${Date.now()}-${randomBytes(4).toString("hex")}.jpg`;
  const filePath = join(absoluteUploadDir, filename);
  await writeFile(filePath, buffer);

  return `${BASE_URL.replace(/\/$/, "")}/uploads/social/${filename}`;
}
