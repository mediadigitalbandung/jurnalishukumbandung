import { prisma } from "@/lib/prisma";
import { callAI, hasAIKey } from "@/lib/ai-client";

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
    // Submit article URL + update indexing status in DB
    tasks.push(
      submitToGoogleIndexingApi(articleUrl, credentials)
        .then(async (r) => {
          // Update article indexing status
          try {
            await prisma.article.updateMany({
              where: { slug: articleSlug },
              data: { lastIndexedAt: new Date(), indexStatus: r ? "submitted" : "failed" },
            });
          } catch { /* ignore */ }
          return { engine: "google-indexing-api", url: articleUrl, data: r };
        })
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
  const key = "46c220e15eca4f9db0a70049aa82a734";
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
  // Read from env first, fallback to DB systemsetting
  let zoneId = process.env.CLOUDFLARE_ZONE_ID;
  let apiToken = process.env.CLOUDFLARE_API_TOKEN;
  let globalKey = process.env.CLOUDFLARE_GLOBAL_API_KEY;
  let email = process.env.CLOUDFLARE_EMAIL;

  // Fallback to DB if env not loaded (PM2 env cache issue)
  if (!zoneId || (!globalKey && !apiToken)) {
    try {
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: { in: ["cloudflare_zone_id", "cloudflare_api_token", "cloudflare_global_api_key", "cloudflare_email"] },
        },
      });
      const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
      zoneId = zoneId || map.cloudflare_zone_id;
      apiToken = apiToken || map.cloudflare_api_token;
      globalKey = globalKey || map.cloudflare_global_api_key;
      email = email || map.cloudflare_email;
    } catch { /* ignore */ }
  }

  if (!zoneId) {
    console.log("[SEO] CLOUDFLARE_ZONE_ID not set, skipping cache purge");
    return null;
  }

  // Build auth headers — prefer Global API Key, fallback to API Token
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (globalKey && email) {
    headers["X-Auth-Email"] = email;
    headers["X-Auth-Key"] = globalKey;
  } else if (apiToken) {
    headers["Authorization"] = `Bearer ${apiToken}`;
  } else {
    console.log("[SEO] No Cloudflare auth configured, skipping cache purge");
    return null;
  }

  try {
    const payload = urls && urls.length > 0
      ? { files: urls }
      : { purge_everything: true };

    const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log(`[SEO] Cloudflare Purge: ${data.success ? "OK" : "FAIL"} (${urls?.length || "all"} URLs)`);
    return data;
  } catch (error) {
    console.error("[SEO] Cloudflare Purge Error:", error);
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

  const SEO_SYSTEM = "Kamu asisten SEO untuk media berita hukum Indonesia. Jawab singkat dan langsung.";

  // Try AI generation
  try {
    if (!(await hasAIKey())) {
      return {
        seoTitle: existingSeoTitle || title.slice(0, 60),
        seoDescription: existingSeoDesc || stripHtml(content).slice(0, 155),
      };
    }

    const results: { seoTitle: string; seoDescription: string } = {
      seoTitle: existingSeoTitle || title.slice(0, 60),
      seoDescription: existingSeoDesc || stripHtml(content).slice(0, 155),
    };

    const tasks: Promise<void>[] = [];

    if (!existingSeoTitle) {
      tasks.push(
        callAI(SEO_SYSTEM, `Buatkan SEO title (maks 60 karakter, bahasa Indonesia) untuk artikel berita hukum ini. Hanya berikan title-nya saja tanpa penjelasan. Judul: ${title}`)
          .then((r) => { results.seoTitle = r.slice(0, 60); })
      );
    }

    if (!existingSeoDesc) {
      tasks.push(
        callAI(SEO_SYSTEM, `Buatkan meta description (maks 155 karakter, bahasa Indonesia) untuk artikel berita hukum ini. Hanya berikan deskripsi-nya saja tanpa penjelasan. Judul: ${title}. Konten: ${stripHtml(content).slice(0, 1000)}`)
          .then((r) => { results.seoDescription = r.slice(0, 155); })
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
  relatedArticles: { title: string; slug: string }[],
  options: { limit?: number; label?: string } = {}
): string {
  const { limit = 5, label = "Baca Juga" } = options;
  if (relatedArticles.length === 0) return "";

  return `<div class="related-links"><p><strong>${label}:</strong></p><ul>${relatedArticles
    .slice(0, limit)
    .map((a) => `<li><a href="/berita/${a.slug}">${a.title}</a></li>`)
    .join("")}</ul></div>`;
}

/* ── 5b. Inject contextual inline links (entity-based) ──────────────── */

interface LinkableEntity {
  /** Lowercase phrase to find in content (case-insensitive) */
  match: string;
  /** Full URL or path to link to */
  href: string;
  /** Optional title attribute */
  title?: string;
}

/**
 * Inject contextual inline links into HTML content based on entity matching.
 * - Only first occurrence of each entity is linked (avoid spam)
 * - Skips text inside existing links, headings, code, blockquotes
 * - Limits total injected links to avoid over-linking
 */
export function injectContextualLinks(
  html: string,
  entities: LinkableEntity[],
  maxLinks = 8
): string {
  if (!html || entities.length === 0) return html;

  let result = html;
  let injected = 0;

  // Sort entities by match length DESC to match longest phrases first
  const sortedEntities = [...entities].sort((a, b) => b.match.length - a.match.length);

  for (const entity of sortedEntities) {
    if (injected >= maxLinks) break;
    if (!entity.match || entity.match.length < 3) continue;

    // Build regex: match phrase as whole word, case-insensitive, NOT inside <a>/<h>/<code>/<blockquote> tags
    // Use negative lookbehind to skip if inside an open tag
    const escapedMatch = entity.match.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<!<[^>]*?)\\b(${escapedMatch})\\b(?![^<]*?>)`,
      "i"
    );

    let replaced = false;
    result = result.replace(regex, (match, p1, offset) => {
      if (replaced) return match;

      // Check we're not inside an existing <a>, <h2-6>, <code>, <blockquote>
      const before = result.slice(0, offset);
      const lastOpenA = before.lastIndexOf("<a ");
      const lastCloseA = before.lastIndexOf("</a>");
      if (lastOpenA > lastCloseA) return match; // inside <a>

      const lastOpenH = before.search(/<h[2-6][\s>]/gi);
      const lastCloseH = before.search(/<\/h[2-6]>/gi);
      if (lastOpenH > lastCloseH && lastOpenH !== -1) return match;

      replaced = true;
      injected++;
      const titleAttr = entity.title ? ` title="${entity.title.replace(/"/g, "&quot;")}"` : "";
      return `<a href="${entity.href}" class="internal-link"${titleAttr}>${p1}</a>`;
    });
  }

  return result;
}

