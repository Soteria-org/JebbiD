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

/** Investor self-registration. */
export async function registerInvestor(input) {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (authError) return { error: authError.message };

  const userId = authData.user?.id;
  if (!userId) {
    return {
      error:
        "Registration did not return a signed-in user. If email confirmation is enabled in Supabase Auth settings, the profile/investor_details rows must instead be created after the investor confirms their email (e.g. in a callback route), not here.",
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    role: "investor",
    full_name: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
  });
  if (profileError) return { error: profileError.message };

  const { error: detailsError } = await supabase.from("investor_details").insert({
    profile_id: userId,
    national_id_number: input.nationalIdNumber ?? null,
    address: input.address ?? null,
    occupation: input.occupation ?? null,
    financial_goal: input.financialGoal ?? null,
    next_of_kin_name: input.nextOfKinName ?? null,
    next_of_kin_phone: input.nextOfKinPhone ?? null,
    next_of_kin_relationship: input.nextOfKinRelationship ?? null,
  });
  if (detailsError) return { error: detailsError.message };

  return { success: true, userId };
}

/** Login for any role (investor, finance_officer, super_admin) — role comes from profiles, not a separate login screen per role. */
export async function login(input) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) return { error: error.message };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, member_id, must_change_password, account_status")
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

  if (!callerProfile || callerProfile.role !== "super_admin") {
    return { error: "Only a Super Admin can create investor or finance officer accounts." };
  }

  if (!["investor", "finance_officer"].includes(input.role)) {
    return { error: "role must be 'investor' or 'finance_officer'." };
  }

  const tempPassword = randomTempPassword();
  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createError) return { error: createError.message };

  const userId = created.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
    role: input.role,
    full_name: input.fullName,
    email: input.email,
    phone: input.phone ?? null,
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

  // Returned ONCE. The admin UI must show this to the admin and must not store it
  // anywhere (no logs, no notifications table, no audit_logs value column).
  return { success: true, userId, tempPassword };
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
