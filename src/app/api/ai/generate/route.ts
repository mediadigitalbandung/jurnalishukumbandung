import { NextRequest } from "next/server";
import { requireAuth, successResponse, errorResponse, ApiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { aiRateLimit } from "@/lib/rate-limit";

const PROMPTS: Record<string, (title: string, content: string) => string> = {
  tags: (title, content) =>
    `Berikan 5-8 tag relevan untuk artikel berita hukum berikut. Format: tag1, tag2, tag3. Judul: ${title}. Konten: ${content.slice(0, 1000)}`,
  summary: (title, content) =>
    `Buatkan ringkasan 2-3 kalimat untuk artikel berita hukum berikut. Judul: ${title}. Konten: ${content.slice(0, 2000)}`,
  seo_title: (title) =>
    `Buatkan SEO title (maks 60 karakter) untuk artikel berita hukum berikut. Judul: ${title}`,
  meta_description: (title, content) =>
    `Buatkan meta description (maks 155 karakter) untuk artikel berita hukum berikut. Judul: ${title}. Konten: ${content.slice(0, 1000)}`,
  image_caption: (title, content) =>
    `Buatkan caption/judul foto singkat (maks 100 karakter, bahasa Indonesia) yang cocok untuk gambar utama artikel berita hukum berikut. Hanya berikan caption-nya saja tanpa penjelasan. Judul: ${title}. Konten: ${content.slice(0, 500)}`,
};

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    // Rate limit per user
    const { success: allowed } = aiRateLimit(session.user.id);
    if (!allowed) {
      throw new ApiError("Batas penggunaan AI tercapai (20 request/jam). Coba lagi nanti.", 429);
    }

    const body = await req.json();
    const { feature, content, title } = body as {
      feature: string;
      content: string;
      title: string;
    };

    if (!feature || !content || !title) {
      throw new ApiError("Field feature, content, dan title diperlukan", 400);
    }

    if (!PROMPTS[feature]) {
      throw new ApiError("Feature tidak valid. Gunakan: tags, summary, seo_title, meta_description", 400);
    }

    // Get API key from SystemSetting
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "deepseek_api_key" },
    });

    if (!setting?.value) {
      throw new ApiError("API Key AI belum dikonfigurasi. Hubungi administrator.", 400);
    }

    const prompt = PROMPTS[feature](title, content);

    // Call DeepSeek API with 30s timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response: Response;
    try {
      response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${setting.value}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: "Kamu adalah asisten AI untuk media berita hukum Indonesia. Jawab dalam Bahasa Indonesia.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new ApiError("Gagal menghubungi AI service. Coba lagi nanti.", 502);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content?.trim() || "";
    const usage = data.usage || {};
    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || 0;

    // Log usage
    await prisma.aIUsageLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name,
        feature,
        inputTokens,
        outputTokens,
        totalTokens,
        articleTitle: title,
      },
    });

    return successResponse({ result, tokensUsed: totalTokens });
  } catch (error) {
    return errorResponse(error);
  }
}