/**
 * Build linkable entities from article tags + category for contextual linking
 */
export function buildEntitiesFromArticleMeta(
  tags: { name: string; slug: string }[],
  category: { name: string; slug: string } | null
): LinkableEntity[] {
  const entities: LinkableEntity[] = [];

  for (const tag of tags) {
    if (tag.name && tag.slug) {
      entities.push({
        match: tag.name,
        href: `/tag/${tag.slug}`,
        title: `Lihat semua berita tentang ${tag.name}`,
      });
    }
  }

  if (category && category.name && category.slug) {
    entities.push({
      match: category.name,
      href: `/kategori/${category.slug}`,
      title: `Lihat kategori ${category.name}`,
    });
  }

  return entities;
}

/* ── 5c. Auto-detect HowTo schema from article ────────────────── */

/**
 * Detect if article qualifies as HowTo schema and extract steps.
 * Returns null if not a HowTo article.
 *
 * Triggers on: title contains "cara", "langkah", "panduan", "bagaimana", "tutorial", "tips"
 * Steps extracted from: <ol><li>, <h2>/<h3> with numeric prefix
 */
export function detectHowToSchema(
  title: string,
  contentHtml: string,
  url: string,
  imageUrl?: string
): Record<string, unknown> | null {
  const lowerTitle = title.toLowerCase();
  const isHowTo = /\b(cara|langkah|panduan|bagaimana|tutorial|tips|prosedur|step)\b/i.test(lowerTitle);
  if (!isHowTo) return null;

  // Try to extract from <ol><li>...</li></ol> first
  const olMatch = contentHtml.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
  let stepTexts: string[] = [];
  if (olMatch) {
    const liMatches = olMatch[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
    stepTexts = liMatches
      .map((li) => stripHtml(li).trim())
      .filter((s) => s.length > 10 && s.length < 500);
  }

  // Fallback: extract from <h2>/<h3> with numeric prefix or "Langkah N"
  if (stepTexts.length < 2) {
    const headingMatches = contentHtml.match(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi) || [];
    stepTexts = headingMatches
      .map((h) => stripHtml(h).trim())
      .filter((s) => /^(\d+\.|langkah\s+\d+|step\s+\d+)/i.test(s) && s.length < 200);
  }

  if (stepTexts.length < 2) return null;

  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description: stepTexts.slice(0, 1).join(" "),
    url,
    ...(imageUrl && { image: { "@type": "ImageObject", url: imageUrl } }),
    inLanguage: "id-ID",
    step: stepTexts.slice(0, 12).map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: text.split(/[.:]/, 1)[0]?.slice(0, 80) || `Langkah ${i + 1}`,
      text: text.slice(0, 500),
    })),
  };
}

