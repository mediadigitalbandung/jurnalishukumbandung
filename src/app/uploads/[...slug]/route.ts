import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  const filename = params.slug.join("/");
  const filePath = join(process.cwd(), "public", "uploads", filename);

  try {
    // Check if file exists
    const file = await readFile(filePath);

    // Determine content type based on extension
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      svg: "image/svg+xml",
    };
    const contentType = mimeTypes[ext || ""] || "application/octet-stream";

    return new NextResponse(file, {
      headers: { "Content-Type": contentType },
    });
  } catch (error) {
    // File not found or unreadable — serve placeholder PNG
    const placeholderPath = join(process.cwd(), "public", "placeholder-image.png");
    try {
      const placeholder = await readFile(placeholderPath);
      return new NextResponse(placeholder, {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
      });
    } catch {
      // If placeholder also missing, return minimal 1x1 transparent PNG
      const empty = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
        "base64"
      );
      return new NextResponse(empty, {
        headers: { "Content-Type": "image/png" },
      });
    }
  }
}
