import { NextRequest } from "next/server";
import { requireRole, successResponse, errorResponse } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface IgAccount {
  id: string;
  username: string;
}

interface PageItem {
  id: string;
  name: string;
  accessToken: string;
  instagram: IgAccount | null;
}

/**
 * POST /api/social/settings/analyze-token
 * Menerima token Meta (User/Page) lalu memvalidasi ke Meta Graph API.
 * Mendeteksi Page FB dan Akun Instagram yang terhubung serta auto-fill token.
 */
export async function POST(req: NextRequest) {
  try {
    await requireRole(["SUPER_ADMIN", "EDITOR"]);
    const { token } = await req.json();

    if (!token) {
      return errorResponse(new Error("Token tidak boleh kosong"));
    }

    // 1. Ambil info principal (user / page) yang memiliki token ini
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,category&access_token=${token}`);
    const meData = await meRes.json();

    if (meData.error) {
      return errorResponse(new Error(`Meta API Error: ${meData.error.message} (Code: ${meData.error.code})`));
    }

    const principalId = meData.id;
    const principalName = meData.name;
    const isPageToken = !!meData.category; // Page memiliki category, User tidak.

    // 2. Ambil permissions untuk token ini
    let permissions: string[] = [];
    try {
      const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${token}`);
      const permData = await permRes.json();
      if (permData.data && Array.isArray(permData.data)) {
        permissions = permData.data
          .filter((p: any) => p.status === "granted")
          .map((p: any) => p.permission);
      }
    } catch (e) {
      console.error("Gagal mengambil permissions:", e);
    }

    const requiredPermissions = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic",
      "instagram_content_publish"
    ];

    const missingPermissions = requiredPermissions.filter(p => !permissions.includes(p));

    let pages: PageItem[] = [];

    if (isPageToken) {
      // Jika token yang dimasukkan langsung berupa Page Token
      let igAccount: IgAccount | null = null;
      try {
        const igRes = await fetch(`https://graph.facebook.com/v21.0/${principalId}?fields=instagram_business_account{id,username}&access_token=${token}`);
        const igData = await igRes.json();
        if (igData.instagram_business_account) {
          igAccount = {
            id: igData.instagram_business_account.id,
            username: igData.instagram_business_account.username
          };
        }
      } catch (e) {
        console.error("Gagal mendeteksi Instagram Account dari Page Token:", e);
      }

      pages.push({
        id: principalId,
        name: principalName,
        accessToken: token,
        instagram: igAccount
      });
    } else {
      // Jika berupa User Access Token, ambil semua halaman (Page) yang dikelolanya
      const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=100&access_token=${token}`);
      const pagesData = await pagesRes.json();

      if (pagesData.error) {
        return errorResponse(new Error(`Gagal mengambil daftar Facebook Page: ${pagesData.error.message}`));
      }

      if (pagesData.data && Array.isArray(pagesData.data)) {
        for (const item of pagesData.data) {
          pages.push({
            id: item.id,
            name: item.name,
            accessToken: item.access_token,
            instagram: item.instagram_business_account ? {
              id: item.instagram_business_account.id,
              username: item.instagram_business_account.username
            } : null
          });
        }
      }
    }

    return successResponse({
      tokenType: isPageToken ? "PAGE" : "USER",
      principalId,
      principalName,
      permissions,
      missingPermissions,
      pages,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
