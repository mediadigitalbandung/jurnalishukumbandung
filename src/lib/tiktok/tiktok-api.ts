/**
 * TikTok Content Posting API Client
 *
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 *
 * Auth flow:
 * 1. User clicks "Connect TikTok" → redirect to TikTok OAuth page
 * 2. TikTok redirects back with code → exchange for access_token + refresh_token
 * 3. Access token valid 24h, refresh token valid 365 days
 *
 * Publish flow (FILE_UPLOAD method):
 * 1. POST /v2/post/publish/inbox/video/init/ → get upload_url + publish_id
 * 2. PUT upload_url with video file (chunked upload)
 * 3. Video appears in TikTok Inbox → user finalizes in app (for draft mode)
 *    OR
 * 1. POST /v2/post/publish/video/init/ → direct publish (requires Content Posting API approval)
 * 2. PUT upload_url with file
 * 3. Video published automatically
 */

import { prisma } from "@/lib/prisma";
import { readFile, stat } from "fs/promises";

const TIKTOK_API_BASE = "https://open.tiktokapis.com";
const TIKTOK_OAUTH_BASE = "https://www.tiktok.com";

export function buildAuthUrl(clientKey: string, redirectUri: string, state: string, scope?: string): string {
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: scope || "user.info.basic,video.upload,video.publish",
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });
  return `${TIKTOK_OAUTH_BASE}/v2/auth/authorize/?${params.toString()}`;
}

export async function exchangeCodeForToken(
  clientKey: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  open_id: string;
  scope: string;
}> {
  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${TIKTOK_API_BASE}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`TikTok token exchange failed: ${data.error_description || JSON.stringify(data)}`);
  }
  return data;
}

export async function refreshAccessToken(
  clientKey: string,
  clientSecret: string,
  refreshToken: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
}> {
  const params = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(`${TIKTOK_API_BASE}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`TikTok token refresh failed: ${data.error_description || JSON.stringify(data)}`);
  }
  return data;
}

/** Get a valid access token, refreshing if needed. Returns null if not configured. */
export async function getValidAccessToken(): Promise<string | null> {
  const s = await prisma.tiktokSettings.findFirst();
  if (!s?.accessToken || !s.clientKey || !s.clientSecret) return null;

  const now = new Date();
  const expiresAt = s.tokenExpiresAt;
  const expiringSoon = !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000; // 5 min

  if (!expiringSoon) return s.accessToken;

  // Need refresh
  if (!s.refreshToken) return s.accessToken; // Try with expired token anyway

  try {
    const refreshed = await refreshAccessToken(s.clientKey, s.clientSecret, s.refreshToken);
    await prisma.tiktokSettings.update({
      where: { id: s.id },
      data: {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      },
    });
    return refreshed.access_token;
  } catch (err) {
    console.error("[TIKTOK] Refresh failed:", err);
    return s.accessToken;
  }
}

/**
 * Upload video to TikTok Inbox (draft mode — user finalizes in app)
 * This is the SAFEST method — works without content-posting-direct scope approval.
 *
 * Returns publish_id (user can see video in TikTok app as draft/pending upload)
 */
export async function uploadToInbox(localFilePath: string): Promise<{
  publishId: string;
  message: string;
}> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("TikTok belum terhubung. Setup di /panel/tiktok/settings");

  const fileStats = await stat(localFilePath);
  const fileSize = fileStats.size;
  if (fileSize > 128 * 1024 * 1024) {
    throw new Error("File terlalu besar (max 128MB untuk TikTok)");
  }

  // Step 1: Init upload
  const chunkSize = Math.min(fileSize, 10 * 1024 * 1024); // 10MB chunks
  const chunkCount = Math.ceil(fileSize / chunkSize);

  const initRes = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/inbox/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: fileSize,
        chunk_size: chunkSize,
        total_chunk_count: chunkCount,
      },
    }),
  });
  const initData = await initRes.json();
  if (!initRes.ok || initData.error?.code !== "ok") {
    throw new Error(`TikTok init failed: ${initData.error?.message || JSON.stringify(initData)}`);
  }

  const uploadUrl = initData.data.upload_url;
  const publishId = initData.data.publish_id;

  // Step 2: Upload file (simple single-chunk for files <= 10MB, otherwise chunked)
  const fileBuffer = await readFile(localFilePath);

  if (chunkCount === 1) {
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes 0-${fileSize - 1}/${fileSize}`,
      },
      body: fileBuffer,
    });
    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`TikTok upload failed (HTTP ${uploadRes.status}): ${text.slice(0, 200)}`);
    }
  } else {
    // Chunked upload
    for (let i = 0; i < chunkCount; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize);
      const chunk = fileBuffer.subarray(start, end);
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "video/mp4",
          "Content-Range": `bytes ${start}-${end - 1}/${fileSize}`,
        },
        body: chunk,
      });
      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(`TikTok chunk ${i + 1} failed: ${text.slice(0, 200)}`);
      }
    }
  }

  return {
    publishId,
    message: "Upload sukses. Video ada di TikTok inbox/drafts — buka app TikTok untuk publish.",
  };
}

/**
 * Check publish status — for direct publish API.
 * Returns current state: PROCESSING_UPLOAD, PROCESSING_DOWNLOAD, PUBLISHED, FAILED
 */
export async function checkPublishStatus(publishId: string): Promise<{
  status: string;
  failReason?: string;
  publiclyAvailablePostId?: string[];
}> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("TikTok belum terhubung");

  const res = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/status/fetch/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    throw new Error(`TikTok status check failed: ${data.error?.message || JSON.stringify(data)}`);
  }
  return {
    status: data.data.status,
    failReason: data.data.fail_reason,
    publiclyAvailablePostId: data.data.publicly_available_post_id,
  };
}

export async function fetchCreatorInfo(): Promise<{
  open_id: string;
  union_id: string;
  avatar_url: string;
  display_name: string;
  username?: string;
}> {
  const token = await getValidAccessToken();
  if (!token) throw new Error("TikTok belum terhubung");

  const res = await fetch(`${TIKTOK_API_BASE}/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || data.error?.code !== "ok") {
    throw new Error(`TikTok user info failed: ${data.error?.message || JSON.stringify(data)}`);
  }
  return data.data.user;
}
