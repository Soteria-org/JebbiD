# JebbiDox — Developer Guide

For the next team picking this up. Read this before touching the database or auth flow — several of the gotchas here have caused real bugs in this project already.

**Last updated:** 2026-08-01

Note: the repo's root `README.md` predates the Supabase integration and describes an earlier in-memory-only phase of the project. It's still useful for the file-structure rationale, but treat this document and `PROJECT_DOCUMENTATION.md` as current.

---

## 1. Local Setup

```bash
git clone <repo>
cd jebbid
npm install
cp .env.local.example .env.local   # then fill in real values, see below
npm run dev
```

**Required env vars** (`.env.local`, gitignored — never commit it):

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page — the `sb_publishable_...` key (legacy `anon` JWT also works) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your real domain in production. Must exactly match an entry in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs. |
| `NEXT_PUBLIC_ENABLE_DEMO_SWITCHER` | Leave `false`/absent in production. |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key. Powers `createAdminClient()`. Never expose to the browser. |
| `RESEND_WEBHOOK_SECRET` | Starts with `whsec_`. **Currently suspected broken in production** — see §5. |

Other scripts: `npm run build`, `npm run lint`, `npm run test:e2e` (Playwright — needs `.env.e2e`).

---

## 2. How Data Flows

```
Client component
  → calls a function from useJBDocsStore.js (src/state/useJBDocsStore.js)
    → calls a Server Action (src/lib/actions/*.js)
      → calls a Postgres RPC — a SECURITY DEFINER function in supabase/migrations/
```

Validation, business rules, notification creation, and audit logging happen in the Postgres function, not the JS layer. `useJBDocsStore.js` returns a single `ctx` object every screen is built against — add new state/actions there, don't reach into Supabase directly from a feature component.

---

## 3. The Supabase Grant Gotcha (read this before writing any new RPC)

**This has caused real, shipped bugs in this project three separate times.** `create function ... security definer` gets `PUBLIC` and, separately, `anon` (via `ALTER DEFAULT PRIVILEGES`) execute privilege automatically, even if you never asked for it.

- `revoke ... from public` does **not** revoke `anon`'s privilege — it's a separate grant.
- `revoke ... from anon` does **not** revoke `PUBLIC`'s grant, which applies to every role including `anon`.

**Revoke from both**, then grant back only to the roles that should call it:

```sql
revoke execute on function public.my_new_function(...) from public, anon;
grant execute on function public.my_new_function(...) to authenticated;
```

**Verify directly, don't trust the advisor cache:**

```sql
select has_function_privilege('anon', 'public.my_new_function(...)', 'execute');
```

Every function added in this project's design/QA/account-lifecycle work was checked this way — see migrations `20260707101402_017_...`, `20260801095500_...`, `20260801101006_...`, `20260801104200_...`.

---

## 4. Testing SECURITY DEFINER Functions Without Real Credentials

```sql
begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"<user-uuid>","role":"authenticated"}';
select public.some_function(...);
commit; -- or rollback if you don't want it to stick
```

This is how the maturity-flow simulation, broadcast fix, grant hardening, and the entire warn → freeze → unfreeze account-lifecycle flow were all verified end-to-end against the real schema before being called "done" — every one of those was tested this way *before* any UI code was written for it.

---

## 5. Email (Resend) — INCLUDING A KNOWN BROKEN PIECE

Two separate integrations:

1. **Supabase Auth SMTP** — custom SMTP in Supabase Dashboard → Authentication → SMTP Settings, using Resend. **Working** — confirmation/reset emails are confirmed delivering.
2. **Delivery-event webhook** (`app/api/webhooks/resend/route.js`) — receives `email.sent`/`delivered`/`bounced`/`complained`/`failed`/`delivery_delayed` and stores them in `email_events`, powering the delivery-rate stat in Club Intelligence Centre.

**Status as of 2026-08-01: not working.** `email_events` has zero rows despite confirmed-delivered emails and a correctly-configured Resend webhook (endpoint, events, enabled all verified via the Resend API). The route hard-returns `500` on every call unless `RESEND_WEBHOOK_SECRET` is present (`app/api/webhooks/resend/route.js` line ~44) — so the fix is almost certainly:
1. Confirm `RESEND_WEBHOOK_SECRET` is set in Vercel → Project → Settings → Environment Variables, **Production** environment specifically (not just Preview/Development).
2. Redeploy — an already-running deployment doesn't pick up a newly-added env var on its own.
3. Confirm the value matches exactly what Resend has on file for the webhook (visible via the Resend dashboard or `get-webhook` API).

This could not be fixed directly by the AI session that diagnosed it — no Vercel project was reachable from the tooling available at the time (outbound HTTPS to the live domain was also sandboxed). Needs a human with Vercel dashboard access to close the loop, then verify by checking `select count(*) from email_events;` after the next confirmation/reset email goes out.

Signature verification is manual via Node's `crypto` (`verifySvixSignature()` in the route file) — no external Svix package dependency.

---

## 6. Migrations

