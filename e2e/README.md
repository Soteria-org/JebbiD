# JBDocs E2E Tests

Real browser tests against your actual live site and actual Supabase backend — not a mock, not a sandbox. This is deliberate: the bugs we've been chasing (deposits not syncing, account creation failing) only show up against the real thing.

## One-time setup

### 1. Create four dedicated test accounts

These must already exist before the tests can run — the tests log in with them, they don't bootstrap the first admin.

- **1 Super Admin** — use your existing one, or create a second dedicated one
- **1 Finance Officer** — create via the app (Settings → Finance Officers → Create Finance Officer), complete its forced password change once
- **1 Investor** — create via self-registration or Add Walk-in Investor, complete its forced password change once

Use real inboxes you can access if email confirmation is on. Don't use a real stakeholder's account for the investor one — the deposit test submits a real deposit under it every single run.

### 2. Install dependencies

```bash
npm install
npx playwright install --with-deps chromium
```

### 3. Set up credentials

```bash
cp .env.e2e.example .env.e2e
```

Fill in the four accounts' real credentials and the URL to test against.

## Running locally

```bash
# Load .env.e2e into the shell, then run
export $(cat .env.e2e | grep -v '^#' | xargs) && npm run test:e2e

# Or with the interactive UI (recommended the first time — lets you watch it click through)
export $(cat .env.e2e | grep -v '^#' | xargs) && npm run test:e2e:ui
```

## Running in GitHub Actions

1. Repo → **Settings → Secrets and variables → Actions** → add each of: `E2E_BASE_URL`, `E2E_SUPERADMIN_EMAIL`, `E2E_SUPERADMIN_PASSWORD`, `E2E_FO_EMAIL`, `E2E_FO_PASSWORD`, `E2E_INVESTOR_EMAIL`, `E2E_INVESTOR_PASSWORD`.
2. Repo → **Actions** tab → **E2E Tests** → **Run workflow** to trigger it on demand.
3. It also runs automatically every day at 06:00 UTC as a standing health check — if it ever goes red overnight, you'll know before a real user hits the same problem.
4. On any run, download the **playwright-report** artifact for a full trace/screenshot/video of exactly what happened, including on failure.

## What's actually covered right now

| Test | What it proves |
|---|---|
| `01-account-creation.spec.js` | Super Admin can create a Finance Officer; Finance Officer can create a Walk-in Investor. If either fails, the test fails with the **real error text** from the app — never a silent timeout — so a service-role-key misconfiguration shows up as exactly that in the test output. |
| `02-deposit-flow.spec.js` | An investor's deposit reaches their own screen immediately, reaches a Finance Officer's screen in a **completely separate browser session** via the Refresh button, gets approved, and the resulting active investment reaches back to the investor — all without either side logging out and back in. This is the actual test for the "deposits don't sync" issue. |

## What this does NOT cover yet (be aware, don't assume)

- Withdrawals and maturity choices
- KYC upload/approval
- Email delivery/inbox verification (Playwright can click "resend," but can't check a real inbox without an email-testing service — worth adding later if this becomes a recurring problem)
- Reports/statements screens
- Notifications screen content (only that deposits/approvals reach the relevant screens, not the notification bell specifically)

Treat a green run as "the things listed above work," not "the whole app works." Extending this file with more `*.spec.js` files as new critical flows stabilize is the right way to grow this over time — that's genuinely more valuable than another round of manual click-testing.

## Cleaning up test data

Every account/deposit these tests create is tagged `E2E-<timestamp>-<random>` in its name, and investor/FO test emails end in `@e2e-test.jebbidox.site`. To find and remove them, run this in Supabase's SQL Editor periodically:

```sql
select id, full_name, email, created_at from profiles
where email like '%@e2e-test.jebbidox.site' order by created_at desc;
```

Delete via Supabase Auth → Users (deleting the auth.users row cascades to profiles and everything under it, per the FK constraints already in your schema).
