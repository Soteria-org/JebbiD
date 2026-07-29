// @ts-check
const { test, expect } = require("@playwright/test");
const { requireEnv, login, e2eTag } = require("../helpers");

/**
 * Covers: Super Admin creates a Finance Officer, then that Finance Officer
 * creates a Walk-in Investor. Every account created here is tagged with a
 * unique "E2E-..." string in its name so it's unmistakable as test data —
 * see e2e/README.md for how to find and remove it afterward.
 *
 * This does NOT try to log in as the newly created accounts (that would require
 * either capturing and reusing a one-time temp password across test files, or
 * a forced-password-change flow mid-test — both fragile). It confirms the thing
 * that was actually broken: does creation succeed, and does the FAILURE MODE (if
 * it still fails) surface as a specific, readable error instead of a silent or
 * generic one.
 */

test.describe("Account creation", () => {
  test("Super Admin can create a Finance Officer", async ({ page }) => {
    const email = requireEnv("E2E_SUPERADMIN_EMAIL");
    const password = requireEnv("E2E_SUPERADMIN_PASSWORD");
    await login(page, email, password);

    await page.getByTestId("nav-settings").click();
    await page.getByTestId("settings-tab-officers").click();
    await page.getByTestId("open-create-fo").click();

    const tag = e2eTag();
    await page.getByTestId("fo-fullname").fill(tag + " Finance Officer");
    await page.getByTestId("fo-email").fill(tag.toLowerCase() + "@e2e-test.jebbidox.site");
    await page.getByTestId("fo-submit").click();

    // Whichever happens, it must happen with a REAL, READABLE message — not a
    // silent failure and not a generic "Something went wrong." If this test
    // fails on the next line with a timeout, that itself is informative: it
    // means creation neither succeeded NOR produced a visible error, which is
    // its own bug distinct from "creation is broken."
    const tempPassword = page.getByTestId("fo-temp-password");
    const formError = page.getByTestId("fo-form-error");
    await expect(tempPassword.or(formError)).toBeVisible({ timeout: 20_000 });

    if (await formError.isVisible().catch(() => false)) {
      const errorText = await formError.textContent();
      throw new Error(
        `Finance Officer creation failed with a real, readable error (this is at least NOT a silent failure): "${errorText}". ` +
        `If this mentions "SUPABASE_SERVICE_ROLE_KEY" or "row-level security", that's a Netlify/Supabase configuration issue, not a code bug — see e2e/README.md.`
      );
    }

    await expect(tempPassword).toHaveText(/.{6,}/); // a real password string, not empty
  });

  test("Finance Officer can create a Walk-in Investor", async ({ page }) => {
    const email = requireEnv("E2E_FO_EMAIL");
    const password = requireEnv("E2E_FO_PASSWORD");
    await login(page, email, password);

    await page.getByTestId("nav-investors").click();
    await page.getByTestId("open-add-investor").click();

    const tag = e2eTag();
    await page.getByTestId("investor-fullname").fill(tag + " Investor");
    await page.getByTestId("investor-phone").fill("0700000000");
    await page.getByTestId("investor-email").fill(tag.toLowerCase() + "@e2e-test.jebbidox.site");
    await page.getByTestId("investor-nationalid").fill("E2E" + Date.now());
    await page.getByTestId("investor-submit").click();

    const tempPassword = page.getByTestId("investor-temp-password");
    const formError = page.getByTestId("investor-form-error");
    await expect(tempPassword.or(formError)).toBeVisible({ timeout: 20_000 });

    if (await formError.isVisible().catch(() => false)) {
      const errorText = await formError.textContent();
      throw new Error(
        `Walk-in Investor creation failed with a real, readable error: "${errorText}". ` +
        `Same root cause class as the Finance Officer test above — check whether it's the same message.`
      );
    }

    await expect(tempPassword).toHaveText(/.{6,}/);
  });
});
