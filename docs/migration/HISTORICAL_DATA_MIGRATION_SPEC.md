# Jebbidox — Historical Investment Data Migration & Verified Investor Status
## Master Specification (for whichever Claude session implements this)

**Status: planning only. Do not implement yet.** The club has so far provided column
*headers* for their historical records (2019/2020 onward), not the actual sheet or
sample rows. This document is the complete brief for when the real data arrives —
read it in full before writing any code, and stop at the checkpoint in §0 if the
real sheet still hasn't arrived when you pick this up.

This spec is written against the *actual* JebbiD codebase, not a generic Next.js/
Supabase app. Every "reuse this" reference below points at a real file or pattern
that exists today; every "this needs to be built" is something that was checked
and confirmed absent. Re-verify anything load-bearing before relying on it — this
was accurate as of Aug 12, 2026, but the codebase moves.

---

## 0. Read this first

**Do not touch production financial data until:**
1. The actual Google Sheet (or an export of it) has been provided.
2. You have inspected its real headers and a sample of real rows.
3. You have proposed a column mapping and surfaced every ambiguity found in it.
4. Someone with authority over the data has confirmed the mapping and any
   assumptions in it (date format, currency, what a blank cell means, etc.).
5. A dry-run/preview has run against the real file with zero writes to
   `profiles`, `investor_details`, or `investment_positions`.

**Do not assume the spreadsheet's structure before it exists.** Nothing in this
spec should be read as "the columns will be X" — it defines the *pipeline*, not
the mapping. The mapping is discovered from the real file, not designed in advance.

**Do not build this as a one-shot importer.** The pipeline is: source file → staging
→ validation → dry-run/preview → explicit admin confirmation → import → post-import
reconciliation. Every stage must be inspectable and every failure must be specific.

---

## 1. The core architectural principle

Three things that must stay conceptually and structurally separate, because
conflating any pair of them is how this kind of migration goes wrong:

```
                    JEBBIDOX
                       │
          ┌────────────┼────────────┐
          │            │            │
     FINANCIAL      IDENTITY      LOGIN
     HISTORY       (investor)   (auth.users)
          │            │            │
   investment_     profiles +   Supabase Auth
   positions,     investor_     account
   deposit_       details       (may not
   submissions                   exist yet)
```

