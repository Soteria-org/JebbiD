# JebbiDox — Project Documentation

**Repository:** `soteria-org/jebbid`
**Branch documented here:** `claude/jebbidox-design-enhancement-v37bao`
**Last updated:** 2026-08-01
**Prepared for:** handover to the next development team

This file lives in the repo (`docs/handover/`) specifically so it stays versioned alongside the code — update it in the same commit as any change worth knowing about, rather than as a separate one-off document.

---

## 1. What JebbiDox Is

JebbiDox (Jebbidox Youth Investment Club) is an investment-club management platform. Members ("investors") deposit money into fixed-term packages (**Standard**, 30% return / 12 months; **Corporate**, 40% return / 12 months, for larger positions), track their positions and maturity dates, request withdrawals, and receive printable receipts and statements. Staff roles (**Finance Officer**, **Super Admin**) approve deposits and withdrawals, manage investor accounts, and monitor the club's overall health.

**Stack:**
- **Frontend:** Next.js 14 (App Router), React, plain CSS-in-JS via inline styles + CSS custom properties for theming (no Tailwind/CSS-in-JS library)
- **Backend:** Supabase (Postgres 17, Auth, Storage, Row-Level Security, SECURITY DEFINER Postgres functions for all mutating operations)
- **Email:** Resend (transactional email for auth flows + delivery-event webhook)
- **Hosting:** Vercel (frontend), Supabase Cloud (database/auth), Namecheap (DNS, `jebbidox.site`)
- **Testing:** Playwright (E2E smoke tests)

---

## 2. Project Timeline

### Phase 1 — Backend & core flows (2026-07-03 → 2026-07-20)
Built by a previous development effort: Supabase schema (profiles, roles, investment core, withdrawals/payouts, documents/notifications/audit, RLS, business-rule triggers, storage buckets), auth flow (email confirmation, member-ID login, FO-creates-investor), multiple rounds of "sync and caching fix" iterations, and initial security-advisor hardening (migrations 001–020 in `supabase/migrations/`).

### Phase 2 — Stabilization (2026-07-27 → 2026-07-31)
Playwright E2E suite added, strong password validation, notifications and portfolio-value updates, DNS CNAME configured for `jebbidox.site`.

### Phase 3 — Design system & UX overhaul (2026-07-31 → 2026-08-01)
1. **Digital-passbook design system** — serif/display typography, garnet-and-gold color palette, CSS custom properties driving light/dark theme, working dark-mode toggle, animated logo, full restyle of shared primitives and app chrome.
2. **Landing page** — new public marketing page at `/`; the app itself moved to `/portal`.
3. **Printable receipts & statements** — self-contained, print-ready HTML documents driven entirely by real settled ledger data.
4. **Auth & email fixes** — fixed self-registration leaving orphaned accounts (email confirmation now uses the admin client); hardened `login()`'s error handling; fixed Resend deliverability so confirmation emails land in the inbox.
5. **Client-side UUID scrub** — every raw database UUID shown to a user replaced with a human-readable reference number.
6. **Super Admin home redesign** — replaced "System Health Center" with **Club Intelligence Centre** (club-wide financial health + broadcast messaging) and **Risk & Compliance Monitor** (flagged accounts + targeted messaging).
7. **Mobile layout fixes** — 12 files had fixed-fraction CSS Grids that squashed on narrow viewports; converted to `repeat(auto-fit, minmax(...))`.
8. **Dark mode contrast pass** — lightened the initial too-dark palette.
9. **Operational tracking added** — `login_attempts` table + Resend delivery-event webhook + `email_events` table.
10. **Bug fixes from testing** — broadcast enum/text comparison bug; the recurring Supabase "anon gets its own direct grant separate from PUBLIC" gotcha, hardened on every new function.

### Phase 4 — Pre-launch QA & handover (2026-08-01)
1. Full advisor re-scan, caught and fixed one more grant gap on `rls_auto_enable()`.
2. **Live end-to-end maturity simulation** on Grandall Folly's real account — backdated a position, called the real `choose_maturity_action` RPC impersonating his real JWT, verified position rollover + notification + audit log, then fully restored his account.
3. `MIN_INVESTMENT` restored to the real value (100000); dropped a Notion FDW foreign table that bypassed RLS entirely (`anon` had full CRUD on it); reconstructed one migration that existed live but had no local file, which surfaced and fixed one more anon-grant gap.

