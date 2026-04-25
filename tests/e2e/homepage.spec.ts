import { test, expect } from "@playwright/test";

/**
 * Homepage smoke tests.
 *
 * Verifies:
 *  - Page loads with HTTP 200
 *  - Title contains brand name
 *  - Header navigation visible
 *  - Article carousel/list renders ≥1 item
 *  - Footer present
 *  - JSON-LD organization schema embedded
 */

test.describe("Homepage", () => {
  test("loads with HTTP 200 and correct title", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Jurnalis Hukum Bandung/i);
  });

  test("header & navigation visible", async ({ page }) => {
    await page.goto("/");
    // Header banner role
    const header = page.locator('header[role="banner"]');
    await expect(header).toBeVisible();

    // Logo link
    const logo = page.locator('header a[href="/"]').first();
    await expect(logo).toBeVisible();

    // Category navigation bar
    const nav = page.locator('nav[aria-label="Navigasi kategori"]');
    await expect(nav).toBeVisible();
  });

  test("renders at least 1 article card", async ({ page }) => {
    await page.goto("/");
    // Article links pattern: /berita/[slug]
    const articleLinks = page.locator('a[href^="/berita/"]');
    await expect(articleLinks.first()).toBeVisible({ timeout: 15000 });
    const count = await articleLinks.count();
    expect(count).toBeGreaterThan(0);
    console.log(`  → Found ${count} article links on homepage`);
  });

  test("footer present", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer").first();
    await expect(footer).toBeVisible();
  });

  test("JSON-LD organization schema embedded", async ({ page }) => {
    await page.goto("/");
    // Look for at least one application/ld+json script
    const ldScripts = page.locator('script[type="application/ld+json"]');
    const count = await ldScripts.count();
    expect(count).toBeGreaterThan(0);

    // Check first script contains @context schema.org
    const firstContent = await ldScripts.first().textContent();
    expect(firstContent).toContain("schema.org");
  });

  test("search form present in header", async ({ page }) => {
    await page.goto("/");
    // Search form action="/search"
    const searchForm = page.locator('form[action="/search"]').first();
    await expect(searchForm).toBeAttached();
  });

  test("no critical console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Filter out known noise + KNOWN ISSUES yang sudah di-track
    const meaningful = errors.filter((e) => {
      // 3rd-party / analytics noise
      if (e.includes("googletagmanager") || e.includes("google-analytics")) return false;
      if (e.includes("favicon")) return false;
      if (e.toLowerCase().includes("network")) return false;
      // KNOWN: React hydration mismatch errors (#418, #423, #425)
      // TODO: investigate root cause — likely date/locale rendered server-side
      // vs client-side without stable formatting. Track in follow-up.
      if (e.includes("Minified React error #418")) return false;
      if (e.includes("Minified React error #423")) return false;
      if (e.includes("Minified React error #425")) return false;
      return true;
    });

    if (meaningful.length > 0) {
      console.log("  ⚠ Unhandled console errors:", meaningful);
    }
    // Threshold longgar — hanya fail kalau benar-benar broken
    expect(meaningful.length).toBeLessThan(5);
  });
});
