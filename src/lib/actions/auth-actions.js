"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { passwordStrengthError } from "@/lib/password-policy";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { randomTempPassword, isTempPasswordExpired } from "@/lib/temp-credentials";

/**
 * All functions here are Server Actions — they run only on the server, never ship to
 * the browser bundle. Screens call these instead of touching Supabase directly.
 *
 * Return shape convention: { success: true, ...data } or { error: "message" }.
 * Never throw — callers (eventually useJBDocsStore) expect to check `.error`.
 */

function isDevAuthBypassEnabled() {
  return process.env.NODE_ENV !== "production";
}

/**
 * Creates the profiles + investor_details rows for a newly confirmed/signed-up
 * investor. Called from two places: registerInvestor() directly (email confirmation
 * OFF — session exists immediately), and app/auth/confirm/route.js (email
 * confirmation ON — session only exists after the link is clicked). Idempotent: if
 * the rows already exist (e.g. the confirmation link is opened twice), it's a no-op
 * rather than an error.
 */
export async function createInvestorProfileRows(supabase, userId, meta) {
  const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) return { success: true, userId, alreadyExisted: true };

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    role: "investor",
    full_name: meta.full_name ?? meta.fullName,
    email: meta.email,
    phone: meta.phone ?? null,
    username: meta.username ?? null,
  });
  if (profileError) return { error: profileError.message };

  const { error: detailsError } = await supabase.from("investor_details").insert({
    profile_id: userId,
    national_id_number: meta.national_id_number ?? meta.nationalIdNumber ?? null,
    address: meta.address ?? null,
    occupation: meta.occupation ?? null,
    financial_goal: meta.financial_goal ?? meta.financialGoal ?? null,
    next_of_kin_name: meta.next_of_kin_name ?? meta.nextOfKinName ?? null,
    next_of_kin_phone: meta.next_of_kin_phone ?? meta.nextOfKinPhone ?? null,
    next_of_kin_relationship: meta.next_of_kin_relationship ?? meta.nextOfKinRelationship ?? null,
  });
  if (detailsError) return { error: detailsError.message };

  // Runs as the newly-authenticated investor (auth.uid() = userId at this point,
  // whether we got here via immediate session or via the confirm-link callback), so
  // the audit trail correctly shows self-registration as the investor's own action.
  await supabase.rpc("log_audit", {
    p_action: "Investor Registered",
    p_entity_table: "profiles",
    p_entity_id: userId,
    p_previous_value: null,
    p_new_value: { full_name: meta.full_name ?? meta.fullName, email: meta.email },
  });

  return { success: true, userId };
}

/**
 * Investor self-registration. Works correctly whether Supabase's "Confirm email"
 * setting is ON or OFF, without needing to know which at call time:
 *
 *  - OFF (local dev, or if you choose to keep it off in prod): signUp() returns an
 *    active session immediately: profile rows are created right here, same as before.
 *  - ON (recommended for prod once Resend/SMTP is live): signUp() returns a user but
 *    NO session — nothing in `profiles`/`investor_details` can be created yet because
 *    there's no auth.uid() to satisfy RLS. Instead, the intended profile fields ride
 *    along as auth user_metadata (available even pre-confirmation), and
 *    app/auth/confirm/route.js creates the rows once the investor actually clicks the
 *    emailed link and a session exists.
 */
