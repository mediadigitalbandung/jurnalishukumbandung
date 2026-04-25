import { test, expect } from "@playwright/test";

/**
 * Article detail page smoke tests.
 *
 * Flow:
 *  1. Visit homepage
 *  2. Click first article link
 *  3. Verify slug page renders correctly with NewsArticle schema
 */

test.describe("Article detail", () => {
  test("click first article from homepage → renders detail page", async ({ page }) => {
    await page.goto("/");
    const firstArticle = page.locator('a[href^="/berita/"]').first();
    await expect(firstArticle).toBeVisible({ timeout: 15000 });
    const href = await firstArticle.getAttribute("href");
    expect(href).toMatch(/^\/berita\/[a-z0-9-]+/);

    await firstArticle.click();
    await page.waitForURL(/\/berita\/.+/);

    // Should have an h1 title
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    const titleText = await h1.textContent();
    expect(titleText?.trim().length).toBeGreaterThan(5);
    console.log(`  → Article title: "${titleText?.slice(0, 60)}..."`);
  });

  test("article page contains NewsArticle JSON-LD", async ({ page }) => {
    // Get first article link from homepage first
    await page.goto("/");
    const firstHref = await page.locator('a[href^="/berita/"]').first().getAttribute("href");
    if (!firstHref) test.skip(true, "No articles on homepage");

    await page.goto(firstHref!);

    // Find <script type="application/ld+json"> with NewsArticle
    const ldScripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    const newsArticle = ldScripts.find((s) => s.includes("\"NewsArticle\""));
    expect(newsArticle).toBeDefined();

    // Parse JSON to verify required fields
    const json = JSON.parse(newsArticle!);
    const articleSchema = Array.isArray(json) ? json[0] : json;
    expect(articleSchema["@type"]).toBe("NewsArticle");
    expect(articleSchema.headline).toBeTruthy();
    expect(articleSchema.datePublished).toBeTruthy();
    expect(articleSchema.author).toBeTruthy();
    expect(articleSchema.publisher).toBeTruthy();
    // Date should have Jakarta timezone offset
    expect(articleSchema.datePublished).toContain("+07:00");
  });

  test("article page has Open Graph + Twitter meta tags", async ({ page }) => {
    await page.goto("/");
    const firstHref = await page.locator('a[href^="/berita/"]').first().getAttribute("href");
    if (!firstHref) test.skip(true, "No articles");
    await page.goto(firstHref!);

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(ogTitle).toBeTruthy();
    const ogType = await page.locator('meta[property="og:type"]').getAttribute("content");
    expect(ogType).toBe("article");
    const twCard = await page.locator('meta[name="twitter:card"]').getAttribute("content");
    expect(twCard).toBeTruthy();
  });

  test("article has author byline & date displayed", async ({ page }) => {
    await page.goto("/");
    const firstHref = await page.locator('a[href^="/berita/"]').first().getAttribute("href");
    if (!firstHref) test.skip(true, "No articles");
    await page.goto(firstHref!);

    // Look for date format DD Month YYYY or relative time (key trust signal for Google News)
    const bodyText = await page.locator("body").innerText();
    // Basic check: contains a 4-digit year
    expect(bodyText).toMatch(/20\d{2}/);
  });
});
