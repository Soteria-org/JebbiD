# JebbiDox — User Manual

This guide covers what each of the three account types can do in JebbiDox.

**Last updated:** 2026-08-01

---

## Getting Started

1. Go to the JebbiDox website. The landing page introduces the club and links to **Sign In**.
2. **New members:** click "Create an Investor Account" from the sign-in screen and fill in the registration form. A confirmation email is sent — click the link in it to activate the account.
3. **Returning members:** sign in with your **Member ID** (format `JBD-2026-000101`), your username, or your email, plus your password.
4. **Forgot your password?** Click "Forgot your password?" on the sign-in screen, enter your Member ID or email, and a reset link will be emailed to you (if the account exists — for security, you'll see the same message either way). Follow the link to set a new password.
5. Trouble signing in? Contact **zeal247invest@gmail.com** — every failed sign-in attempt is logged and visible to staff, and most account-setup problems now fix themselves automatically the next time you try to sign in. Note: after 5 failed sign-in attempts within 15 minutes, sign-in is temporarily locked for security — wait 15 minutes and try again.

---

## Investor Account

The investor dashboard is your home wallet view — current balance, active positions, and quick actions.

**Navigation:**
- **Dashboard** — portfolio summary. If your account has a pending requirement, you'll see a countdown banner here (see "Account warnings" below).
- **New Investment** — start a new deposit into a package (Standard: 30% return / 12 months, or Corporate: 40% return / 12 months for larger amounts).
- **My Investments** — every position you hold, its principal, expected maturity value, and maturity date.
- **Transactions** — full history of deposits and their approval status.
- **Withdrawals** — request a withdrawal against a matured or eligible position.
- **Maturity Centre** — when a position matures, choose: withdraw, reinvest, or switch packages.
- **Notifications** — messages from the club, including any personal messages from staff.
- **Statements** — download or print a formatted account statement, and print/download individual deposit receipts.
- **Profile & Settings** — update your details, change your password, complete KYC document upload.

**Account warnings.** If your account is missing something required — KYC verification, contact/next-of-kin details, or activity on a dormant account — staff may send you a warning with a real deadline. You'll see:
- A countdown badge next to the notification bell (top of every screen)
- A banner on your Dashboard explaining exactly what's needed and by when

If the deadline passes without the issue being resolved, a Super Admin can pause your account. **This is a real consequence, not just a reminder** — if you're warned, act on it before the countdown reaches zero. If your account is paused, you won't be able to sign in; contact **zeal247invest@gmail.com** to resolve it.

**Printable documents:** every deposit receipt and account statement is a real, self-contained printable page. Reference numbers on these documents (e.g. `DEP-00001`, `POS-00001`) are your account's own reference codes, not internal database IDs.

---

## Finance Officer Account

Finance Officers manage the day-to-day operational side of the club.

**Navigation:**
- **Dashboard** — operational summary: pending approvals, recent activity.
- **Investors** — the full member list; open any investor to see their full history.
- **Deposits** / **Withdrawals** — approval queues.
- **Notifications**, **Reports**, **Audit Logs**.

Finance Officers can create investor accounts directly and can send warnings (with a real deadline) to investors flagged in Risk & Compliance Monitor — but **cannot** freeze or unfreeze an account; that's Super Admin only.

---

## Super Admin Account

The Super Admin has everything a Finance Officer has, plus club-wide oversight tools.

**Club Intelligence Centre** (home screen) — club financial/membership health, plus a **broadcast** tool for messaging all investors or all finance officers at once.

**Risk & Compliance Monitor** — surfaces accounts needing attention (incomplete KYC, dormant, missing information, overdue approvals, repeated failed logins), plus three account-lifecycle sections:
- **Warn** action on flagged findings — sends a message **and** starts a real, visible countdown on that investor's account (default 7 days, adjustable).
- **Pending Freezes** — every investor currently on a countdown. Freeze early if you're sure nothing will change, or Clear the warning if they've resolved the issue.
- **Frozen Accounts** — every currently-paused investor, with an Unfreeze button to restore access.

Freezing an account sets it to "paused" — the investor cannot sign in until a Super Admin unfreezes it. This is real and immediate; there's no separate confirmation step, so only freeze an account you actually intend to lock out. Unfreezing also clears any pending warning on that account, so the investor doesn't see a stale countdown after being restored.

You can also freeze/unfreeze directly from an individual investor's detail page (Investors → click a name), not just from the Risk & Compliance list.

**Settings** — club-wide configuration.

---

## Common Questions

**"Why can't I see a raw ID/UUID anywhere?"** — By design. Every record has a human-readable reference number instead.

**"I didn't get my confirmation email."** — Check spam first. A Super Admin can check the email delivery log (Club Intelligence Centre) once it's fully wired up — as of this writing, that log isn't populating yet (see Developer Guide).

**"My investment matured — what happens?"** — Nothing automatic. You'll see it in the Maturity Centre, where you actively choose: withdraw, reinvest, or switch packages.

**"I got a warning about my account being paused — is that real?"** — Yes. It sets a genuine deadline the system enforces; a Super Admin can freeze the account once it passes. Resolve the stated issue (or contact support) before the countdown reaches zero.
