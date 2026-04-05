import { NextRequest } from "next/server";
import { requireAuth, ApiError, successResponse, errorResponse } from "@/lib/api-utils";
import { writeFile, mkdir, access } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      throw new ApiError("No file provided", 400);
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new ApiError("Format gambar tidak didukung. Gunakan JPEG, PNG, atau WebP.", 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new ApiError("Ukuran gambar maksimal 5MB", 400);
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

    // Determine upload directory (default: public/uploads)
    const uploadDirConfig = process.env.UPLOAD_DIR || "public/uploads";
    const absoluteUploadDir = join(process.cwd(), uploadDirConfig);
    console.log("[UPLOAD] Upload directory:", absoluteUploadDir);

    try {
      await mkdir(absoluteUploadDir, { recursive: true });
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
      if (writeError instanceof Error && writeError.message.includes("EACCES")) {
        throw new ApiError("Tidak bisa menyimpan file. Permission ditolak pada folder upload.", 500);
      }
      throw new ApiError("Gagal menyimpan file ke server", 500);
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
      throw new ApiError("Server configuration error", 500);
    }
    const url = `${appUrl.replace(/\/$/, "")}/uploads/${filename}`;

    return successResponse({ url });
  } catch (error) {
    console.error("[UPLOAD] Error:", error);
    return errorResponse(error);
  }
}
