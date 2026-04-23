import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min upload

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "public/uploads";

const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_AUDIO = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-m4a", "audio/mp3"];

const MAX_VIDEO = 128 * 1024 * 1024; // 128MB
const MAX_IMAGE = 15 * 1024 * 1024;  // 15MB
const MAX_AUDIO = 30 * 1024 * 1024;  // 30MB

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "video/x-msvideo": "avi",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/x-m4a": "m4a",
  };
  return map[mime] || "bin";
}

/** POST /api/tiktok/upload — upload video/image/audio */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = (formData.get("kind") as string) || ""; // "video" | "image" | "audio"

    if (!file) throw new ApiError("Tidak ada file", 400);

    const mime = file.type;
    let category: "video" | "image" | "audio";
    let maxSize: number;

    if (ALLOWED_VIDEO.includes(mime)) {
      category = "video";
      maxSize = MAX_VIDEO;
    } else if (ALLOWED_IMAGE.includes(mime)) {
      category = "image";
      maxSize = MAX_IMAGE;
    } else if (ALLOWED_AUDIO.includes(mime)) {
      category = "audio";
      maxSize = MAX_AUDIO;
    } else {
      throw new ApiError(`Tipe file tidak didukung: ${mime}`, 400);
    }

    if (kind && kind !== category) {
      throw new ApiError(`Kind '${kind}' tidak match dengan file (${category})`, 400);
    }

    if (file.size > maxSize) {
      throw new ApiError(
        `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Max ${maxSize / 1024 / 1024}MB untuk ${category}.`,
        400
      );
    }

    // Save file
    const subdir = category === "video" ? "tiktok/source" : category === "image" ? "tiktok/source" : "tiktok/audio";
    const targetDir = join(process.cwd(), UPLOAD_DIR, subdir);
    await mkdir(targetDir, { recursive: true });

    const filename = `${Date.now()}-${randomBytes(5).toString("hex")}.${extFromMime(mime)}`;
    const targetPath = join(targetDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);

    const publicUrl = `${BASE_URL.replace(/\/$/, "")}/uploads/${subdir}/${filename}`;

    return successResponse({
      url: publicUrl,
      category,
      size: file.size,
      mime,
      filename,
    }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