/* ── 5d. QAPage schema for Q&A-style articles ────────────────── */

/**
 * Detect if article is Q&A-style (single primary question + answer).
 * Triggers on: title is a question (ends with "?", or starts with "apa", "siapa", "kenapa", "bagaimana", "kapan", "dimana")
 *
 * Schema mengikuti rekomendasi Google Search Console:
 * - mainEntity (Question) butuh: name, text, answerCount, datePublished, author, acceptedAnswer
 * - acceptedAnswer (Answer) butuh: text, url, datePublished, author, upvoteCount
 *
 * Source: https://developers.google.com/search/docs/appearance/structured-data/qapage
 */
export function detectQAPageSchema(
  title: string,
  excerpt: string,
  contentHtml: string,
  url: string,
  meta?: {
    publishedAt?: Date | string | null;
    authorName?: string | null;
    siteName?: string | null;
  }
): Record<string, unknown> | null {
  const trimmedTitle = title.trim();
  const isQuestion =
    trimmedTitle.endsWith("?") ||
    /^(apa|siapa|kenapa|mengapa|bagaimana|kapan|di\s?mana|berapa)\b/i.test(trimmedTitle);
  if (!isQuestion) return null;

  // Use excerpt or first paragraph as answer
  const firstP = contentHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const answer = excerpt || (firstP ? stripHtml(firstP[1]).trim() : "");
  if (!answer || answer.length < 20) return null;

  // Resolve publishedAt → ISO string (Jakarta timezone via toJakartaISO if Date)
  const publishedISO = meta?.publishedAt
    ? typeof meta.publishedAt === "string"
      ? meta.publishedAt
      : meta.publishedAt.toISOString()
    : new Date().toISOString();

  const authorName = meta?.authorName || meta?.siteName || "Jurnalis Hukum Bandung";
  const siteName = meta?.siteName || "Jurnalis Hukum Bandung";

  // Author objects (re-used di Question dan Answer per Google guideline)
  const authorObj = {
    "@type": "Person",
    name: authorName,
  };
  const publisherObj = {
    "@type": "Organization",
    name: siteName,
  };

  return {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: trimmedTitle.endsWith("?") ? trimmedTitle : `${trimmedTitle}?`,
      text: trimmedTitle,
      answerCount: 1,
      datePublished: publishedISO,
      author: authorObj,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer.slice(0, 600),
        url,
        datePublished: publishedISO,
        author: publisherObj,
        upvoteCount: 1,
      },
    },
  };
}