### Phase 5 — Account lifecycle hardening (2026-08-01, later same day)
1. **Orphaned-account self-heal.** A second real user (Micheal Kemba) hit the same class of bug as the earlier fix — confirmed in `auth.users`, no `profiles` row. Repaired his account manually, then made `login()` self-heal automatically going forward: if a confirmed user has no profile row, it's rebuilt from their stored signup metadata right there instead of just erroring.
2. **Support contact wired everywhere.** Added `SUPPORT_EMAIL` (`zeal247invest@gmail.com` — the address already published in the landing footer) as a single constant, surfaced on: the login failure message, the auth error page, a persistent sidebar link in the authenticated app, and the landing footer (now a clickable `mailto:`).
3. **Resend webhook diagnosed; env var since redeployed, still unconfirmed.** `email_events` had zero rows despite correctly-configured Resend webhook config and confirmed-delivered emails, root-caused to `RESEND_WEBHOOK_SECRET`. The user redeployed it, but `email_events` was still at zero rows immediately after — because no email had actually been sent yet to prove it. The new forgot-password flow (below) doubles as the real test case. See §6.
4. **Login rate limiting.** `login()` previously only logged failed attempts for staff to review later — nothing stopped a brute-force attempt in progress. Now blocks an identifier after 5 failed attempts in 15 minutes, checked before any credential check runs.
5. **Forgot/reset password — didn't exist before.** "Forgot your password?" on the sign-in screen → `requestPasswordReset()` sends a real recovery email via Supabase Auth (always reports success regardless of whether the account exists, to prevent using the form to enumerate registered accounts) → `/auth/reset-password` verifies the emailed link, establishes a session, and redirects to `/portal?resetPassword=1` → the sign-in screen itself opens directly on a "set new password" form (no separate page, no code to type — clicking the email link is the whole flow), enforcing the same password policy used everywhere else, then drops the user back into the normal sign-in form. **Requires a manual step:** `/auth/reset-password` must be added to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs, same as `/auth/confirm` already needed.
6. **Freeze/unfreeze — the pause threat now has teeth.** Risk & Compliance Monitor's KYC/missing-info/dormant findings already warned investors their account "may be paused," but nothing enforced it. Now:
   - `schedule_account_warning()` (staff-gated): sends the warning message **and** sets a real `pause_deadline` on the investor's profile, atomically.
   - `set_account_freeze()` (super_admin-only, enforced server-side): actually sets `account_status = 'suspended'` (which `login()` already blocks on) or restores it.
   - `clear_account_warning()`: lets staff cancel a warning early if the investor resolves the issue in time.
   - Risk & Compliance Monitor gained two live sections: **Pending Freezes** (real countdown + Freeze/Clear buttons) and **Frozen Accounts** (Unfreeze button).
   - A custom SVG countdown-ring component (`src/components/ui/PauseCountdown.jsx`) shows the same real deadline to both the investor (dashboard banner + header badge) and staff (Risk Monitor, Investor Detail) — not a decorative timer, it's driven by the same `pause_deadline` column everyone reads from.
   - Verified end-to-end via SQL-level JWT impersonation (warn → deadline set → freeze → login blocked → unfreeze → deadline cleared) against the live database before any UI was built, then all test artifacts were cleaned from the real account used to verify it.

---

## 3. Architecture at a Glance

