# JBDocs — Database Schema Reference

**Status: live.** Everything below is applied to the real Supabase project (`JebbiD`,
ref `udtydecgnqfsbwuhlxpf`) as migrations `001`–`010` in `supabase/migrations/`. This
doc explains *why* it's shaped this way, not just what it is — read it before writing
any code against these tables.

## 1. Architecture overview

```
auth.users (Supabase-managed)
   |
   v
profiles ──────┬─── investor_details (1:1, investor-only fields)
 (role, member_id,  └─ staff_details (1:1, FO/admin-only fields)
  must_change_password,
  account_status)
   |
   ├─ deposit_submissions ──(on approval, trigger creates)──> investment_positions
   |         |                                                       |
   |    uploaded_documents (deposit_proof)                withdrawal_requests
   |                                                              |
   |                                                        payout_records
   |
   ├─ notifications  (written only by trigger functions / notify())
   └─ audit_logs     (written only by trigger functions / log_audit(), insert-only)
```

## 2. Tables

| Table | Purpose | Who writes to it |
|---|---|---|
| `profiles` | One row per `auth.users` row, every role | self (limited fields) or `super_admin` |
| `investor_details` | Investor-only fields (KYC status, next of kin, etc.) | self or staff |
| `staff_details` | FO/admin metadata (who created them) | `super_admin` only |
| `investment_packages` | Standard/Corporate rate config (seeded, editable) | `super_admin` only |
| `deposit_submissions` | "Investor says they paid" + proof — **not yet an investment** | investor creates; staff reviews |
| `investment_positions` | The actual investment — **only created by a trigger when a deposit is approved** | trigger-only (see below) |
| `withdrawal_requests` | Investor's withdrawal request | investor creates; staff reviews |
| `payout_records` | "Finance actually paid this" — separate event from approval | staff only, append-only |
| `uploaded_documents` | Generic file reference (KYC + all proofs) | owner or staff |
| `notifications` | Per-user notifications | trigger functions only (`notify()`) |
| `audit_logs` | Immutable audit trail | trigger functions only (`log_audit()`) — no direct insert, no update, no delete, ever |

## 3. The one rule to understand before touching this schema

**`deposit_submissions` and `investment_positions` are deliberately two different
tables**, not one row that changes status. A deposit submission is "investor claims
they paid X, here's proof." An investment position is "JBDocs has verified and
accepted this money." The trigger `handle_deposit_status_change()` (migration 006) is
what bridges them: the moment a deposit's status flips to `approved`, it automatically
computes `expected_return`/`maturity_value`/`maturity_date` from the package's rate at
that moment and inserts the `investment_positions` row. **Do not write application code
that creates an `investment_positions` row directly** — it should only ever come from
that trigger, or the two tables will drift out of sync with the actual approval history.

Same pattern for withdrawals: `payout_records` is a separate append-only table from
`withdrawal_requests`. Inserting a `payout_records` row automatically flips the
withdrawal to `paid` and closes the investment position (`handle_payout_recorded()`).
Don't set `withdrawal_requests.status = 'paid'` by hand.

## 4. Auth / account-creation model

- **Investor self-registration**: app calls `supabase.auth.signUp()`, then inserts a
  matching `profiles` row (role defaults to `investor`) — the `generate_member_id()`
  trigger assigns `JBD-2026-000123` automatically. Then insert `investor_details`.
- **Admin creates investor or Finance Officer**: must use `createAdminClient()`
  (service role — see `src/lib/supabase/server.js`) from a Server Action, since
  creating another user's `auth.users` row isn't something an RLS-scoped session can
  do. Set `must_change_password = true` and `account_status = 'invited'` on the new
  profile. On that user's first successful login, the app should force the password
  change screen (already exists: `ForcedPasswordChange.jsx`) and then flip
  `must_change_password` back to `false` — **that specific update must happen through
  admin/server code**, because `prevent_role_escalation()` (migration 005) blocks any
  non-`super_admin` session from changing `must_change_password` on a plain table
  update. This is intentional: it stops an investor from just flipping their own flag.