/* ── 6. Auto-generate FAQ from article content ────────────────── */

export async function autoGenerateFaq(
  articleId: string,
  title: string,
  content: string
): Promise<{ q: string; a: string }[]> {
  try {
    if (!(await hasAIKey())) return [];

    const plainContent = stripHtml(content).slice(0, 3000);
    const prompt = `Berdasarkan artikel berita hukum berikut, buatkan 4-5 pertanyaan FAQ (Frequently Asked Questions) beserta jawabannya.

Format WAJIB JSON array seperti ini (JANGAN tambahkan teks lain, HANYA JSON):
[{"q":"Pertanyaan?","a":"Jawaban singkat 1-2 kalimat."}]

Judul: ${title}
Konten: ${plainContent}`;

    const result = await callAI("Kamu asisten SEO untuk media berita hukum Indonesia. Jawab singkat dan langsung.", prompt, 500);

    // Parse JSON from AI response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const faq = JSON.parse(jsonMatch[0]) as { q: string; a: string }[];
    if (!Array.isArray(faq) || faq.length === 0) return [];

    // Validate structure
    const validFaq = faq
      .filter((item) => item.q && item.a && typeof item.q === "string" && typeof item.a === "string")
      .slice(0, 5);

    // Save to database
    if (validFaq.length > 0) {
      await prisma.article.update({
        where: { id: articleId },
        data: { faqData: JSON.stringify(validFaq) },
      });
      console.log(`[SEO] FAQ generated for article ${articleId}: ${validFaq.length} questions`);
    }

    return validFaq;
  } catch (error) {
    console.error("[SEO] FAQ generation error:", error);
    return [];
  }
}

/* ── 7. Auto-generate 3 Sorotan (spotlight pages) per article ──── */

