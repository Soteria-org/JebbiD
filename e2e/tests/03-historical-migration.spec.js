// @ts-check
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const os = require("os");
const path = require("path");
const XLSX = require("xlsx");
const { requireEnv, login, e2eTag } = require("../helpers");

/**
 * Covers the mandated end-to-end scenario from
 * docs/migration/HISTORICAL_DATA_MIGRATION_SPEC.md §12: upload a fixture
 * spreadsheet with one investor (e2eTag()'d, real-shaped data) -> validate ->
 * dry-run -> import -> verify the investor and investment exist with the
 * ORIGINAL dates/amounts intact -> create their account -> sign in with the
 * temp password -> forced password change -> land on dashboard -> historical
 * position visible -> re-upload the same file -> confirm nothing duplicates.
 *
 * Email delivery itself is out of scope for this suite (see e2e/README.md —
 * Playwright can't check a real inbox). The temp password is instead read
 * straight off the Super Admin screen (issueMigrationInvitation always
 * returns it in the response, whether or not the invitation email itself
 * sent successfully), which is exactly what a real admin would do if Resend
 * isn't configured in this environment yet.
 */

function buildFixtureWorkbook(name, amount, dateISO) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Full Name", "Amount", "Date"],
    [name, amount, new Date(dateISO)],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "individual investments");
  const tmpPath = path.join(os.tmpdir(), `jebbidox-e2e-migration-${Date.now()}.xlsx`);
  XLSX.writeFile(wb, tmpPath);
  return tmpPath;
}

test.describe("Historical investment data migration — full pipeline", () => {
  test("upload -> dry-run -> import -> invite -> sign in -> dashboard -> re-upload doesn't duplicate", async ({ page }) => {
    const superAdminEmail = requireEnv("E2E_SUPERADMIN_EMAIL");
    const superAdminPassword = requireEnv("E2E_SUPERADMIN_PASSWORD");

    const tag = e2eTag();
    const investorName = tag + " Historical Investor";
    const amount = 250000;
    const startDate = "2024-03-15"; // clearly in the past, unambiguous
    const investorEmail = `${tag.toLowerCase()}@e2e-test.jebbidox.site`;

    const fixturePath = buildFixtureWorkbook(investorName, amount, startDate);

    await test.step("Super Admin uploads the fixture and reviews the dry-run reconciliation", async () => {
      await login(page, superAdminEmail, superAdminPassword);
      await page.getByTestId("nav-migration").click();
      await page.getByTestId("migration-new-import").click();

      await page.getByTestId("migration-upload-input").setInputFiles(fixturePath);
      // Sheet format auto-detects to "flat" for a Name/Amount/Date sheet — no
      // extra interaction needed before Validate & Preview becomes available.
      await expect(page.getByTestId("migration-upload-submit")).toBeVisible({ timeout: 10_000 });
      await page.getByTestId("migration-upload-submit").click();

      await expect(page.getByTestId("migration-reconciliation-summary")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("migration-reconciliation-summary")).toContainText("Reconciles to zero");
      await expect(page.getByText(investorName)).toBeVisible();
    });

    await test.step("Confirm import — clean row, no held decisions", async () => {
      await page.getByTestId("migration-review-next").click();
      await page.getByTestId("migration-confirm-submit").click();
      await expect(page.getByTestId("migration-result-summary")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("migration-result-summary")).toContainText("Imported");
    });

    await test.step("Original date/amount landed intact on the new investor", async () => {
      await page.getByTestId("nav-investors").click();
      await page.getByPlaceholder("Search investors...").fill(investorName);
      await expect(page.getByText(investorName)).toBeVisible({ timeout: 10_000 });
      // "Imported" financial-history badge proves migration_status was set correctly.
      await expect(page.locator("tr", { hasText: investorName })).toContainText("Imported");
      await page.locator("tr", { hasText: investorName }).getByText("View").click();

      await expect(page.getByTestId("migrated-account-panel")).toBeVisible();
      // Investments tab shows the historical position with the original amount.
      await page.getByText("Investments").click();
      await expect(page.getByText("UGX 250,000")).toBeVisible({ timeout: 10_000 });
    });

    let tempPassword;
    await test.step("Create the migrated investor's account — issues real credentials", async () => {
      await page.getByTestId("migrated-account-email").fill(investorEmail);
      await page.getByTestId("migrated-account-submit").click();
      await expect(page.getByTestId("migrated-account-temp-password")).toBeVisible({ timeout: 20_000 });
      tempPassword = await page.getByTestId("migrated-account-temp-password").textContent();
      expect(tempPassword?.length).toBeGreaterThanOrEqual(12);
    });

    await test.step("Sign out, sign in as the migrated investor with the temp password, forced password change", async () => {
      await page.getByTestId("nav-signout").click();
      await page.getByTestId("login-identifier").fill(investorEmail);
      await page.getByTestId("login-password").fill(tempPassword);
      await page.getByTestId("login-submit").click();

      // must_change_password=true routes to ForcedPasswordChange, not the dashboard directly.
      const newPassword = "E2eMigrated!" + Date.now() % 1000 + "Aa";
      await expect(page.getByTestId("forced-new-password")).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("forced-new-password").fill(newPassword);
      await page.getByTestId("forced-confirm-password").fill(newPassword);
      await page.getByTestId("forced-submit").click();

      await expect(page.getByTestId("header-sync")).toBeVisible({ timeout: 20_000 });
    });

    await test.step("Dashboard shows the migration banner and the correct historical position", async () => {
      await expect(page.getByText(/historical investment records have been migrated/i)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText("UGX 250,000")).toBeVisible();
    });

    await test.step("Re-upload the SAME file — the investor is flagged, not silently duplicated", async () => {
      await page.getByTestId("nav-signout").click();
      await login(page, superAdminEmail, superAdminPassword);
      await page.getByTestId("nav-migration").click();
      await page.getByTestId("migration-new-import").click();

      await page.getByTestId("migration-upload-input").setInputFiles(fixturePath);
      await page.getByTestId("migration-upload-submit").click();

      await expect(page.getByTestId("migration-reconciliation-summary")).toBeVisible({ timeout: 20_000 });
      // Now a NAME match against the investor created above — held for a human
      // decision, not auto-imported as a fresh position (spec §4.5).
      const row = page.locator('[data-testid="migration-investor-row"]', { hasText: investorName });
      await expect(row).toContainText(/possible duplicate/i);

      await page.getByTestId("migration-review-next").click();
      const decisionRow = page.locator('[data-testid="migration-group-decision"]', { hasText: investorName });
      await decisionRow.getByText("Skip for now").click();
      await page.getByTestId("migration-confirm-submit").click();

      await expect(page.getByTestId("migration-result-summary")).toBeVisible({ timeout: 20_000 });
      // Skipped, not imported — the investor's position count must not have doubled.
      await expect(page.getByTestId("migration-result-imported-count")).toHaveText("0");
      await expect(page.getByTestId("migration-result-skipped-count")).toHaveText("1");
    });

    fs.unlinkSync(fixturePath);
  });
});
