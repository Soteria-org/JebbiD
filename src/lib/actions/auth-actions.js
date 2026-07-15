"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * All functions here are Server Actions — they run only on the server, never ship to
 * the browser bundle. Screens call these instead of touching Supabase directly.
 *
 * Return shape convention: { success: true, ...data } or { error: "message" }.
 * Never throw — callers (eventually useJBDocsStore) expect to check `.error`.
 */

function randomTempPassword() {
  // Good enough for a V1 demo/admin-issued temp password (forced change on first
  // login anyway). If this ever needs to be cryptographically strong for compliance,
  // swap for crypto.randomBytes-based generation — flagging as a known simplification.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

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
  const supabase = await createClient();

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
}

/**
 * Login for any role (investor, finance_officer, super_admin) — role comes from
 * profiles, not a separate login screen per role. Accepts either an email or a
 * Member ID (JBD-2026-000123) as the identifier; Supabase Auth itself only signs in
 * by email, so a Member ID is resolved to its email first via resolve_login_email()
 * (migration 012) — the one sanctioned pre-auth profile lookup.
 */
export async function login(input) {
  const supabase = await createClient();

  let email = input.identifier;
  if (!email.includes("@")) {
    const { data: resolvedEmail, error: resolveError } = await supabase.rpc("resolve_login_email", {
      p_identifier: input.identifier,
    });
    if (resolveError || !resolvedEmail) {
      return { error: "No account found with that Member ID or email." };
    }
    email = resolvedEmail;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error) return { error: "Incorrect Member ID/email or password." };

  // investor_details is joined here (not just fetched separately) so that
  // ProfileScreen/StatementsScreen/InvestWizard have real National ID, Address,
  // Occupation, Financial Goal, and Next of Kin data immediately on login instead
  // of showing blank fields until some other screen happens to load them. For
  // staff roles the embed simply comes back empty/null, which is fine — nothing
  // downstream reads it for them.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      id, role, full_name, member_id, must_change_password, account_status, created_at,
      phone, username, email,
      investor_details ( national_id_number, address, occupation, financial_goal,
        next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, kyc_status )
    `)
    .eq("id", data.user.id)
    .single();
  if (profileError) return { error: profileError.message };

  if (profile.account_status === "suspended") {
    await supabase.auth.signOut();
    return { error: "This account has been suspended. Contact an administrator." };
  }

  return { success: true, profile };
}

export async function logout() {
  const supabase = await createClient();
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

  const tempPassword = randomTempPassword();
  const admin = createAdminClient();

  if (!input.email) {
    return { error: "Email is required — Supabase Auth cannot create an account without one, even for walk-in investors." };
  }

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
  });
  if (profileError) return { error: profileError.message };

  if (input.role === "finance_officer") {
    const { error: staffError } = await admin.from("staff_details").insert({
      profile_id: userId,
      created_by: caller.id,
      department: input.department ?? null,
    });
    if (staffError) return { error: staffError.message };
  } else {
    const { error: investorError } = await admin.from("investor_details").insert({
      profile_id: userId,
    });
    if (investorError) return { error: investorError.message };
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
  // anywhere (no logs, no notifications table, no audit_logs value column).
  return { success: true, userId, tempPassword };
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
