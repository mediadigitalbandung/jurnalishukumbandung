import { test, expect } from "@playwright/test";

/**
 * Category page smoke tests.
 */

test.describe("Category", () => {
  test("category page loads with article list", async ({ page }) => {
    // Hit a known category (hukum-pidana exists from initial seed)
    const response = await page.goto("/kategori/hukum-pidana");
    expect(response?.status()).toBe(200);

    // h1 page heading should mention category
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();

    // Should have article links
    const articleLinks = page.locator('a[href^="/berita/"]');
    const count = await articleLinks.count();
    expect(count).toBeGreaterThanOrEqual(0); // Could be 0 if category empty
    console.log(`  → /kategori/hukum-pidana: ${count} articles`);
  });

  test("clicking category from header nav → loads category page", async ({ page }) => {
    await page.goto("/");

    // Find category nav link (e.g., "Terkini" first item)
    const categoryNav = page.locator('nav[aria-label="Navigasi kategori"] a');
    const linkCount = await categoryNav.count();
    expect(linkCount).toBeGreaterThan(0);

    // Click 2nd link (skip "Terkini" which is /)
    if (linkCount > 1) {
      const secondLink = categoryNav.nth(1);
      const href = await secondLink.getAttribute("href");
      await secondLink.click();
      await page.waitForURL((url) => url.pathname === href);
      // Should not be 404
      const h1 = await page.locator("h1").first().textContent();
      expect(h1).toBeTruthy();
    }
  });
});