`supabase/migrations/*.sql`, applied in filename order. **Every migration applied to the live project must be mirrored to a local file in the same sitting** — this slipped once already (`20260728065109_add_deposit_and_position_reference_numbers` existed live for days with no local file, and its absence hid a grant gap for weeks).

To apply: use the Supabase MCP `apply_migration` tool (or dashboard SQL editor), then immediately `Write` the identical SQL to a new timestamped local file.

---

## 7. Design System Conventions

- Theming via CSS custom properties (`app/globals.css`), `data-theme` attribute, `src/lib/useDarkMode.js`. `src/lib/theme.js`'s `C` object maps token names to `var(--...)`.
- `C.white` is a literal `"#ffffff"`; `C.surface` is adaptive (`var(--surface-raised)`). Don't swap them casually.
- Grids: always `repeat(auto-fit, minmax(Npx, 1fr))`, never a fixed fraction like `1fr 1fr` — fixed fractions squash on mobile (fixed in 12 files already).
- No raw database UUIDs are ever rendered to a user — use the reference number field, never `.id` directly.
- Custom SVG icons (not a library) live in `src/components/icons/index.jsx` — add new ones there in the same minimal line-icon style rather than pulling in an icon package.

---

## 8. Account Lifecycle (Warn → Freeze → Unfreeze)

Added 2026-08-01. Three Postgres functions, all `SECURITY DEFINER`, all role-gated inside the function body (not just by grants):

| Function | Who can call | What it does |
|---|---|---|
| `schedule_account_warning(investor_id, title, message, deadline_days=7)` | `is_staff()` | Sends the message via `notify()` AND sets `profiles.pause_warning_at` / `pause_deadline`. Atomic — the countdown always corresponds to a real sent message. |
| `clear_account_warning(investor_id)` | `is_staff()` | Clears the deadline without freezing (issue resolved in time). |
| `set_account_freeze(investor_id, frozen)` | `is_super_admin()` | Sets `account_status` to `'suspended'`/`'active'`. `login()` already blocks suspended accounts. Unfreezing also clears any pending warning. |

Client side: `src/lib/actions/admin-actions.js` (`scheduleAccountWarning`, `clearAccountWarning`, `setAccountFreeze`), wired into `useJBDocsStore.js`, surfaced in `src/features/admin/RiskComplianceMonitor.jsx` ("Pending Freezes"/"Frozen Accounts" sections + the Warn action on KYC/missing-info/dormant findings) and `src/features/staff/InvestorDetailScreen.jsx` (direct Freeze/Unfreeze per investor).

The countdown itself is `src/components/ui/PauseCountdown.jsx` — a real SVG ring computed from `pause_warning_at`/`pause_deadline`, not a decorative animation. Both the investor (dashboard banner, header badge) and staff (Risk Monitor, Investor Detail) read the same two columns, so what an investor sees always matches what staff see.

**If you extend this:** any new "may be paused" language anywhere in the app should call `schedule_account_warning`, not `send_investor_notification` — a message that threatens a consequence the system won't actually enforce is exactly the gap that prompted this feature to begin with.

---

## 9. Known Gaps / Judgment Calls Left for You

- **Resend webhook** — see §5. Needs Vercel dashboard access to close.
- **Supabase Auth → "Leaked password protection"** is disabled — manual flip in Supabase Dashboard → Authentication → Policies, no API/MCP tool can do it.
- `TODAY` in `src/lib/constants.js` is a deliberately frozen demo date — intentional, see comments in `src/lib/format.js` / `src/features/staff/useStaffMetrics.js`.
- `RATES`, `PENALTY_RATE`, `PERIOD_MONTHS`, `CORPORATE_THRESHOLD` encode real business terms — confirm against the club's actual current terms before go-live.
- The default freeze-warning deadline is 7 days, adjustable per-warning in the UI (1–90 days, enforced server-side too). No automated "deadline passed" job exists — freezing still requires a Super Admin to act; nothing auto-freezes on deadline expiry. If auto-freeze-on-expiry is wanted, that's a `pg_cron` job calling `set_account_freeze` for every row where `pause_deadline < now()` and `account_status = 'active'` — deliberately not built without confirming that's actually wanted, since auto-locking real users out is a much bigger blast radius than a manual step.

---

## 10. Handy Reference

- **Roles:** `investor`, `finance_officer`, `super_admin` — see `src/lib/constants.js` `NAV`/`ROLE_LABEL`.
- **Reference number formats:** Member ID `JBD-YYYY-NNNNNN`, deposit `DEP-#####`, position `POS-#####`, withdrawal `WD-#####`.
- **Support email:** `SUPPORT_EMAIL` in `src/lib/constants.js` — single source of truth, surfaced in login errors, auth error page, sidebar, landing footer.
- **Auth debugging:** `app/auth/confirm/route.js`, `src/lib/actions/auth-actions.js` (`login()` — now self-heals orphaned profiles, `logFailedLogin()`).
- **Super Admin panels:** `src/features/admin/ClubIntelligenceCentre.jsx`, `src/features/admin/RiskComplianceMonitor.jsx`.
- **Account lifecycle:** see §8 above.
