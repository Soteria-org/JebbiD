"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Staff-wide investor roster — Investors table, investor search, staff picking an
 * investor to review. Previously this list only ever came from local in-memory
 * "bridging" (an investor was only visible once staff had loaded one of their
 * investments/withdrawals) — meaning a brand-new investor with zero activity yet,
 * or one created directly in Supabase rather than through the app, never appeared
 * anywhere. This is the real, authoritative load. RLS (is_staff() on profiles/
 * investor_details) means a non-staff caller simply gets nothing back rather than
 * an error, so no extra role check is needed here.
 */
export async function loadAllInvestors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, member_id, full_name, email, phone, username, account_status, created_at,
      investor_details ( national_id_number, address, occupation, financial_goal,
        next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, kyc_status )
    `)
    .eq("role", "investor")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };

  const items = (data || []).map((p) => {
    const d = Array.isArray(p.investor_details) ? p.investor_details[0] : p.investor_details;
    return {
      id: p.id,
      memberId: p.member_id,
      fullName: p.full_name,
      email: p.email,
      phone: p.phone || "",
      username: p.username || p.email,
      nationalId: d?.national_id_number || "",
      address: d?.address || "",
      occupation: d?.occupation || "",
      goal: d?.financial_goal || "",
      kycStatus: d?.kyc_status || "not_started",
      nextOfKin: {
        name: d?.next_of_kin_name || "",
        relationship: d?.next_of_kin_relationship || "",
        phone: d?.next_of_kin_phone || "",
        address: "",
      },
      password: null,
      dateRegistered: p.created_at,
      notifPrefs: { email: true, sms: true },
      darkMode: false,
      accountStatus: p.account_status,
    };
  });
  return { items };
}

/**
 * Finance Officer roster (Admin Settings -> Finance Officers). Previously
 * `financeOfficers` was seeded from mock demo data and only ever patched locally
 * for the current browser session — a Finance Officer created by anyone else (or
 * directly in Supabase) never appeared here. RLS already scopes staff_details/
 * profiles reads to staff, so this is safe to call without an extra role check.
 */
export async function loadAllFinanceOfficers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, must_change_password, created_at")
    .eq("role", "finance_officer")
    .order("created_at", { ascending: false });
  if (error) return { error: error.message };

  const items = (data || []).map((p) => ({
    id: p.id,
    name: p.full_name,
    email: p.email,
    mustChangePassword: p.must_change_password,
    createdAt: p.created_at,
  }));
  return { items };
}

/**
 * Full audit trail (Audit Logs screen). Was mock-seeded and never loaded for real —
 * every real entry the database triggers were correctly writing (see
 * business_rule_triggers migration) was invisible in the UI. RLS on audit_logs
 * restricts SELECT to staff.
 */
export async function loadAuditLog() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_name_snapshot, action, previous_value, new_value, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return { error: error.message };

  const items = (data || []).map((a) => ({
    id: a.id,
    user: a.actor_name_snapshot || "System",
    action: a.action,
    previousValue: stringifyValue(a.previous_value),
    newValue: stringifyValue(a.new_value),
    timestamp: a.created_at,
  }));
  return { items };
}

function stringifyValue(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * The signed-in user's own notifications — works for ANY role (investor, finance
 * officer, super admin), since notifications.profile_id is keyed to auth.uid()
 * regardless of role. This is what was missing for staff: the database triggers
 * (handle_deposit_submitted, etc.) were already writing real notification rows for
 * Finance Officers correctly — nothing in the UI was ever loading them. RLS
 * (notifications_select: profile_id = auth.uid()) already restricts this to the
 * caller's own rows.
 */
export async function loadMyNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, message, is_read, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { error: error.message };

  const items = (data || []).map((n) => ({
    id: n.id,
    investorId: user.id, // kept as `investorId` — NotificationsScreen filters on this field name regardless of role; it really just means "belongs to the current session"
    type: n.type,
    message: n.message,
    read: n.is_read,
    timestamp: n.created_at,
  }));
  return { items };
}

/**
 * Marks one of the caller's own notifications as read. RLS (notifications_update:
 * profile_id = auth.uid()) already prevents marking someone else's notification
 * read even by guessing an id, but we still scope the query explicitly for clarity.
 */
export async function markNotificationReadAction(notificationId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("profile_id", user.id);
  if (error) return { error: error.message };
  return { success: true };
}
