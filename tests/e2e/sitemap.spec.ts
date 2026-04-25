import { test, expect } from "@playwright/test";

/**
 * Sitemap & robots.txt smoke tests — critical for SEO / Google News.
 */

test.describe("Sitemap & robots", () => {
  test("/sitemap.xml returns valid XML", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const ct = res.headers()["content-type"] || "";
    expect(ct).toMatch(/xml/);
    const body = await res.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("<loc>");
    // Should have multiple URLs (we have 408+ articles)
    const urlCount = (body.match(/<loc>/g) || []).length;
    expect(urlCount).toBeGreaterThan(50);
    console.log(`  → /sitemap.xml: ${urlCount} URLs`);
  });

  test("/news-sitemap.xml has Google News namespace + Jakarta tz", async ({ request }) => {
    const res = await request.get("/news-sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("xmlns:news=");
    expect(body).toContain("<news:news>");
    expect(body).toContain("<news:publication>");
    expect(body).toContain("<news:language>id</news:language>");
    // Date format should have +07:00 offset (not Z)
    const dateMatch = body.match(/<news:publication_date>([^<]+)</);
    if (dateMatch) {
      expect(dateMatch[1]).toContain("+07:00");
    }
  });

  test("/image-sitemap.xml includes image namespace", async ({ request }) => {
    const res = await request.get("/image-sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("xmlns:image=");
    expect(body).toContain("<image:image>");
  });

  test("/robots.txt has Googlebot-News + sitemap refs", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Googlebot-News");
    expect(body).toContain("Sitemap:");
    expect(body).toContain("/sitemap.xml");
  });

  test("HSTS + security headers present on homepage", async ({ request }) => {
    const res = await request.get("/");
    const headers = res.headers();
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBeTruthy();
    expect(headers["content-security-policy"]).toBeTruthy();
  });
});
