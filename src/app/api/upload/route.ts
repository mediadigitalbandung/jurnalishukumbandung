import { NextRequest } from "next/server";
import { requireAuth, ApiError, successResponse, errorResponse } from "@/lib/api-utils";
import { writeFile, mkdir, access, chmod } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error("[UPLOAD] FormData parse error:", parseError);
      throw new ApiError("Gagal membaca file. Ukuran mungkin terlalu besar.", 400);
    }

    const file = formData.get("file") as File;
    if (!file) {
      throw new ApiError("No file provided", 400);
    }

    console.log(`[UPLOAD] Received: name=${file.name}, type=${file.type}, size=${file.size}`);

    // Validate file type — also detect by extension as fallback
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    const ext = file.name?.split(".").pop()?.toLowerCase() || "";
    const validExts = ["jpg", "jpeg", "png", "webp"];
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      throw new ApiError(`Format gambar tidak didukung (${file.type || "unknown"}). Gunakan JPEG, PNG, atau WebP.`, 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new ApiError("Ukuran gambar maksimal 5MB", 400);
    }

    // Determine extension from type or filename
    const fileExt = ext && validExts.includes(ext) ? (ext === "jpeg" ? "jpg" : ext)
      : file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp"
      : "jpg";
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${fileExt}`;

    // Determine upload directory (default: public/uploads)
    const uploadDirConfig = process.env.UPLOAD_DIR || "public/uploads";
    const absoluteUploadDir = join(process.cwd(), uploadDirConfig);
    console.log("[UPLOAD] Upload directory:", absoluteUploadDir);

    try {
      await mkdir(absoluteUploadDir, { recursive: true });
      // Ensure directory is writable
      try { await chmod(absoluteUploadDir, 0o755); } catch { /* ignore on Windows */ }
    } catch (mkdirError) {
      console.error("[UPLOAD] Failed to create directory:", mkdirError);
      throw new ApiError("Gagal membuat folder upload. Hubungi administrator.", 500);
    }

    const filePath = join(absoluteUploadDir, filename);
    const bytes = await file.arrayBuffer();

    try {
      await writeFile(filePath, Buffer.from(bytes));
      console.log(`[UPLOAD] Successfully saved: ${filePath} (${bytes.byteLength} bytes)`);
    } catch (writeError) {
      console.error("[UPLOAD] Failed to write file:", writeError);
      const msg = writeError instanceof Error ? writeError.message : "unknown";
      if (msg.includes("EACCES") || msg.includes("permission")) {
        throw new ApiError("Permission ditolak pada folder upload. Jalankan: chmod -R 755 public/uploads", 500);
      }
      if (msg.includes("ENOSPC")) {
        throw new ApiError("Disk penuh. Hubungi administrator.", 500);
      }
      throw new ApiError(`Gagal menyimpan file: ${msg}`, 500);
    }

    // Verify file was saved
    try {
      await access(filePath);
    } catch {
      console.error(`[UPLOAD] File not found after write: ${filePath}`);
      throw new ApiError("File tidak tersimpan dengan benar", 500);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    if (!appUrl) {
      console.error("[UPLOAD] NEXT_PUBLIC_APP_URL is not set");
      throw new ApiError("NEXT_PUBLIC_APP_URL belum diset di .env", 500);
    }
    const url = `${appUrl.replace(/\/$/, "")}/uploads/${filename}`;

    console.log(`[UPLOAD] Success: ${url}`);
    return successResponse({ url });
  } catch (error) {
    console.error("[UPLOAD] Error:", error);
    return errorResponse(error);
  }
}