export async function registerInvestor(input) {
  try {
    const supabase = await createClient();

    const pwError = passwordStrengthError(input.password);
    if (pwError) return { error: pwError };

    if (isDevAuthBypassEnabled()) {
      const admin = createAdminClient();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          full_name: input.fullName,
          phone: input.phone ?? null,
          username: input.username ?? null,
          national_id_number: input.nationalIdNumber ?? null,
          address: input.address ?? null,
          occupation: input.occupation ?? null,
          financial_goal: input.financialGoal ?? null,
          next_of_kin_name: input.nextOfKinName ?? null,
          next_of_kin_phone: input.nextOfKinPhone ?? null,
          next_of_kin_relationship: input.nextOfKinRelationship ?? null,
        },
      });
      if (createError) return { error: createError.message };

      const userId = created?.user?.id;
      if (!userId) return { error: "Registration did not return a user object at all — check Supabase Auth is enabled." };

      const profileResult = await createInvestorProfileRows(supabase, userId, { ...input, email: input.email });
      if (profileResult.error) return { error: profileResult.error };

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (signInError) return { error: signInError.message };

      return {
        success: true,
        profile: {
          id: userId,
          role: "investor",
          full_name: input.fullName,
          member_id: null,
          must_change_password: false,
          account_status: "active",
        },
      };
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          phone: input.phone ?? null,
          username: input.username ?? null,
          national_id_number: input.nationalIdNumber ?? null,
          address: input.address ?? null,
          occupation: input.occupation ?? null,
          financial_goal: input.financialGoal ?? null,
          next_of_kin_name: input.nextOfKinName ?? null,
          next_of_kin_phone: input.nextOfKinPhone ?? null,
          next_of_kin_relationship: input.nextOfKinRelationship ?? null,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
      },
    });
    if (authError) return { error: authError.message };

    const userId = authData.user?.id;
    if (!userId) return { error: "Registration did not return a user object at all — check Supabase Auth is enabled." };

    if (!authData.session) {
      // Email confirmation is ON. No profile row yet — that's correct, not a bug.
      return { success: true, pendingConfirmation: true, email: input.email };
    }

    return createInvestorProfileRows(supabase, userId, { ...input, email: input.email });
  } catch (err) {
    return { error: "Registration failed unexpectedly: " + (err?.message || String(err)) };
  }
}

/**
 * Records a failed sign-in — Risk & Compliance Monitor surfaces repeated
 * failures per identifier. Uses the admin client deliberately: at this point
 * in login(), the caller usually isn't authenticated yet (that's WHY it
 * failed), so there's no auth.uid() an RLS-scoped insert could even run as.
 * login_attempts has no INSERT policy for any client role — this is the only
 * path in. Never throws into the caller: a logging failure must not turn an
 * already-correct "wrong password" response into a crash.
 */
async function logFailedLogin(identifier, reason) {
  try {
    const admin = createAdminClient();
    await admin.from("login_attempts").insert({ identifier: identifier || "unknown", reason });
  } catch (err) {
    // Swallow — see comment above.
  }
}

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

/**
 * Real enforcement on top of login_attempts, which previously only recorded
 * failures for Risk & Compliance Monitor to look at after the fact — nothing
 * actually stopped a brute-force attempt in progress. Keyed on the raw
 * identifier the caller typed (same value logFailedLogin records), so
 * guessing passwords against one Member ID/email/username gets locked out
 * regardless of which form of it they type. Checked BEFORE calling
 * Supabase Auth at all, so a lockout costs the attacker nothing extra to
 * discover (no timing difference from a real credential check) and costs
 * Supabase Auth's own rate limits nothing either.
 */
async function isRateLimited(identifier) {
  if (!identifier) return false;
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count, error } = await admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("identifier", identifier)
      .gte("created_at", since);
    if (error) return false; // fail open on our own logging infra, not on the user
    return (count || 0) >= RATE_LIMIT_MAX_ATTEMPTS;
  } catch {
    return false;
  }
}

/**
 * Login for any role (investor, finance_officer, super_admin) — role comes from
 * profiles, not a separate login screen per role. Accepts either an email or a
 * Member ID (JBD-2026-000123) as the identifier; Supabase Auth itself only signs in
 * by email, so a Member ID is resolved to its email first via resolve_login_email()
 * (migration 012) — the one sanctioned pre-auth profile lookup.
 */