- **Role changes in general**: only `super_admin` sessions can change `role`,
  `account_status`, or `must_change_password` on any profile — enforced at the
  database level (`prevent_role_escalation` trigger), not just in the UI. Even a bug in
  application code can't bypass this.

## 5. RLS summary (who can see/do what)

| | Investor | Finance Officer | Super Admin |
|---|---|---|---|
| Own profile | read/update (not role/status) | — | — |
| Any profile | — | read | read/update |
| Own deposits/withdrawals | read/create; respond only while `clarification_requested` | read/update all | read/update all |
| `investment_positions` | read own | read/write all | read/write all |
| `investment_packages` (rates) | read | read | read/write |
| `audit_logs` | — | read | read |
| Storage: `kyc-documents`, `payment-proofs` | own folder only | all | all |
| Storage: `payout-proofs` | read own | write + read all | write + read all |

Nobody — not even `super_admin` — has a delete policy on any table. That's not an
oversight: no policy was written for `DELETE` on any table in any migration, which
means Postgres denies it by default. Matches "never hard-delete a financial record."

## 6. What's NOT done yet (next phases)

- No actual Next.js code calls any of this yet. `useJBDocsStore.js` is still 100%
  in-memory. Wiring it function-by-function against this schema is Phase 2C.
- KYC upload UI/flow isn't built — the `uploaded_documents` table and storage buckets
  exist and are ready, but nothing calls them yet.
- Maturity-date reminders (30-days-out notification) — needs a scheduled Edge Function
  or `pg_cron` job; not created yet.
- Partial withdrawals against a single investment position are explicitly NOT
  supported by `handle_payout_recorded()` (it always closes the whole position) —
  flagged as a V2 product decision in the migration comments.
- Column-level protection is only enforced for `profiles.role/account_status/
  must_change_password` via the trigger. Other "should staff really be able to edit
  this investor field" questions haven't been pressure-tested — flag anything that
  feels too permissive as we wire real screens against it.

## 8. Email confirmation flow (Resend via Supabase Custom SMTP)

Decision: **Option A** — Supabase Auth still owns the confirmation token/link/email
template; Resend just replaces Supabase's default (rate-limited, dev-only) sender.
Nothing in this repo talks to the Resend API directly — it's pure Supabase Dashboard
configuration (Authentication → SMTP Settings). See the setup walkthrough given
separately; not reproduced here since it's dashboard clicks, not code.

**Why `registerInvestor()` had to change**: with email confirmation ON, `auth.signUp()`
returns a user but no session — there's no `auth.uid()` yet, so `profiles`/
`investor_details` can't be inserted at that moment (RLS would reject it anyway, not
just as a design choice). The fix: the intended profile fields ride along as Supabase
Auth `user_metadata` (set via `options.data` on `signUp()`, available immediately, pre-
confirmation), and `app/auth/confirm/route.js` — the page the emailed link actually
points to — calls `verifyOtp()`, gets a real session, and only then creates the
`profiles`/`investor_details` rows from that metadata. This works identically whether
confirmation is ON or OFF: if OFF, `registerInvestor()` gets a session immediately and
creates the rows right there instead, same as before.

`app/auth/error/page.js` is the fallback for expired/invalid links — currently a bare
functional page, not yet styled to match the rest of the app.

**Required for this to work at all**: `NEXT_PUBLIC_SITE_URL` in `.env.local` must
exactly match an entry in Supabase Dashboard → Authentication → URL Configuration →
Redirect URLs. If that's missing, Supabase silently refuses to redirect back to
`/auth/confirm`, regardless of anything in this repo being correct.

## 7. Local setup


```bash
npm install
cp .env.local.example .env.local   # fill in your own publishable key + service role key
npm run dev
```

To reproduce this schema on a fresh Supabase project (e.g. a preview branch):
```bash
supabase link --project-ref <ref>
supabase db push
```
