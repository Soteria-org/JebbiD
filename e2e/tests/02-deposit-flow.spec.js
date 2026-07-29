// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const { requireEnv, login } = require("../helpers");

/**
 * This is the test for the actual reported problem: an investor submits a
 * deposit, and it needs to reach the Finance Officer / Super Admin's screen
 * (via the Refresh button or the background poll) WITHOUT either side logging
 * out and back in. Then approval needs to reach back to the investor's own
 * dashboard the same way.
 *
 * Uses a distinctive, randomized amount (never a round number a real investor
 * would type) so the test can find its own row with certainty, even if other
 * real pending deposits exist in the queue at the same time.
 *
 * Runs investor and staff in two SEPARATE browser contexts (not just two tabs
 * sharing one login) — this is deliberate. It's the only way to actually prove
 * cross-account sync, as opposed to proving "the same browser tab updates
 * itself," which is a different and much weaker claim.
 */

test.describe("Deposit reaches staff and approval reaches investor — no re-login on either side", () => {
  test("full cycle", async ({ browser }) => {
    const investorEmail = requireEnv("E2E_INVESTOR_EMAIL");
    const investorPassword = requireEnv("E2E_INVESTOR_PASSWORD");
    const foEmail = requireEnv("E2E_FO_EMAIL");
    const foPassword = requireEnv("E2E_FO_PASSWORD");

    // A distinctive amount: 150,000 + up to 999 UGX, formatted the same way
    // fmtUGX renders it (UGX with thousands separators) so we can match the
    // exact displayed text on the staff side.
    const amount = 150000 + (Date.now() % 900);
    const amountDisplay = "UGX " + amount.toLocaleString("en-UG");

    const investorContext = await browser.newContext();
    const staffContext = await browser.newContext();
    const investorPage = await investorContext.newPage();
    const staffPage = await staffContext.newPage();

    await test.step("Investor submits a deposit", async () => {
      await login(investorPage, investorEmail, investorPassword);
      await investorPage.getByTestId("nav-invest").click();

      await investorPage.getByTestId("package-standard").click();
      await investorPage.getByTestId("wizard-step1-continue").click();

      await investorPage.getByTestId("goal-Emergency Fund").click();
      await investorPage.getByTestId("wizard-step2-continue").click();

      await investorPage.getByTestId("wizard-amount").fill(String(amount));
      await investorPage.getByTestId("wizard-step3-continue").click();

      await investorPage.getByTestId("wizard-step4-continue").click();

      await investorPage.getByTestId("paymethod-MTN").click();
      await investorPage.getByTestId("wizard-step5-continue").click();

      const fileInput = investorPage.getByTestId("wizard-proof-file");
      await fileInput.setInputFiles(path.join(__dirname, "..", "fixtures", "proof.png"));
      await expect(investorPage.getByTestId("wizard-submit")).toBeEnabled({ timeout: 10_000 });
      await investorPage.getByTestId("wizard-submit").click();

      // submitInvestment navigates to the investments view on success — this is
      // the real assertion that the submission succeeded, not just that the
      // button was clicked.
      await expect(investorPage.getByTestId("nav-investments")).toBeVisible({ timeout: 20_000 });
    });

    await test.step("Investor's OWN screen shows it immediately, without a manual refresh", async () => {
      // This is the exact bug that was reported: the submitter's own screen
      // never reflected their own just-submitted deposit. Check it directly,
      // before ever touching the staff side.
      await expect(investorPage.getByText(amountDisplay).first()).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Finance Officer sees it via Refresh, in a completely separate session", async () => {
      await login(staffPage, foEmail, foPassword);
      await staffPage.getByTestId("nav-deposits").click();
      await staffPage.getByTestId("deposits-refresh").click();

      const row = staffPage.locator("tr", { hasText: amountDisplay });
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row).toContainText(/pending/i);
    });

    await test.step("Finance Officer approves it", async () => {
      const row = staffPage.locator("tr", { hasText: amountDisplay });
      await row.getByRole("button", { name: "Review" }).click();
      await staffPage.getByTestId("approve-deposit").click();
      await expect(staffPage.getByText(/approved/i).first()).toBeVisible({ timeout: 15_000 });
    });

    await test.step("Investor sees the resulting active investment via Refresh — no re-login", async () => {
      await investorPage.getByTestId("header-sync").click();
      await investorPage.getByTestId("nav-investments").click();
      await expect(investorPage.getByText(amountDisplay).first()).toBeVisible({ timeout: 20_000 });
      await expect(investorPage.getByText(/active/i).first()).toBeVisible({ timeout: 5_000 });
    });

    await investorContext.close();
    await staffContext.close();
  });
});
