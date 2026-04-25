import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config — JHB E2E + Performance testing.
 *
 * Default base URL = production (https://jurnalishukumbandung.com).
 * Override via env: PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e
 *
 * Tests dijalankan dari local machine. Tidak boleh modifikasi data production
 * (no comment submit, no article edit). Read-only flows saja.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://jurnalishukumbandung.com";

export default defineConfig({
  testDir: "./tests/e2e",
  // Run tests in parallel
  fullyParallel: true,
  // Fail build on CI if test.only forgotten
  forbidOnly: !!process.env.CI,
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  // Workers: 4 lokal, 2 CI
  workers: process.env.CI ? 2 : 4,
  // Reporters
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
  ],
  // Default timeout per test
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  // Output dirs
  outputDir: "test-results/",

  use: {
    baseURL: BASE_URL,
    // Capture trace on first retry only
    trace: "on-first-retry",
    // Screenshots on failure
    screenshot: "only-on-failure",
    // Video on failure
    video: "retain-on-failure",
    // Polite to production: add User-Agent identifying bot
    extraHTTPHeaders: {
      "User-Agent": "JHB-Playwright-Tests/1.0 (internal QA)",
    },
    // Don't follow rate-limit triggering navigations
    actionTimeout: 15000,
    navigationTimeout: 20000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Bisa diaktifkan nanti kalau perlu test cross-browser
    // { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // { name: "webkit", use: { ...devices["Desktop Safari"] } },
    // { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
});