export async function login(input) {
  if (await isRateLimited(input.identifier)) {
    return {
      error: `Too many failed sign-in attempts. Please wait ${RATE_LIMIT_WINDOW_MINUTES} minutes and try again, or contact ${SUPPORT_EMAIL}.`,
    };
  }

  const supabase = await createClient();

  let email = input.identifier;
  if (!email.includes("@")) {
    const { data: resolvedEmail, error: resolveError } = await supabase.rpc("resolve_login_email", {
      p_identifier: input.identifier,
    });
    if (resolveError || !resolvedEmail) {
      await logFailedLogin(input.identifier, "account_not_found");
      return { error: "No account found with that Member ID or email." };
    }
    email = resolvedEmail;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error) {
    await logFailedLogin(input.identifier, "invalid_credentials");
    return { error: "Incorrect Member ID/email or password." };
  }

  // investor_details is joined here (not just fetched separately) so that
  // ProfileScreen/StatementsScreen/InvestWizard have real National ID, Address,
  // Occupation, Financial Goal, and Next of Kin data immediately on login instead
  // of showing blank fields until some other screen happens to load them. For
  // staff roles the embed simply comes back empty/null, which is fine — nothing
  // downstream reads it for them.
  // FIXED (real incident): .single() throws PostgREST's opaque "cannot
  // coerce the result to a single JSON object" (406) when zero rows come
  // back — which is exactly what happened to a real user whose email
  // confirmation never created a profiles row (see app/auth/confirm/route.js
  // for the actual fix). .maybeSingle() + an explicit check turns that into
  // a real, actionable message instead of a raw Postgres error reaching the
  // login screen.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id, role, full_name, member_id, must_change_password, account_status, created_at,
      phone, username, email, pause_warning_at, pause_deadline, temp_password_issued_at, migration_status,
      investor_details ( national_id_number, address, occupation, financial_goal,
        next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, kyc_status,
        financial_history_status, verification_status )
    `)
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) return { error: profileError.message };
  if (!profile) {
    // Self-heal: this is the same orphaned-account state fixed in
    // app/auth/confirm/route.js (the confirm callback now uses the admin
    // client), but that only prevents *new* occurrences going forward — it
    // can't retroactively repair accounts that were already orphaned before
    // that fix shipped, and it's still cheap insurance against any future
    // failure mode that leaves auth.users ahead of profiles. Rather than
    // just erroring, rebuild the missing profile/investor_details rows right
    // here from the auth user's own signup metadata (still present on
    // data.user.user_metadata regardless of how long ago they signed up),
    // then retry the fetch once before giving up.
    const admin = createAdminClient();
    const meta = data.user.user_metadata ?? {};
    const healResult = await createInvestorProfileRows(admin, data.user.id, {
      ...meta,
      email: data.user.email,
    });

    if (healResult.success) {
      const { data: healedProfile, error: healedProfileError } = await supabase
        .from("profiles")
        .select(`
          id, role, full_name, member_id, must_change_password, account_status, created_at,
          phone, username, email, migration_status,
          investor_details ( national_id_number, address, occupation, financial_goal,
            next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, kyc_status,
            financial_history_status, verification_status )
        `)
        .eq("id", data.user.id)
        .maybeSingle();

      if (!healedProfileError && healedProfile) {
        return { success: true, profile: healedProfile };
      }
    }

    await supabase.auth.signOut();
    await logFailedLogin(email, "account_setup_incomplete");
    return {
      error: `Your account exists but setup didn't finish, and we weren't able to fix it automatically — this can happen if email confirmation was interrupted. Please contact support at ${SUPPORT_EMAIL} so we can complete your account.`,
    };
  }

  if (profile.must_change_password && isTempPasswordExpired(profile.temp_password_issued_at)) {
    // The temp password itself just worked (signInWithPassword succeeded above),
    // so this can't be blocked earlier — only after we know which account it is
    // and how old its temp credential is. Sign back out immediately: a login that
    // "succeeds" past this point is exactly the un-expiring-temp-password gap
    // spec §6.2 called out as genuinely missing before this migration.
    await supabase.auth.signOut();
    await logFailedLogin(email, "temp_credential_expired");
    return {
      error: "This invitation has expired — ask an administrator to resend it.",
    };
  }

  if (profile.account_status === "suspended") {
    // set_account_freeze() only ever freezes investor rows (enforced server-side in
    // that RPC), so 'suspended' should never occur for staff — but if it somehow did,
    // still hard-block them the way this always worked. A suspended INVESTOR is let
    // in on purpose: JBDocsApp routes them to FrozenAccountScreen instead of the
    // normal dashboard, which is how they see the freeze, upload whatever resolves
    // it, and get unfrozen — none of that is reachable if they're signed straight
    // back out here. RLS (deposits_insert/withdrawals_insert) is what actually stops
    // a frozen investor from transacting, not this check.
    if (profile.role !== "investor") {
      await supabase.auth.signOut();
      await logFailedLogin(email, "account_suspended");
      return { error: `This account has been paused. Contact ${SUPPORT_EMAIL} to resolve this.` };
    }
  }

  return { success: true, profile };
}

/**
 * Restores ctx.session from the real Supabase auth cookie on page load/refresh.
 * The app shell used to have no bootstrap at all — session only ever came from an
 * explicit loginInvestor() call — so a page refresh always dropped back to the
 * login screen even though the Supabase auth cookie (refreshed by middleware.js on
 * every request) was still perfectly valid. Mirrors login()'s profile shape so
 * useJBDocsStore can feed the result straight into the same bridgeProfile() path.
 * Never returns an error for "not signed in" — that's the normal logged-out state,
 * not a failure. Also never THROWS, even on a transient network/Supabase failure —
 * the caller (useJBDocsStore's mount effect) uses this result to decide when to stop
 * showing the initial loading screen, so an uncaught rejection here would leave every
 * visitor stuck on that loader indefinitely instead of just falling back to the
 * normal login screen.
 */
export async function getCurrentSession() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: true, profile: null };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id, role, full_name, member_id, must_change_password, account_status, created_at,
        phone, username, email, pause_warning_at, pause_deadline, migration_status,
        investor_details ( national_id_number, address, occupation, financial_goal,
          next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, kyc_status,
          financial_history_status, verification_status )
      `)
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) return { success: true, profile: null };

    if (profile.account_status === "suspended" && profile.role !== "investor") {
      await supabase.auth.signOut();
      return { success: true, profile: null };
    }

    return { success: true, profile };
  } catch (err) {
    return { success: true, profile: null };
  }
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { success: true };
}

