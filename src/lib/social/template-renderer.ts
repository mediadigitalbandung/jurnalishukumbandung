import sharp from "sharp";

export type TextLayer = {
  text: string;
  x: number;           // 0-1
  y: number;           // 0-1
  fontSize: number;    // pixels (relative to canvas height)
  color: string;       // hex/css color
  align: "left" | "center" | "right";
  fontWeight: "normal" | "bold" | "600" | "700";
  maxWidth?: number;   // 0-1 (percentage of canvas width)
  fontFamily?: string;
};

export type TemplateConfig = {
  templateImageUrl: string;     // URL or path to overlay PNG
  aspectRatio: "4:5" | "1:1" | "1.91:1";
  photoSlotX: number;
  photoSlotY: number;
  photoSlotWidth: number;
  photoSlotHeight: number;
  textLayers?: TextLayer[] | null;
};

export type ArticleData = {
  title: string;
  category?: { name: string } | null;
  author?: { name: string } | null;
  publishedAt?: Date | string | null;
  featuredImage?: string | null;
};

const ASPECT_DIMENSIONS = {
  "4:5": { width: 1080, height: 1350 },
  "1:1": { width: 1080, height: 1080 },
  "1.91:1": { width: 1200, height: 628 },
};

function replacePlaceholders(text: string, article: ArticleData): string {
  const date = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const dateStr = date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return text
    .replace(/\{\{title\}\}/g, article.title || "")
    .replace(/\{\{category\}\}/g, article.category?.name || "")
    .replace(/\{\{date\}\}/g, dateStr)
    .replace(/\{\{author\}\}/g, article.author?.name || "");
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapTextLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildTextSvg(
  layers: TextLayer[],
  article: ArticleData,
  canvasW: number,
  canvasH: number
): string {
  const elements: string[] = [];

  for (const layer of layers) {
    const text = replacePlaceholders(layer.text, article);
    if (!text.trim()) continue;

    const maxWidthPx = layer.maxWidth ? canvasW * layer.maxWidth : canvasW * 0.9;
    // Rough heuristic: 0.55 char width ratio for most fonts
    const charPxWidth = layer.fontSize * 0.55;
    const maxChars = Math.max(8, Math.floor(maxWidthPx / charPxWidth));
    const lines = wrapTextLines(text, maxChars);

    const xPx = canvasW * layer.x;
    const yPx = canvasH * layer.y;
    const lineHeight = layer.fontSize * 1.2;

    const anchor =
      layer.align === "center" ? "middle" : layer.align === "right" ? "end" : "start";

    for (let i = 0; i < lines.length; i++) {
      elements.push(
        `<text x="${xPx.toFixed(1)}" y="${(yPx + i * lineHeight + layer.fontSize).toFixed(1)}" ` +
          `font-family="${layer.fontFamily || "Source Sans 3, Arial, sans-serif"}" ` +
          `font-size="${layer.fontSize}" ` +
          `font-weight="${layer.fontWeight}" ` +
          `fill="${layer.color}" ` +
          `text-anchor="${anchor}">${escapeXml(lines[i])}</text>`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}">${elements.join("")}</svg>`;
}

async function fetchBuffer(urlOrPath: string): Promise<Buffer> {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error(`Fetch failed: ${urlOrPath} (${res.status})`);
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  }
  // Local path (e.g. /uploads/...)
  const fs = await import("fs/promises");
  const path = await import("path");
  const absPath = path.join(process.cwd(), "public", urlOrPath.replace(/^\//, ""));
  return fs.readFile(absPath);
}

/**
 * Composite article photo + template overlay + text layers → final JPEG.
 * Layer order (bottom → top):
 *   1. White canvas base
 *   2. Article photo (resized to fit photo slot)
 *   3. Template overlay PNG (should have transparent area over photo slot)
 *   4. Text layers
 */
export async function renderTemplate(
  template: TemplateConfig,
  article: ArticleData,
  options: { jpegQuality?: number } = {}
): Promise<Buffer> {
  const dims = ASPECT_DIMENSIONS[template.aspectRatio];
  if (!dims) throw new Error(`Invalid aspect ratio: ${template.aspectRatio}`);
  const { width, height } = dims;

  if (!article.featuredImage) {
    throw new Error("Article has no featured image");
  }

  const [photoBuf, overlayBuf] = await Promise.all([
    fetchBuffer(article.featuredImage),
    fetchBuffer(template.templateImageUrl),
  ]);

  // Calculate slot dimensions (pixel)
  const slotX = Math.round(width * template.photoSlotX);
  const slotY = Math.round(height * template.photoSlotY);
  const slotW = Math.round(width * template.photoSlotWidth);
  const slotH = Math.round(height * template.photoSlotHeight);

  // Resize photo to fit slot, cropped (cover)
  const photoResized = await sharp(photoBuf)
    .resize(slotW, slotH, { fit: "cover", position: "center" })
    .toBuffer();

  // Resize overlay to match canvas size
  const overlayResized = await sharp(overlayBuf)
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();

  // Base white canvas
  const base = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  });

  const composites: sharp.OverlayOptions[] = [
    { input: photoResized, left: slotX, top: slotY },
    { input: overlayResized, left: 0, top: 0 },
  ];

  // Text layers on top
  if (template.textLayers && template.textLayers.length > 0) {
    const svg = buildTextSvg(template.textLayers, article, width, height);
    composites.push({ input: Buffer.from(svg), left: 0, top: 0 });
  }

  return base
    .composite(composites)
    .jpeg({ quality: options.jpegQuality ?? 88, mozjpeg: true })
    .toBuffer();
}
