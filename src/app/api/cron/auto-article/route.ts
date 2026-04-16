import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, successResponse, errorResponse, requireRole } from "@/lib/api-utils";
import { slugify, calculateReadTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TARGET_KEYWORDS = [
  "hukum bandung",
  "berita hukum bandung",
  "pengadilan bandung",
  "sidang bandung",
  "hukum pidana bandung",
  "hukum perdata bandung",
  "korupsi jawa barat",
  "kasus hukum bandung",
  "berita hukum jawa barat",
  "advokat bandung",
  "pengacara bandung",
  "hukum tata negara",
  "HAM bandung",
  "tipikor bandung",
  "kejaksaan bandung",
];

async function getDeepSeekKey(): Promise<string | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "deepseek_api_key" },
  });
  return setting?.value || null;
}

async function callDeepSeek(apiKey: string, prompt: string, maxTokens = 2000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah jurnalis senior media berita hukum 'Jurnalis Hukum Bandung'. Tulis artikel berita dalam Bahasa Indonesia yang profesional, informatif, dan berdasarkan fakta. Gunakan gaya penulisan jurnalistik berita (5W+1H). Jangan gunakan markdown formatting seperti ** atau ##, tulis dalam format HTML dengan tag <h2>, <h3>, <p>, <ul>, <li>, <blockquote>.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.8,
      }),
    });
    if (!res.ok) throw new Error(`DeepSeek API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } finally {
    clearTimeout(timeout);
  }
}

async function generateArticle(apiKey: string) {
  // 1. Pick random keyword
  const keyword = TARGET_KEYWORDS[Math.floor(Math.random() * TARGET_KEYWORDS.length)];

  // 2. Get related existing articles for context
  const existingArticles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { title: { contains: keyword.split(" ")[0], mode: "insensitive" } },
        { content: { contains: keyword.split(" ")[0], mode: "insensitive" } },
      ],
    },
    select: { title: true, excerpt: true, content: true },
    orderBy: { publishedAt: "desc" },
    take: 5,
  });

  // 3. Get random image from media library
  const mediaCount = await prisma.media.count({ where: { type: { startsWith: "image" } } });
  const randomSkip = Math.max(0, Math.floor(Math.random() * mediaCount));
  const randomMedia = await prisma.media.findFirst({
    where: { type: { startsWith: "image" } },
    skip: randomSkip,
    select: { url: true, caption: true, source: true },
  });

  // 4. Build context from existing articles
  const context = existingArticles
    .map((a) => `Judul: ${a.title}\nRingkasan: ${a.excerpt || ""}`)
    .join("\n\n");

  // 5. Generate article with DeepSeek
  const prompt = `Berdasarkan konteks berita hukum Bandung berikut, tulis artikel berita baru yang ORIGINAL dan UNIK tentang topik "${keyword}".

Konteks referensi (JANGAN copy, gunakan sebagai inspirasi saja):
${context || "Berita hukum di Bandung dan Jawa Barat terkini."}

Instruksi:
1. Tulis judul yang menarik dan informatif (40-70 karakter)
2. Tulis konten artikel 300-500 kata dalam format HTML (<p>, <h2>, <h3>, <blockquote>)
3. Gunakan gaya jurnalistik profesional (5W+1H)
4. Sertakan kutipan narasumber (boleh fiktif tapi realistis)
5. Fokus pada aspek hukum di Bandung/Jawa Barat
6. JANGAN gunakan markdown (**bold** atau ## heading), gunakan HTML tags

Format output (HARUS persis seperti ini):
JUDUL: [judul artikel]
EXCERPT: [ringkasan 1-2 kalimat]
TAGS: [tag1, tag2, tag3, tag4, tag5]
KONTEN:
[isi artikel dalam HTML]`;

  const result = await callDeepSeek(apiKey, prompt, 2000);

  // 6. Parse result
  const titleMatch = result.match(/JUDUL:\s*(.+)/);
  const excerptMatch = result.match(/EXCERPT:\s*(.+)/);
  const tagsMatch = result.match(/TAGS:\s*(.+)/);
  const contentMatch = result.match(/KONTEN:\s*([\s\S]+)/);

  if (!titleMatch || !contentMatch) {
    throw new Error("Failed to parse AI response");
  }

  const title = titleMatch[1].trim();
  let content = contentMatch[1].trim();
  const excerpt = excerptMatch?.[1]?.trim() || "";
  const tags = tagsMatch?.[1]
    ?.split(",")
    .map((t: string) => t.trim())
    .filter(Boolean) || [keyword];

  // 7. Insert image into content if available
  if (randomMedia) {
    const alt = randomMedia.caption || title;
    const imgTitle = randomMedia.source || "Dok. JHB";
    const imgTag = `<img src="${randomMedia.url}" alt="${alt}" title="${imgTitle}" style="width: 100%">`;
    content = imgTag + content;
  }

  // 8. Generate unique slug
  let slug = slugify(title);
  const existing = await prisma.article.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  // 9. Get "Redaksi" user as author, fallback to first admin
  let author = await prisma.user.findFirst({
    where: { name: { contains: "Redaksi", mode: "insensitive" }, isActive: true },
    select: { id: true, name: true },
  });
  if (!author) {
    author = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
      select: { id: true, name: true },
    });
  }
  if (!author) throw new Error("No author user found");

  // 10. Get all active editors/journalists for coAuthors label
  const editors = await prisma.user.findMany({
    where: { role: { in: ["EDITOR", "SUPER_ADMIN"] }, isActive: true },
    select: { name: true },
    take: 3,
  });
  const coAuthorsStr = editors.map((e) => e.name).join(", ") || "Tim Redaksi";

  // 11. Get category matching keyword, fallback random
  const categories = await prisma.category.findMany({ select: { id: true, name: true } });
  const matchedCat = categories.find((c) =>
    keyword.toLowerCase().includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(keyword.split(" ")[0])
  );
  const selectedCat = matchedCat || categories[Math.floor(Math.random() * categories.length)];

  // 12. Save as DRAFT with Redaksi as author
  const article = await prisma.article.create({
    data: {
      title,
      slug,
      content,
      excerpt,
      featuredImage: randomMedia?.url || null,
      status: "DRAFT",
      readTime: calculateReadTime(content),
      authorId: author.id,
      categoryId: selectedCat.id,
      coAuthors: coAuthorsStr,
      verificationLabel: "UNVERIFIED",
      tags: {
        connectOrCreate: tags.map((name: string) => ({
          where: { name },
          create: { name, slug: slugify(name) },
        })),
      },
    },
    select: { id: true, title: true, slug: true },
  });

  return { article, keyword, imageUsed: !!randomMedia };
}

async function handleAutoArticle(request: NextRequest) {
  try {
    // Auth: cron secret OR admin session (logged in)
    const authHeader = request.headers.get("authorization");
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
    if (!isCron) {
      // Try session auth — only SUPER_ADMIN/EDITOR
      await requireRole(["SUPER_ADMIN", "EDITOR"]);
    }

    // Check if auto-article is enabled
    const enabledSetting = await prisma.systemSetting.findUnique({
      where: { key: "auto_article_enabled" },
    });
    if (enabledSetting?.value === "false") {
      return successResponse({ message: "Auto-article is disabled", generated: 0 });
    }

    // Get count from request body or setting
    let requestCount = 0;
    try {
      const body = await request.json().catch(() => ({}));
      if (body.count) requestCount = parseInt(body.count);
    } catch { /* ignore */ }

    const countSetting = await prisma.systemSetting.findUnique({
      where: { key: "auto_article_count" },
    });
    const count = Math.min(10, Math.max(1, requestCount || parseInt(countSetting?.value || "1")));

    const apiKey = await getDeepSeekKey();
    if (!apiKey) {
      return successResponse({ message: "DeepSeek API key not configured", generated: 0 });
    }

    const results = [];
    for (let i = 0; i < count; i++) {
      try {
        const result = await generateArticle(apiKey);
        results.push({ success: true, ...result });
      } catch (e) {
        results.push({ success: false, error: String(e).slice(0, 100) });
      }
      // Delay between generations
      if (i < count - 1) await new Promise((r) => setTimeout(r, 2000));
    }

    return successResponse({
      generated: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function GET(request: NextRequest) {
  return handleAutoArticle(request);
}

export async function POST(request: NextRequest) {
  return handleAutoArticle(request);
}
