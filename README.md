# JBDocs Frontend — Next.js Structure

Refactor of the single-file prototype (`jbdocs-prototype.jsx`, 2,720 lines) into a
navigable Next.js (App Router) project. **Visual design is unchanged** — this is a
structural refactor only, done by mechanically extracting each top-level component /
constant / helper into its own module and auto-resolving imports. No JSX, styling, or
business logic was rewritten.

## Why this structure

The old file was fine for a single demo artifact but impossible to hand to Cursor (or
anyone) for backend integration — every edit risked touching unrelated screens, and
there was no seam between "UI" and "app state / business rules." This refactor creates
those seams without touching behavior:

```
app/
  layout.js               Root HTML shell
  page.js                 Renders <JBDocsApp />

src/
  state/
    useJBDocsStore.js      ALL app state + business logic (auth, deposits, withdrawals,
                            investments, FO management, audit log, notifications).
                            This is the file that gets rewired to Supabase later — its
                            RETURN SHAPE (the `ctx` object) is the contract every screen
                            is built against, so screens should not need to change when
                            the internals move from useState to real queries/mutations.

  app-shell/
    JBDocsApp.jsx           Thin routing shell: calls useJBDocsStore(), decides which
                            screen to render based on role + view, renders Sidebar/
                            Toast/modals. No business logic lives here.

  components/
    icons/index.jsx         Self-contained inline SVG icon set (54 icons, no external
                            package — avoids version-drift failures).
    ui/primitives.jsx       Design-system primitives: Btn, Card, Badge, Field, Modal,
                            Toast, StatCard, ProgressBar, table primitives, etc.
    layout/                 Sidebar, Header, PageShell, RoleSwitcher (persistent chrome).

  features/
    auth/                   LoginScreen, RegisterWizard, ForcedPasswordChange
    investor/                Investor-facing screens (dashboard, invest wizard,
                            investments, transactions, withdrawals, maturity centre,
                            notifications, statements, profile)
    finance/                 FODashboard (Finance Officer landing page)
    staff/                   Screens shared by Finance Officer AND Super Admin
                            (investors table, investor detail, deposits/withdrawals
                            queues, reports, audit logs)
    admin/                    Super Admin-only screens (admin dashboard, all
                            investments, settings, create-FO modal)

  lib/
    theme.js                Design tokens (colors `C`, fonts)
    constants.js             Business constants (rates, thresholds, GOALS, NAV, role
                            labels) — this is where package-rate/period changes get made
    format.js                Pure helper functions (currency/date formatting, maturity
                            math, id padding)
    seedData.js               In-memory demo seed data (investors, positions, staff,
                            audit log, notifications) — this is what gets deleted once
                            Supabase is wired up
```

## What this refactor deliberately does NOT do yet

- **No Supabase integration.** `useJBDocsStore.js` is still 100% in-memory (resets on
  refresh), exactly like the original prototype. It's structured so that swapping its
  internals for Supabase calls is a contained change.
- **No renaming.** Every component, prop, and function keeps its original name so this
  is a mechanical, low-risk move — not a rewrite.
- **UI primitives were kept in one file** (`components/ui/primitives.jsx`) rather than
  one-file-per-component. 20 one-line files felt like more friction than value; this can
  be split further later if the team wants strict one-component-per-file.
- **KYC uploads, package-validation hardening, and the other issues from the backend
  master prompt are not addressed here** — this task was scoped to structure only. They
  should be tackled next, now that there's a clean place to put each fix (e.g. package
  validation belongs in `InvestWizard.jsx` + eventually a server action).

## Getting it running

```bash
npm install
npm run dev
```

This needs `next`, `react`, `react-dom`, and `recharts` installed (see `package.json`).
The sandbox this refactor was built in has no network access, so `npm install` /
`next build` could not be executed here — see **Validation performed** below for what
was checked instead.

## Validation performed (without network access)

1. Every one of the 39 generated component/lib files was parsed with `tsx`/esbuild —
   all passed (only failure mode possible in this environment is "cannot find module"
   for the `@/...` aliases, which is expected without a bundler; zero real syntax
   errors).
2. A static cross-reference audit confirmed every identifier used in every file is
   either imported or locally declared — zero missing imports.
3. Bracket/brace balance was verified for every file.
4. Export count (134) reconciles against the original file's top-level declaration
   count (133) + 1 (the new `JBDocsApp` shell wraps what was previously inline).

**Recommended before merging:** run `npm install && npm run build` locally / in CI to
catch anything only a real bundler (webpack) can catch — e.g. React Hook rule
violations across file boundaries, which static analysis can't fully verify.

## Suggested order for Cursor / backend integration

1. `npm install && npm run dev` — confirm the demo still behaves identically to the
   original single-file version (auth, role switching, all wizards, approvals).
2. Wire `src/lib/seedData.js` → Supabase read on app load (replace `buildSeed()`).
3. Rewire `src/state/useJBDocsStore.js` function-by-function (start with `loginInvestor`
   / `registerInvestor` → Supabase Auth), keeping the `ctx` shape stable so screens don't
   change.
4. Tackle the fixes from the backend master prompt (package validation, admin-created
   user onboarding, KYC capture, richer deposit review) inside the relevant
   `features/**` file now that each has a dedicated home.
