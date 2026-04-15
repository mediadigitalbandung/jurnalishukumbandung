import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com";
const SITE_URL = "https://jurnalishukumbandung.com";

/* ── 0. Load Google credentials (DB first, env fallback) ─────────── */

async function getGoogleCredentials(): Promise<any | null> {
  try {
    // 1. Try DB (admin panel setting)
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "google_credentials_json" },
    });
    if (setting?.value) {
      return JSON.parse(setting.value);
    }

    // 2. Fallback to env var
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      return JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    }

    return null;
  } catch (error) {
    console.error("[SEO] Failed to load Google credentials:", error);
    return null;
  }
}

async function isGoogleIndexingEnabled(): Promise<boolean> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "google_indexing_enabled" },
    });
    // Default enabled if credentials exist
    if (!setting) return true;
    return setting.value === "true";
  } catch {
    return true;
  }
}

/* ── 1. Ping Google & Bing sitemap (both main + news sitemap) ──── */

export async function pingSitemapToSearchEngines() {
  const mainSitemap = encodeURIComponent(`${BASE_URL}/sitemap.xml`);
  const newsSitemap = encodeURIComponent(`${BASE_URL}/news-sitemap.xml`);

  const pings = [
    `https://www.google.com/ping?sitemap=${mainSitemap}`,
    `https://www.google.com/ping?sitemap=${newsSitemap}`,
    `https://www.bing.com/ping?sitemap=${mainSitemap}`,
    `https://www.bing.com/ping?sitemap=${newsSitemap}`,
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

/* ── 2. Submit URL to Google Indexing API + IndexNow ──────────────── */

export async function submitUrlToGoogle(articleSlug: string, categorySlug?: string) {
  const articleUrl = `${BASE_URL}/berita/${articleSlug}`;
  const tasks: Promise<any>[] = [];

  // Google Indexing API — fastest way to get indexed (minutes!)
  const credentials = await getGoogleCredentials();
  const enabled = await isGoogleIndexingEnabled();

  if (credentials && enabled) {
    // Submit article URL
    tasks.push(
      submitToGoogleIndexingApi(articleUrl, credentials)
        .then(r => ({ engine: "google-indexing-api", url: articleUrl, data: r }))
    );
    // Notify Google about homepage update
    tasks.push(
      submitToGoogleIndexingApi(BASE_URL, credentials)
        .then(r => ({ engine: "google-indexing-api", url: BASE_URL, data: r }))
    );
    // Submit sitemaps via Search Console API
    tasks.push(
      submitSitemapToSearchConsole(credentials)
        .then(r => ({ engine: "search-console-sitemap", data: r }))
    );
  }

  // IndexNow — batch submit to Bing, Yandex, Seznam, Naver
  const indexNowUrls = [
    articleUrl,
    BASE_URL,
    `${BASE_URL}/berita`,
    ...(categorySlug ? [`${BASE_URL}/kategori/${categorySlug}`] : []),
  ];
  tasks.push(submitToIndexNow(indexNowUrls));

  const results = await Promise.allSettled(tasks);
  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { engine: "unknown", status: 0 }
  );
}

/** Google Indexing API — submit single URL for instant indexing */
async function submitToGoogleIndexingApi(url: string, credentials: any) {
  try {
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

    console.log(`[SEO] Google Indexing API submitted: ${url}`);
    return res.data;
  } catch (error) {
    console.error(`[SEO] Google Indexing API Error for ${url}:`, error);
    return null;
  }
}

/** Google Search Console API — submit sitemaps programmatically */
export async function submitSitemapToSearchConsole(credentials?: any) {
  try {
    const creds = credentials || await getGoogleCredentials();
    if (!creds) return { error: "No credentials" };

    const { google } = await import("googleapis");
    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/webmasters"],
    });

    const searchConsole = google.searchconsole({ version: "v1", auth });

    const sitemaps = [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/news-sitemap.xml`,
    ];

    const results = await Promise.allSettled(
      sitemaps.map(async (sitemapUrl) => {
        await searchConsole.sitemaps.submit({
          siteUrl: SITE_URL,
          feedpath: sitemapUrl,
        });
        console.log(`[SEO] Search Console: sitemap submitted — ${sitemapUrl}`);
        return { sitemap: sitemapUrl, status: "submitted" };
      })
    );

    return results.map((r) =>
      r.status === "fulfilled" ? r.value : { sitemap: "unknown", status: "error", error: String(r.reason) }
    );
  } catch (error) {
    console.error("[SEO] Search Console sitemap submit error:", error);
    return { error: String(error) };
  }
}

/** Test Google credentials — validate auth works */
export async function testGoogleCredentials(credentialsJson: string): Promise<{
  valid: boolean;
  email?: string;
  indexingApi: boolean;
  searchConsole: boolean;
  error?: string;
}> {
  try {
    const credentials = JSON.parse(credentialsJson);
    if (!credentials.client_email || !credentials.private_key) {
      return { valid: false, indexingApi: false, searchConsole: false, error: "Missing client_email or private_key" };
    }

    const { google } = await import("googleapis");

    // Test Indexing API
    let indexingApi = false;
    try {
      const authIndexing = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/indexing"],
      });
      await authIndexing.authorize();
      indexingApi = true;
    } catch { /* Indexing API not enabled */ }

    // Test Search Console API
    let searchConsole = false;
    try {
      const authSC = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/webmasters"],
      });
      await authSC.authorize();
      searchConsole = true;
    } catch { /* Search Console not enabled */ }

    return {
      valid: indexingApi || searchConsole,
      email: credentials.client_email,
      indexingApi,
      searchConsole,
    };
  } catch (error) {
    return { valid: false, indexingApi: false, searchConsole: false, error: "Invalid JSON format" };
  }
}

/** IndexNow — instant indexing for Bing, Yandex, Seznam, Naver */
async function submitToIndexNow(urls: string[]) {
  const key = "jurnalishukumbandung";
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "jurnalishukumbandung.com",
        key,
        keyLocation: `${BASE_URL}/${key}.txt`,
        urlList: urls,
      }),
    });
    console.log(`[SEO] IndexNow submitted ${urls.length} URLs, status: ${res.status}`);
    return { engine: "indexnow", status: res.status, urls: urls.length };
  } catch (error) {
    console.error("[SEO] IndexNow Error:", error);
    return { engine: "indexnow", status: 0 };
  }
}

/* ── 2.5 Full SEO re-ping (for cron) ──────────────────────────────── */

export async function runFullSeoPing() {
  const credentials = await getGoogleCredentials();
  const enabled = await isGoogleIndexingEnabled();

  const tasks: Promise<any>[] = [
    pingSitemapToSearchEngines().catch(() => null),
    submitToIndexNow([
      BASE_URL,
      `${BASE_URL}/berita`,
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/news-sitemap.xml`,
    ]).catch(() => null),
  ];

  if (credentials && enabled) {
    tasks.push(submitSitemapToSearchConsole(credentials).catch(() => null));
  }

  const results = await Promise.allSettled(tasks);
  console.log(`[SEO CRON] Full re-ping completed. ${results.length} tasks.`);
  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { error: String(r.reason) }
  );
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
  // Resolve category slug for IndexNow
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { slug: true },
  });
  const categorySlug = category?.slug;

  // Run all SEO tasks in parallel (non-blocking)
  const articleUrl = `${BASE_URL}/berita/${slug}`;
  const tasks = [
    pingSitemapToSearchEngines().catch(() => null),
    submitUrlToGoogle(slug, categorySlug).catch(() => null),
    purgeCloudflareCache([
      BASE_URL,
      `${BASE_URL}/`,
      `${BASE_URL}/berita`,
      ...(categorySlug ? [`${BASE_URL}/kategori/${categorySlug}`] : []),
      articleUrl,
      // Also purge sitemaps so crawlers get fresh data
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/news-sitemap.xml`,
      `${BASE_URL}/feed.xml`,
    ]).catch(() => null),
  ];

  // Get related articles for internal linking data
  const tags = await prisma.article.findUnique({
    where: { id: articleId },
    select: { tags: { select: { id: true } } },
  });
  const tagIds = tags?.tags.map((t) => t.id) || [];

  const related = await getRelatedArticleSuggestions(articleId, categoryId, tagIds);

  console.log(`[SEO] Article published: ${slug}, submitting to Google Indexing API + IndexNow + ping sitemaps + purge cache. ${related.length} related articles found`);

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
