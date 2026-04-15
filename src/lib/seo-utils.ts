import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";

/* ── 1. Ping Google & Bing sitemap ─────────────────────────────── */

export async function pingSitemapToSearchEngines() {
  const sitemapUrl = encodeURIComponent(`${BASE_URL}/sitemap.xml`);
  const pings = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
  ];

  const results = await Promise.allSettled(
    pings.map((url) =>
      fetch(url, { method: "GET" }).then((r) => ({ url, status: r.status }))
    )
  );

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { url: "unknown", status: 0, error: String(r.reason) }
  );
}

/* ── 2. Submit URL to Google Indexing API (Cepat) & Ping ─────────── */

export async function submitUrlToGoogle(articleSlug: string) {
  const articleUrl = `${BASE_URL}/berita/${articleSlug}`;
  const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(`${BASE_URL}/sitemap.xml`)}`;

  const tasks: Promise<any>[] = [
    fetch(pingUrl).then((r) => ({ engine: "google-ping", status: r.status })),
    fetch(`https://www.bing.com/indexnow?url=${encodeURIComponent(articleUrl)}&key=jurnalishukumbandung`).then((r) => ({ engine: "bing-indexnow", status: r.status })),
  ];

  // Try Google Indexing API if configured
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    tasks.push(submitToGoogleIndexingApi(articleUrl).then(r => ({ engine: "google-indexing-api", data: r })));
  }

  const results = await Promise.allSettled(tasks);

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { engine: "unknown", status: 0 }
  );
}

async function submitToGoogleIndexingApi(url: string) {
  try {
    const jsonStr = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!jsonStr) return null;
    
    const credentials = JSON.parse(jsonStr);
    
    // Import googleapis dynamically to avoid blocking standard API edges
    const { google } = await import("googleapis");
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/indexing"],
    });

    const indexing = google.indexing({ version: "v3", auth });
    const res = await indexing.urlNotifications.publish({
      requestBody: { url, type: "URL_UPDATED" },
    });
    
    return res.data;
  } catch (error) {
    console.error("[SEO] Google Indexing API Error:", error);
    return null;
  }
}

/* ── 2.5 Cloudflare Auto-Purge Cache ────────────────────────────── */

export async function purgeCloudflareCache(urls?: string[]) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  
  if (!zoneId || !token) return null;
  
  try {
    const payload = urls && urls.length > 0 
      ? { files: urls } 
      : { purge_everything: true }; // Flush all cache if no specific URLs
      
    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("[SEO] Cloudflare Purged:", data.success);
    return data;
  } catch (error) {
    console.error("[SEO] Cloudflare Purge API Error:", error);
    return null;
  }
}

/* ── 3. Auto-generate SEO title & description via AI ───────────── */

export async function autoGenerateSeoFields(
  title: string,
  content: string,
  existingSeoTitle?: string | null,
  existingSeoDesc?: string | null
): Promise<{ seoTitle: string; seoDescription: string }> {
  // If already filled, return as-is
  if (existingSeoTitle && existingSeoDesc) {
    return { seoTitle: existingSeoTitle, seoDescription: existingSeoDesc };
  }

  // Try AI generation
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "deepseek_api_key" },
    });

    if (!setting?.value) {
      // Fallback: generate from title/content without AI
      return {
        seoTitle: existingSeoTitle || title.slice(0, 60),
        seoDescription: existingSeoDesc || stripHtml(content).slice(0, 155),
      };
    }

    const results: { seoTitle: string; seoDescription: string } = {
      seoTitle: existingSeoTitle || title.slice(0, 60),
      seoDescription: existingSeoDesc || stripHtml(content).slice(0, 155),
    };

    // Generate missing fields
    const tasks: Promise<void>[] = [];

    if (!existingSeoTitle) {
      tasks.push(
        callDeepSeek(
          setting.value,
          `Buatkan SEO title (maks 60 karakter, bahasa Indonesia) untuk artikel berita hukum ini. Hanya berikan title-nya saja tanpa penjelasan. Judul: ${title}`
        ).then((r) => { results.seoTitle = r.slice(0, 60); })
      );
    }

    if (!existingSeoDesc) {
      tasks.push(
        callDeepSeek(
          setting.value,
          `Buatkan meta description (maks 155 karakter, bahasa Indonesia) untuk artikel berita hukum ini. Hanya berikan deskripsi-nya saja tanpa penjelasan. Judul: ${title}. Konten: ${stripHtml(content).slice(0, 1000)}`
        ).then((r) => { results.seoDescription = r.slice(0, 155); })
      );
    }

    await Promise.allSettled(tasks);
    return results;
  } catch {
    // Fallback on any error
    return {
      seoTitle: existingSeoTitle || title.slice(0, 60),
      seoDescription: existingSeoDesc || stripHtml(content).slice(0, 155),
    };
  }
}

/* ── 4. Auto internal linking — find related articles ──────────── */

export async function getRelatedArticleSuggestions(
  articleId: string,
  categoryId: string,
  tagIds: string[],
  limit = 5
): Promise<{ id: string; title: string; slug: string }[]> {
  // Find articles in same category or with shared tags
  const related = await prisma.article.findMany({
    where: {
      id: { not: articleId },
      status: "PUBLISHED",
      OR: [
        { categoryId },
        ...(tagIds.length > 0
          ? [{ tags: { some: { id: { in: tagIds } } } }]
          : []),
      ],
    },
    select: { id: true, title: true, slug: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });

  return related;
}

/* ── 5. Generate internal link suggestions as HTML ──────────────── */

export function generateInternalLinksHtml(
  relatedArticles: { title: string; slug: string }[]
): string {
  if (relatedArticles.length === 0) return "";

  return `<div class="related-links"><p><strong>Baca Juga:</strong></p><ul>${relatedArticles
    .slice(0, 3)
    .map((a) => `<li><a href="/berita/${a.slug}">${a.title}</a></li>`)
    .join("")}</ul></div>`;
}

/* ── 6. Full SEO automation on publish ─────────────────────────── */

export async function onArticlePublished(slug: string, articleId: string, categoryId: string) {
  // Run all SEO tasks in parallel (non-blocking)
  const articleUrl = `${BASE_URL}/berita/${slug}`;
  const tasks = [
    pingSitemapToSearchEngines().catch(() => null),
    submitUrlToGoogle(slug).catch(() => null),
    purgeCloudflareCache([
      BASE_URL, 
      `${BASE_URL}/`, 
      `${BASE_URL}/berita`, 
      `${BASE_URL}/kategori/${categoryId}`, 
      articleUrl
    ]).catch(() => null),
  ];

  // Get related articles for internal linking data
  const tags = await prisma.article.findUnique({
    where: { id: articleId },
    select: { tags: { select: { id: true } } },
  });
  const tagIds = tags?.tags.map((t) => t.id) || [];

  const related = await getRelatedArticleSuggestions(articleId, categoryId, tagIds);

  // Store related article IDs for display (no content modification)
  if (related.length > 0) {
    // Log the SEO automation
    console.log(`[SEO] Article published: ${slug}, pinged search engines & cleared cache. ${related.length} related articles found`);
  }

  await Promise.allSettled(tasks);

  return { related };
}

/* ── Helpers ───────────────────────────────────────────────────── */

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

async function callDeepSeek(apiKey: string, prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

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
          { role: "system", content: "Kamu asisten SEO untuk media berita hukum Indonesia. Jawab singkat dan langsung." },
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.5,
      }),
    });

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") || "";
  } finally {
    clearTimeout(timeout);
  }
}
