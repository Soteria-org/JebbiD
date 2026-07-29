// @ts-check
const { expect } = require("@playwright/test");

/**
 * Every credential these tests need, read once, with a clear failure message if
 * any are missing — so a misconfigured CI run fails immediately with "set
 * E2E_FO_EMAIL" instead of a confusing timeout 40 seconds later inside a test.
 */
function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required environment variable: ${name}. See e2e/README.md for the full list and how to set them (locally in .env.e2e, or as GitHub Actions secrets).`
    );
  }
  return v;
}

/** Logs in on the app's single login screen and waits for the dashboard to load. */
async function login(page, identifier, password) {
  await page.goto("/");
  await page.getByTestId("login-identifier").fill(identifier);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
  // The header only renders once a session exists — this is the actual signal
  // that login succeeded, rather than guessing at a timeout.
  await expect(page.getByTestId("header-sync")).toBeVisible({ timeout: 20_000 });
}

/** A short, sortable, visually-obvious tag so any test data is unmistakably test data. */
function e2eTag() {
  return "E2E-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
}

module.exports = { requireEnv, login, e2eTag };