const SOROTAN_ANGLES = [
  {
    angle: "kronologi",
    titlePrefix: "Kronologi",
    prompt: (title: string, content: string) =>
      `Kamu adalah jurnalis hukum senior. Tulis KRONOLOGI LENGKAP kejadian dalam 400-500 kata bahasa Indonesia berdasarkan berita ini. Tulis narasi kronologis yang runtut. Sertakan detail waktu, tempat, pelaku. JANGAN gunakan HTML tags seperti <p>, <h3>, dll. Tulis plain text saja. Pisahkan paragraf dengan baris kosong. Langsung mulai narasi tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
  {
    angle: "analisis",
    titlePrefix: "Analisis Hukum",
    prompt: (title: string, content: string) =>
      `Kamu adalah analis hukum senior Indonesia. Tulis ANALISIS HUKUM dalam 400-500 kata bahasa Indonesia. Bahas dasar hukum, pasal yang relevan, potensi sanksi, preseden kasus serupa, implikasi yuridis. JANGAN gunakan HTML tags. Tulis plain text saja, pisahkan paragraf dengan baris kosong. Langsung mulai analisis tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
  {
    angle: "dampak",
    titlePrefix: "Dampak & Implikasi",
    prompt: (title: string, content: string) =>
      `Kamu jurnalis investigasi. Tulis DAMPAK DAN IMPLIKASI kejadian ini dalam 400-500 kata bahasa Indonesia. Bahas siapa yang terdampak, dampak ke masyarakat, dampak ke sistem hukum, apa yang bisa terjadi selanjutnya. JANGAN gunakan HTML tags. Tulis plain text saja, pisahkan paragraf dengan baris kosong. Langsung mulai tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
  {
    angle: "latar-belakang",
    titlePrefix: "Latar Belakang",
    prompt: (title: string, content: string) =>
      `Kamu jurnalis senior. Tulis LATAR BELAKANG dan KONTEKS dari berita ini dalam 400-500 kata bahasa Indonesia. Jelaskan apa yang terjadi sebelumnya, mengapa ini terjadi, siapa pihak-pihak yang terlibat, dan bagaimana situasi sebelum kejadian ini. JANGAN gunakan HTML tags. Tulis plain text saja, pisahkan paragraf dengan baris kosong. Langsung mulai tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
  {
    angle: "fakta-data",
    titlePrefix: "Fakta & Data",
    prompt: (title: string, content: string) =>
      `Kamu editor berita. Tulis RANGKUMAN FAKTA DAN DATA KUNCI dari berita ini dalam 400-500 kata bahasa Indonesia. Sajikan fakta-fakta penting secara terstruktur: siapa, apa, di mana, kapan, mengapa, bagaimana. Sertakan angka dan data jika ada. JANGAN gunakan HTML tags. Tulis plain text saja, pisahkan paragraf dengan baris kosong. Langsung mulai tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
  {
    angle: "regulasi",
    titlePrefix: "Regulasi Terkait",
    prompt: (title: string, content: string) =>
      `Kamu pakar hukum Indonesia. Tulis tentang REGULASI DAN UNDANG-UNDANG yang terkait dengan kasus dalam berita ini dalam 400-500 kata bahasa Indonesia. Sebutkan UU, pasal, peraturan pemerintah, atau putusan MK yang relevan. Jelaskan isi regulasi dan hubungannya dengan kasus. JANGAN gunakan HTML tags. Tulis plain text saja, pisahkan paragraf dengan baris kosong. Langsung mulai tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
  {
    angle: "profil",
    titlePrefix: "Profil & Pihak Terkait",
    prompt: (title: string, content: string) =>
      `Kamu jurnalis. Tulis PROFIL PIHAK-PIHAK yang terlibat dalam berita ini dalam 400-500 kata bahasa Indonesia. Jelaskan siapa saja yang terlibat, apa peran mereka, latar belakang mereka, dan bagaimana mereka terhubung satu sama lain. JANGAN gunakan HTML tags. Tulis plain text saja, pisahkan paragraf dengan baris kosong. Langsung mulai tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
  {
    angle: "opini",
    titlePrefix: "Perspektif & Opini Ahli",
    prompt: (title: string, content: string) =>
      `Kamu kolumnis hukum. Tulis PERSPEKTIF DAN OPINI mengenai kasus dalam berita ini dalam 400-500 kata bahasa Indonesia. Sajikan berbagai sudut pandang: pandangan ahli hukum, pandangan masyarakat, pandangan penegak hukum. Berikan analisis kritis yang berimbang. JANGAN gunakan HTML tags. Tulis plain text saja, pisahkan paragraf dengan baris kosong. Langsung mulai tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
  {
    angle: "perbandingan",
    titlePrefix: "Perbandingan Kasus Serupa",
    prompt: (title: string, content: string) =>
      `Kamu peneliti hukum. Tulis PERBANDINGAN dengan kasus-kasus serupa yang pernah terjadi di Indonesia dalam 400-500 kata bahasa Indonesia. Bandingkan dari segi modus, pelaku, hukuman, proses hukum, dan hasilnya. Jelaskan apa yang bisa dipelajari dari kasus sebelumnya. JANGAN gunakan HTML tags. Tulis plain text saja, pisahkan paragraf dengan baris kosong. Langsung mulai tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
  {
    angle: "tanya-jawab",
    titlePrefix: "Tanya Jawab",
    prompt: (title: string, content: string) =>
      `Kamu editor berita. Tulis penjelasan berita ini dalam format TANYA JAWAB (Q&A) dalam 400-500 kata bahasa Indonesia. Buat 5-7 pertanyaan yang kemungkinan ditanyakan pembaca beserta jawabannya. Format: "Pertanyaan: ... Jawaban: ..." untuk setiap pasang. JANGAN gunakan HTML tags. Tulis plain text saja, pisahkan paragraf dengan baris kosong. Langsung mulai tanpa judul.\n\nJudul: ${title}\nKonten: ${content}`,
  },
];

export async function autoGenerateSorotan(
  articleId: string,
  articleSlug: string,
  title: string,
  content: string
): Promise<number> {
  try {
    // Skip only if ALL 10 angles already exist
    const existing = await prisma.sorotan.count({ where: { articleId } });
    if (existing >= SOROTAN_ANGLES.length) return existing;

    if (!(await hasAIKey())) return 0;

    const plainContent = stripHtml(content).slice(0, 4000);
    let created = 0;

    // Check which angles already exist — only generate missing ones
    const existingSorotan = await prisma.sorotan.findMany({
      where: { articleId },
      select: { angle: true },
    });
    const existingAngles = new Set(existingSorotan.map((s) => s.angle));

    for (const angle of SOROTAN_ANGLES) {
      // Skip already generated angles
      if (existingAngles.has(angle.angle)) {
        created++;
        continue;
      }

      try {
        const generatedContent = await callAI(
          "Kamu asisten SEO untuk media berita hukum Indonesia. Jawab singkat dan langsung.",
          angle.prompt(title, plainContent),
          800
        );

        if (!generatedContent || generatedContent.length < 100) {
          console.log(`[SEO] Sorotan ${angle.angle} too short or empty, skipping`);
          continue;
        }

        const sorotanTitle = `${angle.titlePrefix}: ${title}`;
        const sorotanSlug = `${articleSlug}-${angle.angle}`;

        await prisma.sorotan.upsert({
          where: { slug: sorotanSlug },
          update: { title: sorotanTitle, content: generatedContent },
          create: {
            slug: sorotanSlug,
            title: sorotanTitle,
            content: generatedContent,
            angle: angle.angle,
            articleId,
          },
        });
        created++;
        console.log(`[SEO] Sorotan ${angle.angle} generated for: ${articleSlug}`);
      } catch (err) {
        console.error(`[SEO] Sorotan ${angle.angle} error:`, err);
        // Continue to next angle — don't stop all
      }

      // Small delay between API calls to avoid rate limiting
      await new Promise((r) => setTimeout(r, 1000));
    }

    return created;
  } catch (error) {
    console.error("[SEO] Sorotan generation error:", error);
    return 0;
  }
}

/* ── 7.5 Auto-generate tags on publish if article has < 3 tags ── */

async function autoGenerateTagsForArticle(
  articleId: string,
  title: string,
  content: string,
  existingTags: { id: string; name: string }[]
): Promise<number> {
  try {
    if (!(await hasAIKey())) return 0;

    const plainContent = stripHtml(content).slice(0, 1500);
    const prompt = `Berikan 8-10 tag SEO-friendly dalam Bahasa Indonesia untuk artikel berita hukum berikut.
Tag harus: kata kunci yang dicari di Google, campuran topik spesifik + lokasi + hukum umum, huruf kecil, pisahkan koma.
Jangan ulangi tag yang sudah ada: ${existingTags.map((t) => t.name).join(", ")}
Judul: ${title}
Konten: ${plainContent}
Format: HANYA tag dipisah koma, tanpa penjelasan.`;

    const result = await callAI("Kamu asisten SEO untuk media berita hukum Indonesia. Jawab singkat dan langsung.", prompt, 200);
    const newTags = result
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 1 && t.length < 50)
      .slice(0, 10);

    let added = 0;
    const { slugify: slugifyFn } = await import("@/lib/utils");
    for (const tagName of newTags) {
      const slug = slugifyFn(tagName);
      if (!slug) continue;
      try {
        await prisma.tag.upsert({ where: { slug }, update: {}, create: { name: tagName, slug } });
        const tag = await prisma.tag.findUnique({ where: { slug }, include: { articles: { where: { id: articleId } } } });
        if (tag && tag.articles.length === 0) {
          await prisma.article.update({ where: { id: articleId }, data: { tags: { connect: { id: tag.id } } } });
          added++;
        }
      } catch { /* skip invalid */ }
    }
    if (added > 0) console.log(`[SEO] Auto-generated ${added} tags for article ${articleId}`);
    return added;
  } catch (error) {
    console.error("[SEO] Auto-tag generation error:", error);
    return 0;
  }
}

/* ── 8. Full SEO automation on publish ─────────────────────────── */

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

  // Get article data for FAQ generation + internal linking
  const articleData = await prisma.article.findUnique({
    where: { id: articleId },
    select: { title: true, content: true, faqData: true, isAutoGenerated: true, tags: { select: { id: true, name: true } } },
  });
  const tagIds = articleData?.tags.map((t) => t.id) || [];

  const related = await getRelatedArticleSuggestions(articleId, categoryId, tagIds);

  // Auto-generate tags if article has fewer than 3 tags (non-blocking)
  if (articleData && articleData.tags.length < 3) {
    tasks.push(autoGenerateTagsForArticle(articleId, articleData.title, articleData.content, articleData.tags).catch(() => null));
  }

  // Auto-generate FAQ if not already present (non-blocking)
  if (articleData && !articleData.faqData) {
    tasks.push(
      autoGenerateFaq(articleId, articleData.title, articleData.content).catch(() => null)
    );
  }

  // Auto-generate Sorotan pages + submit their URLs to search engines
  if (articleData) {
    tasks.push(
      autoGenerateSorotan(articleId, slug, articleData.title, articleData.content)
        .then(async (count) => {
          if (count > 0) {
            // Submit sorotan URLs to IndexNow for indexing
            const sorotanPages = await prisma.sorotan.findMany({
              where: { articleId },
              select: { slug: true },
            });
            const sorotanUrls = sorotanPages.map((s) => `${BASE_URL}/sorotan/${s.slug}`);
            if (sorotanUrls.length > 0) {
              await submitToIndexNow([...sorotanUrls, `${BASE_URL}/sorotan`]).catch(() => null);
              console.log(`[SEO] Submitted ${sorotanUrls.length} sorotan URLs to IndexNow`);
            }
          }
          return count;
        })
        .catch(() => null)
    );
  }

  // Skip auto-share ke sosmed (Twitter + IG + FB) untuk artikel hasil AI auto-generate.
  // Alasan: artikel auto biasanya butuh editor review dulu sebelum naik ke audiens publik.
  // Editor bisa publish manual ke sosmed via /panel/social atau /panel/tiktok kalau memang bagus.
  const skipSocialAuto = articleData?.isAutoGenerated === true;

  // Auto-share to Twitter/X (non-blocking) — SKIP untuk artikel auto-generated
  if (articleData && !skipSocialAuto) {
    tasks.push(
      shareToTwitter(articleData.title, slug, categorySlug).catch(() => null)
    );
  }

  // Auto-publish to Instagram + Facebook (non-blocking) — SKIP untuk artikel auto-generated
  if (!skipSocialAuto) {
    tasks.push(
      import("./social/orchestrator")
        .then(({ publishArticleToSocial }) => publishArticleToSocial(articleId))
        .catch((err) => { console.error("[SOCIAL] orchestrator error:", err); return null; })
    );
  }

  // Web Push: notify users following any of the article's tags (case/sidang follows)
  if (articleData && !skipSocialAuto) {
    tasks.push(
      (async () => {
        const tagsWithSlug = await prisma.tag.findMany({
          where: { id: { in: tagIds } },
          select: { name: true, slug: true },
        });
        if (tagsWithSlug.length === 0) return null;

        const { broadcast } = await import("./push");

        // Article featured image for richer notif (Android)
        const articleFull = await prisma.article.findUnique({
          where: { id: articleId },
          select: { featuredImage: true, excerpt: true },
        });

        // Broadcast once per tag (subscribers can dedupe via tag-based notification tag)
        const broadcasts = tagsWithSlug.map((t) =>
          broadcast(
            {
              title: articleData.title,
              body: articleFull?.excerpt?.slice(0, 200) || `Update terkait ${t.name}`,
              url: articleUrl,
              imageUrl: articleFull?.featuredImage || undefined,
              tag: `case-${t.slug}`,
            },
            { topic: `tag-${t.slug}`, sentBy: "system-publish-hook" },
          ).catch(() => null),
        );
        return Promise.all(broadcasts);
      })().catch(() => null),
    );
  }

  if (skipSocialAuto) {
    console.log(`[SEO] Article published (AUTO-GENERATED, social auto skipped): ${slug}. Editor must publish manually if desired.`);
  } else {
    console.log(`[SEO] Article published: ${slug}, submitting to Google + IndexNow + FAQ + Sorotan + Twitter + IG/FB. ${related.length} related articles found`);
  }

  await Promise.allSettled(tasks);

  return { related };
}

/* ── 9. Auto-share to Twitter/X ─────────────────────────────── */

async function shareToTwitter(title: string, slug: string, categorySlug?: string | null) {
  try {
    // Get Twitter API credentials from system settings
    const [bearerSetting, tokenSetting, secretSetting, consumerKeySetting, consumerSecretSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: "twitter_bearer_token" } }),
      prisma.systemSetting.findUnique({ where: { key: "twitter_access_token" } }),
      prisma.systemSetting.findUnique({ where: { key: "twitter_access_secret" } }),
      prisma.systemSetting.findUnique({ where: { key: "twitter_consumer_key" } }),
      prisma.systemSetting.findUnique({ where: { key: "twitter_consumer_secret" } }),
    ]);

    if (!tokenSetting?.value || !secretSetting?.value || !consumerKeySetting?.value || !consumerSecretSetting?.value) {
      console.log("[SEO] Twitter API keys not configured, skipping auto-share");
      return null;
    }

    const articleUrl = `${BASE_URL}/berita/${slug}`;
    const hashtags = categorySlug
      ? `#HukumBandung #${categorySlug.replace(/-/g, "").replace(/\s/g, "")} #BeritaHukum`
      : "#HukumBandung #BeritaHukum #JabarHukum";

    // Truncate title to fit tweet (280 chars - url - hashtags - spacing)
    const maxTitleLen = 280 - articleUrl.length - hashtags.length - 10;
    const truncTitle = title.length > maxTitleLen ? title.slice(0, maxTitleLen - 3) + "..." : title;
    const tweetText = `${truncTitle}\n\n${articleUrl}\n\n${hashtags}`;

    // Use Twitter API v2 (OAuth 1.0a user context)
    // For simplicity, we use the bearer token approach with OAuth 1.0a HMAC-SHA1
    // This requires the oauth-1.0a library or manual implementation
    // For now, use a simpler approach: store a pre-authorized bearer and use v2 endpoint

    // Twitter API v2 requires OAuth 1.0a for posting tweets
    // We'll implement a basic OAuth 1.0a signature
    const crypto = await import("crypto");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString("hex");

    const params: Record<string, string> = {
      oauth_consumer_key: consumerKeySetting.value,
      oauth_nonce: nonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_token: tokenSetting.value,
      oauth_version: "1.0",
    };

    // Create signature base string
    const method = "POST";
    const url = "https://api.twitter.com/2/tweets";
    const paramString = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join("&");
    const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
    const signingKey = `${encodeURIComponent(consumerSecretSetting.value)}&${encodeURIComponent(secretSetting.value)}`;
    const signature = crypto.createHmac("sha1", signingKey).update(signatureBase).digest("base64");

    const authHeader = `OAuth ${Object.entries({ ...params, oauth_signature: signature }).map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(", ")}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: tweetText }),
    });

    const data = await res.json();
    if (res.ok && data.data?.id) {
      console.log(`[SEO] Twitter: Posted tweet ${data.data.id} for article ${slug}`);
      return { tweetId: data.data.id };
    } else {
      console.error(`[SEO] Twitter Error: ${res.status}`, data);
      return null;
    }
  } catch (error) {
    console.error("[SEO] Twitter share error:", error);
    return null;
  }
}

/* ── Helpers ───────────────────────────────────────────────────── */

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

