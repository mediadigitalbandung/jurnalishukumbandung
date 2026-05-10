// UI audit — screenshot key pages at mobile/tablet/desktop
// Usage: node scripts/ui-audit.mjs [base-url]
// Output: scripts/audit-screenshots/{page}-{viewport}.png

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.argv[2] || "https://jurnalishukumbandung.com";
const OUT_DIR = path.resolve(process.cwd(), "scripts/audit-screenshots");

const VIEWPORTS = [
  { name: "mobile",  width: 375,  height: 812 },   // iPhone X
  { name: "tablet",  width: 768,  height: 1024 },  // iPad
  { name: "desktop", width: 1440, height: 900 },   // Desktop
];

const PAGES = [
  { slug: "home",          path: "/" },
  { slug: "berita",        path: "/berita" },
  { slug: "kategori",      path: "/kategori/bandung-raya" },
  { slug: "search",        path: "/search?q=korupsi" },
  { slug: "bookmark",      path: "/bookmark" },
  { slug: "404",           path: "/halaman-tidak-ada-9999" },
  { slug: "share-target",  path: "/share-target?title=Test&text=Konten+share&url=https://example.com" },
  { slug: "tentang",       path: "/tentang" },
  { slug: "redaksi",       path: "/redaksi" },
  { slug: "kontak",        path: "/kontak" },
  { slug: "kode-etik",     path: "/kode-etik" },
];

async function captureArticleSlug(page) {
  // Find first published article slug from /berita
  await page.goto(`${BASE}/berita`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
  const slug = await page.evaluate(() => {
    const link = document.querySelector('a[href^="/berita/"]:not([href="/berita"])');
    if (!link) return null;
    const m = link.getAttribute("href").match(/^\/berita\/(.+?)(\?|$)/);
    return m ? m[1] : null;
  });
  return slug;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  const summary = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      userAgent: vp.name === "mobile"
        ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        : "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await ctx.newPage();

    // Discover an article slug for the article-detail screenshot
    let articleSlug = null;
    if (vp.name === "desktop") {
      try { articleSlug = await captureArticleSlug(page); } catch {}
    }

    const pagesToShoot = articleSlug
      ? [...PAGES, { slug: "artikel", path: `/berita/${articleSlug}` }]
      : PAGES;

    for (const p of pagesToShoot) {
      const filename = `${p.slug}-${vp.name}.png`;
      const filepath = path.join(OUT_DIR, filename);
      try {
        const res = await page.goto(`${BASE}${p.path}`, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await page.waitForTimeout(1500); // settle layout, fonts, images
        await page.screenshot({ path: filepath, fullPage: true });
        summary.push({ vp: vp.name, page: p.slug, status: res?.status() ?? 0, ok: true, file: filename });
        console.log(`✓ ${vp.name.padEnd(8)} ${p.slug.padEnd(15)} ${res?.status()}`);
      } catch (err) {
        summary.push({ vp: vp.name, page: p.slug, status: 0, ok: false, error: err.message, file: filename });
        console.log(`✕ ${vp.name.padEnd(8)} ${p.slug.padEnd(15)} ERROR ${err.message}`);
      }
    }

    await ctx.close();
  }

  await browser.close();

  console.log(`\nTotal screenshots: ${summary.filter((s) => s.ok).length}/${summary.length}`);
  console.log(`Output: ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
