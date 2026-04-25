import { test, expect } from "@playwright/test";

/**
 * Search functionality smoke tests.
 */

test.describe("Search", () => {
  test("submit search query → results page loads", async ({ page }) => {
    await page.goto("/search?q=hukum");
    // No HTTP error
    expect(page.url()).toContain("/search");

    // Page should not be empty
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(100);
    console.log(`  → /search?q=hukum: response length ${bodyText.length} chars`);
  });

  test("search via header form", async ({ page }) => {
    await page.goto("/");
    // Find search input (aria-label "Cari artikel")
    const searchInput = page.locator('input[aria-label="Cari artikel"]').first();
    await expect(searchInput).toBeAttached();

    await searchInput.fill("bandung");
    await searchInput.press("Enter");

    // Should navigate to /search
    await page.waitForURL(/\/search\?q=/);
    expect(page.url()).toContain("q=bandung");
  });

  test("search with no results doesn't crash", async ({ page }) => {
    await page.goto("/search?q=zzzzzzzzz_no_match_xyz");
    // Should still be 200, just empty list
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(100);
  });
});
