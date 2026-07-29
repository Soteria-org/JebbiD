// @ts-check
const { defineConfig, devices } = require("@playwright/test");

/**
 * These tests run against a REAL deployed environment (your Netlify site) and a
 * REAL Supabase backend — not a sandbox. They create real rows (an investor
 * account, a deposit, an audit log entry). Every value the tests write is
 * timestamped and clearly tagged (see e2e/tests/*.spec.js for the "E2E-" prefix
 * convention) specifically so it's easy to find and delete afterward, and so it's
 * never confused with real investor data.
 *
 * Set E2E_BASE_URL to the environment under test. Defaults to your live domain,
 * but override it for a Netlify preview/deploy-preview URL when testing a branch
 * before merging.
 */
module.exports = defineConfig({
  testDir: "./e2e/tests",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // these tests share real backend state — run sequentially, not racing each other
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://jebbidox.site",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