/**
 * "Forgot your password?" — sends a recovery email via Supabase Auth if the
 * identifier resolves to a real, confirmed account. Deliberately returns
 * { success: true } in every case except a genuine rate-limit response,
 * regardless of whether the identifier actually matched anything — this is
 * the standard defense against using a password-reset form to enumerate
 * which emails/Member IDs are registered. Supabase Auth applies its own
 * send-rate-limit on top of this (independent of the login rate limit
 * above, which only governs sign-in attempts).
 */
export async function requestPasswordReset(identifier) {
  const supabase = await createClient();

  let email = (identifier || "").trim();
  if (!email) return { success: true };

  if (!email.includes("@")) {
    const { data: resolvedEmail } = await supabase.rpc("resolve_login_email", { p_identifier: email });
    if (!resolvedEmail) return { success: true }; // don't reveal whether it existed
    email = resolvedEmail;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error && error.status === 429) {
    return { error: "Too many reset requests for this account. Please wait a few minutes and try again." };
  }
  return { success: true };
}

/**
 * The second half of the reset flow — called from the "set a new password"
 * page the investor lands on after clicking the emailed recovery link.
 * app/auth/reset-password/route.js already verified the recovery token and
 * established a real session before this page could even render, so this
 * only needs to check that a session still exists (it could have expired
 * between page load and submit) and enforce the same password policy used
 * everywhere else.
 */
export async function completePasswordReset(newPassword) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };

  const pwError = passwordStrengthError(newPassword);
  if (pwError) return { error: pwError };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  // The app shell (useJBDocsStore) has no existing-session bootstrap — it
  // only ever populates ctx.session via an explicit loginInvestor() call.
  // Leaving this recovery-flow session active would just be a dangling
  // authenticated cookie the app never uses, so sign out and send them
  // through the normal sign-in form with their new password instead.
  await supabase.auth.signOut();
  return { success: true };
}

/**
 * OTP-code alternative to the emailed-link flow above — entirely sidesteps
 * Supabase's redirect-URL allowlist (no link, no domain/www matching, no
 * "lands on the wrong page" failure mode), at the cost of requiring the
 * Supabase "Reset Password" email template to include {{ .Token }} (the
 * 6-digit code) in its body — a Dashboard-only edit, but a much smaller
 * and less error-prone one than getting a redirect URL to match exactly.
 *
 * Does verifyOtp (which both confirms the code AND establishes a session)
 * and updateUser in one call, since the UI collects the code and the new
 * password on the same screen rather than as two separate steps.
 */
export async function completePasswordResetWithCode(identifier, code, newPassword) {
  const supabase = await createClient();

  let email = (identifier || "").trim();
  if (!email) return { error: "Enter your Member ID or email." };
  if (!email.includes("@")) {
    const { data: resolvedEmail } = await supabase.rpc("resolve_login_email", { p_identifier: email });
    // Same identifier resolution login()/requestPasswordReset() use. If it
    // doesn't resolve, fall through to verifyOtp with the raw identifier —
    // it will fail the same way an invalid code does, so this still doesn't
    // reveal whether the account exists.
    if (resolvedEmail) email = resolvedEmail;
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: (code || "").trim(),
    type: "recovery",
  });
  if (verifyError) return { error: "That code is invalid or has expired. Please request a new one." };

  const pwError = passwordStrengthError(newPassword);
  if (pwError) return { error: pwError };

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) return { error: updateError.message };

  await supabase.auth.signOut();
  return { success: true };
}

