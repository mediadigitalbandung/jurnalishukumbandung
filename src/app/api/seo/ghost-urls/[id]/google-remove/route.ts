export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireRole,
  ApiError,
  logAudit,
} from "@/lib/api-utils";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

async function getGoogleAuth() {
  let creds = null;
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "google_credentials_json" },
    });
    if (setting?.value) creds = JSON.parse(setting.value);
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      creds = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    }
  } catch { /* no creds */ }
  if (!creds) return null;
  const { google } = await import("googleapis");
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });
  return google.indexing({ version: "v3", auth });
}

// POST /api/seo/ghost-urls/[id]/google-remove
// Tandai ghost URL sebagai "marked deleted" + kirim URL_REMOVED notification ke Google.
// Setelah ini, /berita/[slug] tetap return 404 dan Google akan drop dari index dalam beberapa jam.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(["SUPER_ADMIN", "EDITOR"]);

    const ghost = await prisma.ghostUrl.findUnique({ where: { id: params.id } });
    if (!ghost) throw new ApiError("Ghost URL tidak ditemukan", 404);
    if (ghost.resolved) {
      throw new ApiError(
        "URL ini sudah di-claim ulang dengan artikel baru. Buka panel artikel untuk hapus artikelnya dulu kalau memang mau dihapus permanen.",
        400
      );
    }

    const url = `${BASE_URL}${ghost.path}`;

    // Kirim URL_REMOVED ke Google Indexing API
    let googleStatus: "submitted" | "failed" | "no_credentials" = "no_credentials";
    let googleError: string | null = null;
    const indexing = await getGoogleAuth();
    if (indexing) {
      try {
        await indexing.urlNotifications.publish({
          requestBody: { url, type: "URL_DELETED" },
        });
        googleStatus = "submitted";
      } catch (e) {
        googleStatus = "failed";
        googleError = String(e).slice(0, 200);
      }
    }

    const updated = await prisma.ghostUrl.update({
      where: { id: params.id },
      data: {
        markedDeleted: true,
        deletedAt: new Date(),
        deletedBy: session.user.id,
        googleRemoveStatus: googleStatus === "submitted" ? "submitted" : "failed",
        googleRemoveAt: new Date(),
      },
    });

    await logAudit(
      session.user.id,
      "DELETE",
      "ghost_url_google",
      params.id,
      `Mark deleted + Google URL_REMOVED [${googleStatus}] ${ghost.slug}${googleError ? ` — error: ${googleError}` : ""}`
    );

    return successResponse({
      ghost: updated,
      googleStatus,
      googleError,
      message:
        googleStatus === "submitted"
          ? "Berhasil minta Google hapus URL ini. Biasanya hilang dari hasil search dalam beberapa jam."
          : googleStatus === "failed"
          ? `Gagal kirim ke Google: ${googleError}. Tapi entry sudah ditandai deleted — Google akan drop URL secara organik dalam beberapa minggu.`
          : "Google credentials belum di-set. Entry ditandai deleted — Google akan drop URL secara organik dalam beberapa minggu. Set credentials di /panel/pengaturan untuk percepat.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
