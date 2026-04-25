/**
 * Lighthouse Performance Audit — JHB
 *
 * Runs Lighthouse against critical public pages and outputs:
 *  - HTML report per page in tests/perf/reports/
 *  - Console summary table dengan score Performance / Accessibility / BP / SEO
 *
 * Usage:
 *   npm run test:perf
 *   PERF_BASE_URL=http://localhost:3001 npm run test:perf
 *
 * Requires: lighthouse, chrome-launcher (npm install -D)
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// Dynamic ESM imports — lighthouse + chrome-launcher are ESM-only
const chromeLauncher = await import("chrome-launcher");
const lighthouseModule = await import("lighthouse");
const lighthouse = lighthouseModule.default;

const BASE_URL = process.env.PERF_BASE_URL || "https://jurnalishukumbandung.com";
const REPORTS_DIR = join(process.cwd(), "tests", "perf", "reports");

interface PageTarget {
  name: string;
  path: string;
}

const PAGES: PageTarget[] = [
  { name: "homepage", path: "/" },
  { name: "berita-list", path: "/berita" },
  { name: "category-pidana", path: "/kategori/hukum-pidana" },
  { name: "search-hukum", path: "/search?q=hukum" },
  { name: "redaksi", path: "/redaksi" },
  { name: "tentang", path: "/tentang" },
  { name: "kontak", path: "/kontak" },
];

interface AuditScore {
  page: string;
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcp?: number;     // First Contentful Paint (s)
  lcp?: number;     // Largest Contentful Paint (s)
  tbt?: number;     // Total Blocking Time (ms)
  cls?: number;     // Cumulative Layout Shift
  reportFile: string;
}

function fmtScore(s: number | undefined): string {
  if (s === undefined || s === null) return "—";
  const v = Math.round(s * 100);
  if (v >= 90) return `\x1b[32m${v}\x1b[0m`; // green
  if (v >= 50) return `\x1b[33m${v}\x1b[0m`; // yellow
  return `\x1b[31m${v}\x1b[0m`; // red
}

function fmtMetric(val: number | undefined, unit: string, decimals = 2): string {
  if (val === undefined || val === null) return "—";
  return `${val.toFixed(decimals)}${unit}`;
}

async function runAudit(page: PageTarget, port: number, timestamp: string): Promise<AuditScore> {
  const url = BASE_URL.replace(/\/$/, "") + page.path;
  console.log(`\n  → Testing: ${url}`);

  const result = await lighthouse(url, {
    port,
    output: "html",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    logLevel: "error",
  });

  if (!result) throw new Error("Lighthouse returned no result");
  const { lhr, report } = result;

  // Save HTML report
  const reportFile = join(REPORTS_DIR, `${timestamp}-${page.name}.html`);
  writeFileSync(reportFile, Array.isArray(report) ? report.join("\n") : report);

  const audits = lhr.audits;
  return {
    page: page.name,
    url,
    performance: lhr.categories.performance?.score ?? 0,
    accessibility: lhr.categories.accessibility?.score ?? 0,
    bestPractices: lhr.categories["best-practices"]?.score ?? 0,
    seo: lhr.categories.seo?.score ?? 0,
    fcp: audits["first-contentful-paint"]?.numericValue
      ? audits["first-contentful-paint"].numericValue / 1000
      : undefined,
    lcp: audits["largest-contentful-paint"]?.numericValue
      ? audits["largest-contentful-paint"].numericValue / 1000
      : undefined,
    tbt: audits["total-blocking-time"]?.numericValue ?? undefined,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? undefined,
    reportFile: reportFile.replace(process.cwd(), ".").replace(/\\/g, "/"),
  };
}

async function main() {
  console.log(`\n🔬 Lighthouse Audit — ${BASE_URL}`);
  console.log(`   Pages: ${PAGES.length}`);
  console.log(`   Reports → ${REPORTS_DIR}\n`);

  if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  // Launch headless Chrome
  const chrome = await chromeLauncher.launch({
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });

  const results: AuditScore[] = [];
  try {
    for (const page of PAGES) {
      try {
        const r = await runAudit(page, chrome.port, timestamp);
        results.push(r);
      } catch (err) {
        console.error(`  ❌ ${page.name} failed:`, err instanceof Error ? err.message : err);
      }
    }
  } finally {
    // chrome.kill() sometimes fails on Windows with EPERM trying to delete temp dir.
    // Reports are already saved per-page, so cleanup failure is non-fatal.
    try {
      await chrome.kill();
    } catch (err) {
      console.warn("⚠ Chrome cleanup warning (non-fatal):", err instanceof Error ? err.message : err);
    }
  }

  // Print summary table
  console.log("\n┌─────────────────────┬──────┬──────┬──────┬──────┬────────┬────────┬────────┬──────┐");
  console.log("│ Page                │ Perf │ A11y │  BP  │ SEO  │  FCP   │  LCP   │   TBT  │ CLS  │");
  console.log("├─────────────────────┼──────┼──────┼──────┼──────┼────────┼────────┼────────┼──────┤");
  for (const r of results) {
    const name = r.page.padEnd(19).slice(0, 19);
    const fcp = fmtMetric(r.fcp, "s").padStart(6);
    const lcp = fmtMetric(r.lcp, "s").padStart(6);
    const tbt = fmtMetric(r.tbt, "ms", 0).padStart(6);
    const cls = fmtMetric(r.cls, "", 3).padStart(4);
    console.log(
      `│ ${name} │ ${fmtScore(r.performance).padStart(11)} │ ${fmtScore(r.accessibility).padStart(11)} │ ${fmtScore(r.bestPractices).padStart(11)} │ ${fmtScore(r.seo).padStart(11)} │ ${fcp} │ ${lcp} │ ${tbt} │ ${cls} │`
    );
  }
  console.log("└─────────────────────┴──────┴──────┴──────┴──────┴────────┴────────┴────────┴──────┘");

  // Aggregate averages
  const avg = (arr: (number | undefined)[]) => {
    const filtered = arr.filter((v) => typeof v === "number") as number[];
    return filtered.length > 0 ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
  };
  console.log("\n📊 Average Scores (across all pages):");
  console.log(`   Performance:    ${fmtScore(avg(results.map((r) => r.performance)))}`);
  console.log(`   Accessibility:  ${fmtScore(avg(results.map((r) => r.accessibility)))}`);
  console.log(`   Best Practices: ${fmtScore(avg(results.map((r) => r.bestPractices)))}`);
  console.log(`   SEO:            ${fmtScore(avg(results.map((r) => r.seo)))}`);

  // Write JSON summary
  const summaryFile = join(REPORTS_DIR, `${timestamp}-summary.json`);
  writeFileSync(summaryFile, JSON.stringify({ timestamp, baseUrl: BASE_URL, results }, null, 2));
  console.log(`\n📁 Reports saved: ${REPORTS_DIR}`);
  console.log(`📋 Summary JSON:  ${summaryFile.replace(process.cwd(), ".").replace(/\\/g, "/")}\n`);

  // Exit with non-zero if any score < 0.5 (clear regression)
  const hasFailure = results.some(
    (r) => r.performance < 0.5 || r.accessibility < 0.5 || r.seo < 0.5
  );
  if (hasFailure) {
    console.warn("⚠ Some scores < 50 — investigate reports.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