- **Financial history** (what they invested, when, what it's worth) can and should
  be migrated *before* the investor ever has a login. This is the single most
  important product decision in this spec: migrate the money first, onboard the
  person second. Nobody re-lives six years of fake "transactions" just because
  their login is new in 2026.
- **Investor identity** (`profiles` + `investor_details`) is the financial record's
  owner. It can exist with `auth_user_id`-equivalent unset — see §3 for how that
  actually maps onto this schema (spoiler: it doesn't cleanly today, and that's the
  first real decision to make).
- **KYC / verification** is a *status on top of* identity, not a precondition for
  importing history, and not something migration should ever imply. A migrated
  investor's historical financial data being trusted for import purposes does
  **not** mean they're currently KYC-verified. Keep these as separate, explicit
  fields — never one `status` column trying to answer three different questions.

---

## 2. Verified Investor status

### 2.1 What it visually is
A small red circular badge with a white checkmark, placed immediately beside the
investor's name or Member ID, everywhere an investor identity is shown:
Investors table, investor profile, investment positions, deposits/withdrawals,
statements, search results, and the Super Admin/FO investor management screens.
On the investor's own dashboard (the "digital passbook" header), it should read
as a trust credential, not a colorful status chip — small, red, checkmark, done.
Hover/click reveals the text "Verified Investor". Style it with the existing
brand tokens (`src/lib/theme.js` — `C.brand` for the badge fill, `C.white` for
the check) so it's unmistakably a Jebbidox-native element, not a bolted-on chip.

**Never show this badge because a record was imported.** Import status and
verification status are different axes — see §2.2.

### 2.2 Three independent fields, not one
The temptation is a single `status` enum trying to mean five things at once.
Don't. Model (at minimum) these as independently readable states:

| Field | What it answers | Example values |
|---|---|---|
| `migration_status` | Did this record come from a migration? | `native` \| `migrated` |
| Financial history status | Do we trust the historical money figures? | `imported_approved` (migrated records only; native records don't need this) |
| `investor_details.kyc_status` | **Already exists.** Has KYC been completed? | `not_started` \| `pending` \| `approved` \| `rejected` |
| `verification_status` (new, derived or stored) | Is this investor currently Verified? | `unverified` \| `verified` |

`investor_details.kyc_status` already exists in the schema — reuse it, don't
duplicate it with a second KYC field. The only genuinely new investor-facing
status concept is **Investor Verification**, and it should be defined as:

> An investor is Verified only when their current KYC requirements are complete
> and approved (`investor_details.kyc_status = 'approved'`) — full stop. Migration
> status and financial-history trust never factor into this computation.

Whether `verification_status` is a stored column (updated by the same staff
action that approves KYC — see `KYCUploadPanel`'s existing `staffMode` approve
path) or a generated/computed value read off `kyc_status` is an implementation
choice; a stored column is simpler to index and query for the investor table's
"Status" column, but must be kept in lockstep with `kyc_status` by the same
code path that changes it — don't let two fields drift.

### 2.3 Super Admin/FO investor table
Give the investor table three separate, honestly-labeled columns instead of one
overloaded status:

| Investor | Member ID | Financial History | KYC | Status |
|---|---|---|---|---|
| Grandall Folly | JBD-2020-001 | Imported | Approved | 🔴✓ Verified |
| Jane Doe | JBD-2021-014 | Imported | Pending | KYC Pending |
| John Smith | JBD-2024-027 | Imported | Incomplete | Profile Incomplete |

This answers three different questions at a glance: do we have their historical
money, have they completed current documentation, and can staff treat them as
fully verified. Don't collapse that back into one field for UI convenience.

---

## 3. Database changes — grounded in the real schema

Read `docs/database-schema.md` in full before touching any of this — it documents
a load-bearing invariant that directly conflicts with a naive reading of the
migration requirement below. Resolving that conflict correctly is the single
most important schema decision in this whole feature.

### 3.1 The conflict you must resolve deliberately

`docs/database-schema.md` states plainly: **"Do not write application code that
creates an `investment_positions` row directly — it should only ever come from
[the] `handle_deposit_status_change()` trigger"**, which fires when a
`deposit_submissions` row flips to `approved`, and which computes
`expected_return`/`maturity_value`/`maturity_date` from **today's**
`investment_packages` rate — not any historical rate.

That's correct and important for the *normal* flow. It is wrong for migration:
§5 below requires that a migrated investment's amount, date, rate, and maturity
date come from the source spreadsheet exactly as supplied, never recomputed from
current package config. Bulk-inserting fake `deposit_submissions` rows just to
trigger that path would (a) recompute the wrong numbers off today's rates and
(b) pollute the deposit-review history with thousands of synthetic "deposits"
staff never actually reviewed.

**Do not silently violate the existing invariant, and do not silently reuse the
trigger and get wrong numbers.** Resolve this explicitly: add one new, clearly-
named, migration-only `SECURITY DEFINER` function (e.g.
`import_historical_investment(...)`) that is the *only* other code path allowed
to insert into `investment_positions` directly, gated so it can only be called
by `super_admin`/`is_staff()` (same pattern as `set_account_freeze`,
`choose_maturity_action`, etc. — see any of those in
`supabase/migrations/` for the caller-check pattern to copy), and that always
calls `log_audit()` so every migrated row is traceable to a specific import
batch. This keeps the existing invariant intact for every code path except the
one explicitly designed to bypass it, and keeps that bypass auditable.

### 3.2 New enums / columns likely needed
(Confirm exact naming against the live schema before writing the migration —
this is a starting proposal, not a locked spec.)

- `profiles.migration_status` — enum `native` / `migrated`, default `native`.
- `investor_details.financial_history_status` — enum or text, e.g.
  `imported_approved`, nullable/irrelevant for `native` investors.
- `investor_details.verification_status` — enum `unverified` / `verified`
  (or compute it in application code / a view from `kyc_status`, per §2.2).
- `notification_type` — this enum already has 19 values (`registration_successful`,
  `investment_matured`, `account_status_alert`, etc.). Adding
  `migration_invitation_sent` (or reuse `account_status_alert` if it fits) needs
  `ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS '...'` — remember
  Postgres enum additions can't run inside the same transaction as code that uses
  the new value; check `mcp__Supabase__apply_migration`'s behavior on this before
  assuming a single migration file can do both.
- Import staging: `import_batches` and `import_rows` tables, roughly per §4.2.
  New tables, RLS-enabled (staff-only, matching the `is_staff()` pattern used
  everywhere else), not reusing any existing table.
- **Temp-credential expiry does not exist today.** `createInvestorProfileRows` /
  the admin-create-account action (`src/lib/actions/auth-actions.js`, look for
  `randomTempPassword()` and `must_change_password`) sets `must_change_password:
  true` and returns the temp password to the calling admin — but nothing ever
  expires it. §6 requires a 48-hour expiry; that needs a new
  `temp_password_issued_at` (or reuse `profiles.updated_at` carefully — probably
  don't, it's used for other things) column and a check in the login path.

---

## 4. Migration pipeline

### 4.1 Lifecycle
```
SOURCE FILE → UPLOAD → COLUMN DETECTION → MAPPING (admin-confirmed)
  → VALIDATION → DUPLICATE DETECTION → DRY RUN / PREVIEW → RECONCILIATION PREVIEW
  → ADMIN CONFIRMATION → IMPORT → POST-IMPORT RECONCILIATION
  → investor records visible to Super Admin/FO → account creation → invitation
  → first login → forced password change → KYC/profile completion → full dashboard
```
Every stage must be traceable back to a specific `import_batches` row.

### 4.2 Staging, not direct insert
Never write spreadsheet rows straight into `profiles` / `investor_details` /
`investment_positions`. Stage first:

- `import_batches`: id, source filename, uploaded_by, uploaded_at, source type,
  total/valid/invalid/warning/imported/failed row counts, status, completed_at.
- `import_rows`: batch_id, source_row_number, `source_data jsonb` (the raw row,
  untouched), `mapped_data jsonb` (after column mapping), validation_status,
  validation_errors, validation_warnings, resolution (imported / skipped /
  duplicate / failed), linked investor/investment id once committed.

Keep the raw `source_data` forever, even after successful import — it's the
only way to answer "what did the original spreadsheet actually say" months
later during a dispute.

### 4.3 Column mapping — intelligent suggestion, human confirmation
Inspect the uploaded file's real headers; suggest a mapping (e.g. "Investor
Name" / "Full Name" / "Client Name" → `investor.full_name`) but never assume
it silently. The admin must see and can override: auto-matched fields,
manually-mapped fields, unmapped fields, ambiguous fields, and required-but-
missing fields — before anything is validated, let alone imported.

### 4.4 Validation rules — never silently transform
If a date, amount, or position is ambiguous, **flag it, don't guess.** A date
like `12/06/2020` with no established convention in the source file is
ambiguous (12 June vs. 6 December) — surface it as a warning requiring human
resolution, don't default to one interpretation. Same for amounts with unclear
currency/formatting, and for any field the mapping couldn't confidently place.

### 4.5 Duplicate detection & idempotency (mandatory)
Uploading the same file twice — or the same investor appearing on two different
sheets — must never double a balance. Detect duplicates on (at minimum): same
investor by a stable identity signal (Member ID if the sheet has one, otherwise
name + phone/email combination — flag ambiguous matches for human review, don't
auto-merge on a weak signal), and same investment record (investor + amount +
date, or an explicit source reference if the sheet has one). Every row's
resolution should read as one of: New, Already imported, Possible duplicate
(needs human decision), Conflict.

### 4.6 Reconciliation report (mandatory, both pre- and post-import)
Before import: show total row count and total monetary value from the source
next to what will actually be imported (valid rows only), with the delta
explained (X rows failed validation, Y are duplicates, etc.). After import:
re-run the same comparison against what actually landed in the database. A
migration is not "done" until source totals and system totals reconcile to
zero, or every non-zero delta has a stated reason.

---

## 5. Historical calculation engine

**Maturity is computed from the investment's original date, never from the
migration date or the investor's first-login date.** If the source gives an
investment date of 15 June 2020 and a 24-month term, the maturity date is
15 June 2022 — regardless of whether the investor's Jebbidox login is created
in August 2026. If the source directly supplies a maturity date, prefer that
over recomputing one, unless it's inconsistent with the date+term also
supplied (in which case: flag it, don't silently pick one).

**Never invent financial terms.** If the sheet doesn't supply enough to
calculate maturity confidently (no date, no term, no explicit maturity date),
flag the row rather than manufacturing a rate, term, or date. If a rate needs
to come from somewhere, it should be the historical `investment_packages` rate
that was actually in effect for that package at that time — check whether that
history exists anywhere before assuming today's `investment_packages` row is
correct for a 2020 investment.

**One investor, multiple independent positions.** Don't flatten multiple
historical investments into one balance — each becomes its own
`investment_positions` row (via §3.1's dedicated import function), independently
trackable through the existing maturity-status logic (`MaturityCentre.jsx`,
`maturity-actions.js`) once imported.

---

## 6. Account onboarding & invitation

### 6.1 What already exists — reuse it
- `randomTempPassword()` (`src/lib/actions/auth-actions.js`) — Node `crypto`-based,
  guarantees the character-class mix `checkPasswordStrength()` requires. Reuse
  this exact function; do not write a second temp-password generator.
- The `must_change_password: true` + `account_status: 'invited'` pattern, already
  used for admin-created investor/FO accounts. Reuse it for migrated investors'
  account creation — don't invent a parallel "migrated investor" account state.
- `ForcedPasswordChange.jsx` — already the screen shown on first login when
  `must_change_password` is true. Reuse it; don't build a second one.
- `checkPasswordStrength()` / `passwordStrengthError()`
  (`src/lib/password-policy.js`) — the one password policy in the app. A
  migrated investor's new permanent password goes through this, same as
  everyone else's.
- `prevent_role_escalation()` trigger already restricts who can flip
  `must_change_password`/`account_status` on a profile — a super_admin-only
  server action for account creation already respects this; don't try to work
  around it.

### 6.2 What genuinely needs to be built (confirmed absent, checked directly)
- **A 48-hour expiry on the temp password.** Doesn't exist today — an
  admin-issued temp password currently never expires. Needs: an issued-at
  timestamp, a check at login time (`login()` in `auth-actions.js`) that
  rejects an expired-but-unused temp credential with a clear, specific error
  ("This invitation has expired — ask an administrator to resend it"), and a
  "resend invitation" action for staff.
- **An actual invitation email.** Confirmed: nothing in this repo calls the
  Resend API to send mail today. The existing Resend wiring
  (`app/api/webhooks/resend/route.js`) only *receives* delivery-status webhooks;
  it doesn't send anything. Confirmed separately: the app's *confirmation*
  emails (self-registration) go through Supabase Auth's own SMTP, configured
  in the Supabase Dashboard to relay through Resend — no application code talks
  to Resend directly for that flow either (see `docs/database-schema.md` §8).
  Decide deliberately between two real options rather than defaulting to
  whichever is easiest:
  1. **Supabase Auth's native admin-invite mechanism** (magic-link/OTP based).
     Most consistent with the existing confirmation-email setup, but doesn't
     naturally produce a literal "temporary password" the user types — it's a
     link-based flow. Would require adapting the "type a temp password, then
     forced-change screen" requirement to a magic-link equivalent, which is a
     product decision, not just an implementation detail.
  2. **A new outbound Resend API call** (this session has `mcp__Resend__*`
     tools available if useful for setting up an API key/domain/template),
     sending the actual temp password by email, matching the "temp password
     expires in two days" requirement exactly as specified. This is more work
     (new send action, new API key, new email template) but matches the
     product requirement precisely without redesigning it around magic links.

  **Recommendation: option 2**, since it matches what was actually asked for
  (a temp password, not a magic link) and reuses the existing temp-password
  mechanism rather than replacing it. Flag this decision to a human before
  committing to it, though — it's a real fork, not a style preference.

### 6.3 Flow
```
Migrated investor exists (auth account = none yet)
  → Super Admin/FO selects investor → "Create Account"
  → links to the EXISTING investor record (must not create a second one —
    verify by investor_details.profile_id / Member ID before creating anything)
  → temp password generated (randomTempPassword(), reused)
  → account_status = 'invited', must_change_password = true, expiry timestamp set
  → invitation email sent (per 6.2's chosen path) with the temp password,
    expiry notice, login URL, Jebbidox branding, support contact
  → investor signs in with temp password (rejected if expired — clear error)
  → ForcedPasswordChange.jsx (existing screen, reused)
  → permanent password set, must_change_password flips false (server-side only,
    per the existing prevent_role_escalation constraint)
  → lands on dashboard
```

---

## 7. Investor dashboard requirements

On first landing, a migrated investor should immediately see — not an empty
state, not a generic dashboard:
- Their historical investment positions, with real historical dates.
- Current position value, maturity date, and maturity status per position
  (reuse the existing maturity-status categorization already in
  `MaturityCentre.jsx` — don't invent a second one).
- A clear line communicating the migration itself: "Your historical investment
  records have been migrated to Jebbidox."
- Profile/KYC completion prompt if `kyc_status` isn't `approved` — reuse the
  existing `FrozenAccountScreen`-style pattern (a focused, standalone
  "complete this before continuing" screen) as the model for what a
  KYC-incomplete-but-not-frozen prompt should feel like, rather than a
  dismissible banner easy to ignore.
- A statement view resembling a real investment statement (date, description,
  position, amount, status, in a table) — matches the existing
  "digital passbook" direction (see the Member Ledger card in
  `InvestorDashboard.jsx` for the established visual language to extend, not
  replace).

---

## 8. Super Admin migration dashboard

A dedicated area (new nav entry under Super Admin, alongside the existing
`settings`/`auditlogs` entries in `src/lib/constants.js`'s `NAV.super_admin`)
covering: Upload → Preview (row counts, valid/warning/error breakdown) →
Mapping review → Validation issue list → Dry-run reconciliation → Confirm
Import → Post-import reconciliation → Import batch history (inspect any past
batch: source file, uploaded by/when, row counts, status).

A **Maturity Watch** summary (X maturing this month / within 30 / within 90
days, clickable through to the relevant investors) is a natural extension of
data that already exists in `investment_positions` — likely more valuable
built as a general admin feature than scoped only to migrated records, but
scope that decision to whoever picks this up rather than assuming here.

---

## 9. RBAC — matches existing roles exactly

No new roles. Map onto the existing three (`investor`, `finance_officer`,
`super_admin`, per `src/lib/theme.js`/`ROLE_LABEL` and the RLS `is_staff()`/
`is_super_admin()` helpers):

- **Super Admin**: upload, map, validate, approve imports, view all investors,
  create accounts, resend/revoke invitations, export all/filtered data, correct
  migration issues (audited).
- **Finance Officer**: view migrated investors and records they're already
  authorized to see (same `is_staff()` scope as everywhere else), assist
  onboarding, view maturities — extend existing FO permissions, don't grant FO
  anything Super-Admin-only like raw file upload unless the club's actual
  policy says otherwise (flag this as a decision, don't assume).
- **Investor**: own history only, own statements, own profile/KYC completion.
  Investor isolation must hold exactly as it does today (verify with the same
  kind of direct RLS check this session used throughout its own security
  audit — see `docs/migration/` sibling docs / the Notion Engineering Log for
  the pattern: read the actual policy, don't assume from the code that calls it).

---

## 10. Exports

Excel export, multi-sheet, professionally structured (not a raw table dump):
Investor Summary, Investments, Transactions (where they exist), Maturity
Report, Migration Audit. Support filtering by investor, status, position,
maturity window, and date range before export. CSV export for the same
filtered sets. Every exported value must reconcile with what's actually in the
database — this is the same reconciliation discipline as §4.6, just applied
on the way out instead of the way in.

---

## 11. Security & financial integrity — non-negotiable checklist

- No investor duplication (same person doesn't become two `investor` records
  because of a name-format or email difference — flag ambiguous matches for
  human review rather than auto-merging or auto-splitting).
- No investment duplication on re-upload (see §4.5).
- No silent amount/date/maturity mutation — source values are preserved
  exactly unless an explicit, documented transformation applies.
- No orphaned investments (every position belongs to a real investor) or
  orphaned accounts (every auth account maps to exactly one investor record).
- Investor isolation and RBAC hold under direct RLS/RPC testing, not just
  "the UI doesn't show a button for it" — this session found real gaps of
  exactly this shape (functions with no caller check bypassing RLS entirely)
  during a separate security pass; re-read `docs/migration/` sibling context
  or the Notion Engineering Log entry from Aug 10, 2026 for the pattern before
  assuming a new SECURITY DEFINER function is safe just because it compiles.
- No secrets committed; no service-role key reachable from client code — this
  repo is already clean on both, keep it that way.

---

## 12. Testing — Playwright, matching existing conventions

Follow the existing pattern in `e2e/tests/` (`01-account-creation.spec.js`,
`02-deposit-flow.spec.js`): `test.describe` blocks, `requireEnv()` for
credentials, `e2eTag()` to mark all test-created data unmistakably (so it's
easy to find and clean up — see `e2e/README.md`), `data-testid` selectors, and
assertions on *specific, readable* success/failure states rather than generic
pass/fail.

Minimum coverage: valid-file import, invalid-file rejection with specific
errors, duplicate-row detection, ambiguous-date flagging, multi-position
investor, account creation linking to the correct existing investor (not a
duplicate), temp-credential expiry (both "still valid" and "expired" paths),
forced password change, dashboard showing correct historical + current data,
investor-to-investor isolation, staff-role boundaries, and export correctness.

**The one end-to-end scenario that must pass before this is called done:**
upload a fixture spreadsheet with one investor (invented member ID, real-shaped
data, tagged with `e2eTag()`) → validate → dry-run → import → verify the
investor and investment exist with the *original* dates/amounts intact →
create their account → invitation sent → sign in with temp password → forced
password change → land on dashboard → historical + current position visible
with correct maturity → re-upload the same file → confirm nothing duplicates.

---

## 13. Failure handling

Never surface "Something went wrong." Every validation/import failure names
the row, the field, the actual value, why it's a problem, and what to do about
it — e.g. "Row 47, Investment Date: '31/13/2020' is not a valid date. Correct
the source value and re-upload." Account-linking failures likewise: "This
investor already has an account (john@example.com)" rather than a generic
duplicate error.

---

## 14. Reversibility

No casual delete of financial records. If a rollback mechanism is built, it
must be Super-Admin-only, audited, scoped to a single import batch, and must
refuse to touch any record that's been modified by legitimate platform activity
since import (an approved withdrawal against a migrated position, for
instance). Prefer archival/soft-rollback over destructive deletion.

---

## 15. Design

Extend the established Jebbidox visual language — don't introduce a generic
admin-dashboard look. Concretely: `RED`/`INK`/`INK_SOFT` etc. from
`src/lib/marketingTheme.js` for anything public-facing, `C.*` tokens from
`src/lib/theme.js` for anything inside the authenticated app (works correctly
in both light/dark automatically since those are CSS custom properties), 8px
card radius, light shadows (`C.shadowCard`), Poppins throughout. The migration
dashboard and the investor statement view should both read as something a
real financial institution would ship — restrained, tabular, numerically
precise (`FONT_MONO` for amounts/reference numbers, matching how the rest of
the app already handles figures) — not a generic SaaS import wizard.

---

## 16. Working method

This project already has a documented skill-based process (Notion → JebbiDox →
Skills & Engineering Process) — use it rather than inventing a parallel one:
- **feature-builder** skill for the overall plan→design→implement→test→document→
  verify loop and the JBDocs Definition of Done.
- **bug-investigator** skill's evidence-first approach (reproduce against real
  data, real Supabase logs — not code review alone) for anything that doesn't
  behave as expected during testing.
- **deployment-checker** skill before any deploy touching this feature.
- **security-review** skill (or the same manual RLS/SECURITY DEFINER audit
  method used in this session's Aug 10 security pass) specifically for the new
  `import_historical_investment()` function and any new RLS policies —
  functions that bypass the normal write path are exactly where this kind of
  project has had real, previously-undiscovered gaps.

Self-correction loop: inspect → plan → implement → build → test → on failure,
diagnose the actual root cause (don't guess-and-retry) → fix → retest →
regression test → only then report. This project's Engineering Log
(Notion → JebbiDox → Engineering Log — Root Causes & Fixes) is full of examples
where the first theory was wrong and the real cause was one layer away —
budget for that here too, especially around date/timezone handling and the
`investment_positions` invariant in §3.1.

---

## 17. Definition of done

Not done until, with real database records and real auth/email infrastructure
(not mocked):
- 100% of valid source rows import; invalid rows are explicitly reported, none
  silently dropped; source and system totals reconcile to zero (or every delta
  is explained).
- Historical dates, amounts, and maturity dates are preserved exactly; no
  investment is duplicated on re-import.
- A migrated investor can be linked to a new auth account with zero duplicate
  investor records.
- Temp credentials expire at 48 hours; expired credentials are rejected with a
  specific error; the forced-password-change flow produces a working permanent
  password.
- Investor isolation and RBAC hold under direct testing, not just UI absence.
- Invitation email actually sends (via whichever path §6.2 lands on) and
  contains a working login URL and the correct investor's temp credential.
- Investor dashboard shows correct historical + current + maturity data and
  the correct Member ID; KYC/profile completion is prompted, not silently
  skipped.
- Full/filtered/investor-specific/maturity exports work and reconcile with the
  database.
- The §12 end-to-end scenario passes, including the re-upload-doesn't-duplicate
  check.
- `npm run build` is clean.

## 18. Final report format

When implementation is reported back, it must be a real status report against
§17's checklist (PASS/FAIL per item, not a blanket "done"), listing files
changed, migrations created and applied (with confirmation they were verified
live, not just that the migration ran), tests executed and their results, and
anything left incomplete stated explicitly — not implied by omission.

---

## Appendix: what's needed from the club before implementation can start

- The actual Google Sheet (or a real export/sample of it) — headers alone
  aren't enough to design the column mapping or spot ambiguity.
- Confirmation of the currency/formatting convention used for amounts.
- Confirmation of the date format convention used (especially for any
  DD/MM vs MM/DD ambiguous entries).
- Whether historical investment terms/rates differ from today's
  `investment_packages` config, and if so, what the actual historical rates
  were (needed to compute correct historical maturity values per §5).
- The club's actual policy on whether an unverified (KYC-incomplete) investor
  should be blocked from withdrawing, require extra approval, or something
  else — §5/§9 deliberately does not invent this rule; it must be supplied
  and made configurable, not hardcoded from a guess.