/**
 * Admin-created account (investor OR finance_officer), with a temp password the
 * caller must display to the admin exactly once — nothing persists it server-side
 * beyond this call.
 *
 * Uses the service-role admin client because creating another user's auth.users row
 * is not something any RLS-scoped session can do, by design.
 */
export async function createStaffOrInvestorAccount(input) {
  try {
    const supabase = await createClient();

    const {
      data: { user: caller },
    } = await supabase.auth.getUser();
    if (!caller) return { error: "Not signed in." };

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile) return { error: "Could not verify your account." };

    if (!["investor", "finance_officer"].includes(input.role)) {
      return { error: "role must be 'investor' or 'finance_officer'." };
    }

    // Decision: Finance Officers can create INVESTOR accounts (normal front-desk work).
    // Only Super Admin can create Finance Officer accounts — enforced here AND at the
    // database level (migration 013's profiles_insert policy), so this check being
    // buggy wouldn't be the only thing standing between a Finance Officer and creating
    // another staff account.
    const isAllowed =
      callerProfile.role === "super_admin" ||
      (callerProfile.role === "finance_officer" && input.role === "investor");

    if (!isAllowed) {
      return {
        error:
          callerProfile.role === "finance_officer"
            ? "Finance Officers can create investor accounts, but not Finance Officer or Super Admin accounts."
            : "You are not authorized to create accounts.",
      };
    }

    if (!input.email) {
      return { error: "Email is required — Supabase Auth cannot create an account without one, even for walk-in investors." };
    }

    // Self-diagnosing check: without this, a missing/wrong SUPABASE_SERVICE_ROLE_KEY
    // in the deploy environment doesn't fail cleanly — createAdminClient() builds a
    // client that LOOKS valid, and the failure only surfaces later, deep inside the
    // Supabase Auth Admin API call, sometimes as a raw/opaque error that never
    // reaches the browser as readable text (Next.js strips unhandled Server Action
    // exception details in production). Checking for the key's presence up front
    // turns that into an immediate, specific, actionable error instead.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { error: "Server is not configured for account creation (missing SUPABASE_SERVICE_ROLE_KEY in the deploy environment). This is a deployment configuration issue, not something retrying will fix — check Netlify's environment variables." };
    }

    const tempPassword = randomTempPassword();
    const admin = createAdminClient();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone ?? null,
        username: input.username ?? null,
      },
    });
    if (createError) return { error: createError.message };

    const userId = created.user.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      role: input.role,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone ?? null,
      username: input.username ?? null,
      must_change_password: true,
      account_status: "invited",
      created_by: caller.id,
      temp_password_issued_at: new Date().toISOString(),
    });
    if (profileError) {
      // The auth.users row now exists with no matching profile — a ghost account
      // that will block this same email from ever being retried (Supabase Auth
      // won't allow a duplicate email) without ever showing up anywhere in the app.
      // Clean it up before returning the error, so a retry with the same email
      // actually has a chance of working.
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return { error: profileError.message };
    }

    if (input.role === "finance_officer") {
      const { error: staffError } = await admin.from("staff_details").insert({
        profile_id: userId,
        created_by: caller.id,
        department: input.department ?? null,
      });
      if (staffError) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
        return { error: staffError.message };
      }
    } else {
      // Previously only profile_id was ever inserted here — National ID, Address,
      // Occupation, Financial Goal, and Next of Kin were all collected on the
      // "Add Walk-in Investor" form and then silently discarded. Now actually saved.
      const { error: investorError } = await admin.from("investor_details").insert({
        profile_id: userId,
        national_id_number: input.nationalId ?? null,
        address: input.address ?? null,
        occupation: input.occupation ?? null,
        financial_goal: input.goal ?? null,
        next_of_kin_name: input.nokName ?? null,
        next_of_kin_relationship: input.nokRelationship ?? null,
        next_of_kin_phone: input.nokPhone ?? null,
      });
      if (investorError) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
        return { error: investorError.message };
      }
    }

    // Uses the CALLER's own session (not the admin client) so auth.uid() inside
    // log_audit() correctly resolves to the acting admin, not "System" — the admin
    // client has no user context, since it authenticates as the service role.
    await supabase.rpc("log_audit", {
      p_action: input.role === "finance_officer" ? "Finance Officer Created" : "Investor Registered (Admin)",
      p_entity_table: "profiles",
      p_entity_id: userId,
      p_previous_value: null,
      p_new_value: { full_name: input.fullName, email: input.email, role: input.role },
    });

    // Returned ONCE. The admin UI must show this to the admin and must not store it
    // anywhere client-side beyond the current session/component state.
    return { success: true, userId, tempPassword };
  } catch (err) {
    // Last-resort safety net: no matter what throws above (a malformed input, an
    // unexpected Supabase SDK error shape, anything), this guarantees the caller
    // gets back a real, readable { error } instead of an unhandled exception that
    // Next.js reduces to a generic, undebuggable message in production.
    return { error: "Account creation failed unexpectedly: " + (err?.message || String(err)) };
  }
}