```
app/
  page.js              — public landing page ("/")
  portal/page.js        — app shell entry ("/portal") — the actual product
  auth/confirm/route.js — email-confirmation callback (admin client!)
  auth/error/page.js
  api/webhooks/resend/route.js — Resend delivery-event webhook

src/
  app-shell/JBDocsApp.jsx      — client-side router/shell for the authenticated app
  state/useJBDocsStore.js      — single global store: session, data fetching, all mutating actions
  lib/
    supabase/server.js         — createClient() (RLS-scoped) vs createAdminClient() (service role, bypasses RLS)
    actions/*.js                — Server Actions (auth, admin, deposits, withdrawals, etc.)
    theme.js, useDarkMode.js    — design tokens + dark mode
    print.js, printTemplates.js — receipts/statements
    constants.js                 — NAV, RATES, MIN_INVESTMENT, SUPPORT_EMAIL, etc.
  features/
    investor/    — investor-facing screens (dashboard, invest wizard, withdrawals, statements, maturity centre)
    staff/       — finance officer screens (deposits queue, investor detail, reports)
    admin/       — super admin screens (Club Intelligence Centre, Risk & Compliance Monitor, settings)
    auth/        — login, register wizard
    kyc/         — KYC upload panel
  components/
    ui/          — shared primitives (Btn, Card, Badge, Modal, StatCard, Logo, ThoughtBubble, PauseCountdown, ...)
    marketing/   — landing-page-only components (HeroRotator)

supabase/migrations/  — every schema change, in order, mirrored from what's actually live
```

**Roles:** `investor`, `finance_officer`, `super_admin`. Enforced both in the UI (route/nav gating) and in Postgres via RLS policies + role checks inside SECURITY DEFINER functions — the UI gating is a convenience, not the security boundary.

**Data flow:** almost every mutation goes through a Postgres `SECURITY DEFINER` function, not a direct table write from the client.

**No raw UUIDs to the client:** every entity has a human-readable reference — Member ID (`JBD-2026-000101`), deposit reference (`DEP-00001`), position reference (`POS-00001`), withdrawal reference (`WD-00001`).

**Account lifecycle:** `account_status` (`invited` / `active` / `suspended`) plus `pause_warning_at` / `pause_deadline` on `profiles` track the warn-then-enforce flow described in Phase 5. `login()` blocks `suspended` accounts entirely.

---

## 4. Screenshots — Before & After

See `screenshots/before` and `screenshots/after` alongside this document (in the handover zip — not committed to the repo, since they're large binaries and go stale the moment the UI changes further; regenerate via a fresh checkout of the pre-redesign commit `879bf65` plus a current-branch Playwright run if a fresh before/after comparison is ever needed again).

---

## 5. Verification Performed

Every claim in this document that describes a fix was verified against the real running system, not just written and assumed correct:

- **Maturity flow end-to-end** — real RPC call impersonating a real investor's JWT, full side-effect chain confirmed via SQL, then cleaned up.
- **Broadcast & direct messaging** — tested via SQL-level role/JWT impersonation before and after the enum-cast fix.
- **Grant hardening** — every "anon can no longer call this" claim backed by `has_function_privilege()`, not just advisor-tool output.
- **Orphaned-account self-heal** — the real second incident (Micheal Kemba) was used as the actual test case; his account is now genuinely fixed, not simulated.
- **Freeze/unfreeze flow** — full warn → deadline → freeze → login-blocked → unfreeze → deadline-cleared cycle run via SQL impersonation against the live database before any UI code was written.
- **Build** — `npm run build` passes clean (only pre-existing ESLint warnings, no errors) as of the latest commit on this branch.

---

## 6. Still Open — Read Before Go-Live

- **Resend webhook — env var redeployed, not yet confirmed working.** `RESEND_WEBHOOK_SECRET` has been redeployed to Production. `email_events` was still at zero rows right after, but that's expected — no email had been sent yet to test it. Trigger a real email (the new forgot-password flow is a good one) and re-check `select count(*) from email_events;`.
- **`/auth/reset-password` redirect URL.** The new forgot-password flow needs this URL added to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs before it will work — same requirement `/auth/confirm` already has.
- **Supabase Auth → "Leaked password protection"** is disabled. No API/MCP tool can toggle it — manual flip in Supabase Dashboard → Authentication → Policies.
- Two Resend-related setup steps are manual, one-time dashboard actions: domain stays verified in Resend/DNS; the delivery-event webhook stays pointed at `/api/webhooks/resend` with all six events subscribed.
- See `DEVELOPER_GUIDE.md` §"Known gaps" for the rest.