/**
 * Persists investor profile edits (Profile screen -> Edit). Previously
 * updateInvestorProfile only ever patched local React state — the change looked
 * successful in the UI but vanished on refresh and was never visible to staff.
 * Phone lives on `profiles`; everything else here lives on `investor_details`.
 * Only issues an update to a table if there's actually a field for it, so a
 * partial edit (e.g. Next of Kin only) doesn't send an empty/no-op update to
 * `profiles`.
 */
export async function updateMyInvestorDetails(fields) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  if (fields.phone !== undefined) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ phone: fields.phone })
      .eq("id", user.id);
    if (profileError) return { error: profileError.message };
  }

  const detailsUpdate = {};
  if (fields.address !== undefined) detailsUpdate.address = fields.address;
  if (fields.occupation !== undefined) detailsUpdate.occupation = fields.occupation;
  if (fields.nextOfKin) {
    if (fields.nextOfKin.name !== undefined) detailsUpdate.next_of_kin_name = fields.nextOfKin.name;
    if (fields.nextOfKin.relationship !== undefined) detailsUpdate.next_of_kin_relationship = fields.nextOfKin.relationship;
    if (fields.nextOfKin.phone !== undefined) detailsUpdate.next_of_kin_phone = fields.nextOfKin.phone;
  }
  if (Object.keys(detailsUpdate).length > 0) {
    const { error: detailsError } = await supabase
      .from("investor_details")
      .update(detailsUpdate)
      .eq("profile_id", user.id);
    if (detailsError) return { error: detailsError.message };
  }

  await supabase.rpc("log_audit", {
    p_action: "Profile Updated",
    p_entity_table: "profiles",
    p_entity_id: user.id,
    p_previous_value: null,
    p_new_value: fields,
  });

  return { success: true };
}

/**
 * Voluntary password change (Settings / Security tab), for any signed-in role.
 * Re-authenticates with the current password first — this is both how Supabase
 * Auth requires updateUser({password}) to be trusted, and what actually replaces
 * the old local-only check, which compared the typed password against a mock
 * seed value that was never real (so it could never genuinely succeed or fail
 * correctly). NOT the same code path as completeForcedPasswordChange below —
 * that one is for the mandatory first-login change and doesn't require knowing
 * the temp password first, since the admin who issued it already knows it.
 */
export async function changeMyPassword(currentPassword, newPassword) {
  const supabase = await createClient();

  const pwError = passwordStrengthError(newPassword);
  if (pwError) return { error: pwError };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user || !user.email) return { error: "Not signed in." };

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) return { error: "Current password is incorrect." };

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) return { error: updateError.message };

  return { success: true };
}

/**
 * Called immediately after a successful password change on a forced-change account
 * (ForcedPasswordChange.jsx). This is the ONLY path that can flip a user's own
 * must_change_password/account_status — see migration 011. Anything else attempting
 * this update will be rejected by the database trigger regardless of what the app
 * layer does, which is intentional defense in depth.
 */
export async function completeForcedPasswordChange(newPassword) {
  const supabase = await createClient();

  const strengthError = passwordStrengthError(newPassword);
  if (strengthError) return { error: strengthError };

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not signed in." };

  const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
  if (pwError) return { error: pwError.message };

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("must_change_password, account_status")
    .eq("id", user.id)
    .single();
  if (fetchError) return { error: fetchError.message };

  const update = { must_change_password: false };
  if (profile.account_status === "invited") update.account_status = "active";

  const { error: updateError } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (updateError) return { error: updateError.message };

  return { success: true };
}
