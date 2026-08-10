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
      pause_warning_at, pause_deadline,
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
      pauseWarningAt: p.pause_warning_at,
      pauseDeadline: p.pause_deadline,
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
    previousValue: summarizeAuditValue(a.action, a.previous_value),
    newValue: summarizeAuditValue(a.action, a.new_value),
    timestamp: a.created_at,
  }));
  return { items };
}

const UGX = (n) => (n === null || n === undefined) ? "?" : "UGX " + Number(n).toLocaleString("en-UG");

/**
 * Turns the raw JSONB audit payload (usually a full row, via to_jsonb(new)/to_jsonb(old)
 * in the DB triggers — see handle_deposit_submitted, handle_deposit_status_change, etc.)
 * into one readable line, instead of dumping the entire row as JSON text. Every action
 * string that any trigger or server action actually writes is covered explicitly;
 * anything unrecognized falls back to a short key:value summary (still never raw JSON)
 * so a future action type someone adds doesn't silently regress back to a wall of text.
 */
function summarizeAuditValue(action, v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (typeof v !== "object") return String(v);

  if (action === "Deposit Submitted" || (action && action.startsWith("Deposit "))) {
    const parts = [UGX(v.amount)];
    if (v.network) parts.push("via " + v.network + " Mobile Money");
    else if (v.payment_method) parts.push("via " + String(v.payment_method).replace("_", " "));
    if (v.status) parts.push("— " + v.status.replace(/_/g, " "));
    if (v.clarification_note) parts.push('(" ' + v.clarification_note + '")');
    return parts.join(" ");
  }

  if (action === "Withdrawal Requested" || (action && action.startsWith("Withdrawal ") && action !== "Withdrawal Paid")) {
    const parts = [UGX(v.amount_requested ?? v.net_amount)];
    if (v.reference_number) parts.push("ref " + v.reference_number);
    if (v.status) parts.push("— " + v.status);
    return parts.join(" ");
  }

  if (action === "Withdrawal Paid") {
    const parts = [UGX(v.amount_paid), "paid"];
    if (v.transaction_reference) parts.push("ref " + v.transaction_reference);
    return parts.join(" ");
  }

  if (action === "Package Switched" || action === "Investment Reinvested") {
    return v.new_position_id ? "New position created" : "—";
  }

  if (action === "KYC Document Uploaded") {
    return (v.document_type || "Document") + " uploaded";
  }

  if (action === "KYC Status Updated") {
    return "Set to " + (v.new_kyc_status || "?") + (v.reason ? " — " + v.reason : "");
  }

  if (action === "Profile Updated") {
    const fields = Object.keys(v).filter((k) => v[k] !== undefined);
    return fields.length ? "Changed: " + fields.join(", ") : "—";
  }

  if (action === "Finance Officer Created" || action === "Investor Registered" || action === "Investor Registered (Admin)") {
    return (v.full_name || "?") + (v.email ? " (" + v.email + ")" : "");
  }

  // Generic fallback for anything not covered above — still a readable line, never
  // a raw JSON dump, and skips internal id/timestamp noise nobody reading the log
  // actually needs.
  const skip = new Set(["id", "created_at", "updated_at", "reviewed_at", "reviewed_by", "package_id", "investor_id", "profile_id", "investment_id", "deposit_submission_id"]);
  const pairs = Object.entries(v)
    .filter(([k, val]) => !skip.has(k) && val !== null && val !== undefined)
    .map(([k, val]) => k.replace(/_/g, " ") + ": " + val);
  return pairs.length ? pairs.join(", ") : "—";
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
    .select("id, type, title, message, is_read, related_table, related_id, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { error: error.message };

  const items = (data || []).map((n) => ({
    id: n.id,
    investorId: user.id, // kept as `investorId` — NotificationsScreen filters on this field name regardless of role; it really just means "belongs to the current session"
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.is_read,
    relatedTable: n.related_table,
    relatedId: n.related_id,
    timestamp: n.created_at,
  }));
  return { items };
}

/**
 * Failed sign-in attempts (Risk & Compliance Monitor). RLS
 * (login_attempts_select_staff) already restricts this to finance_officer/
 * super_admin — a non-staff caller gets an empty array back, not an error.
 */
export async function loadLoginAttempts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("login_attempts")
    .select("id, identifier, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return { error: error.message };

  const items = (data || []).map((a) => ({
    id: a.id,
    identifier: a.identifier,
    reason: a.reason,
    timestamp: a.created_at,
  }));
  return { items };
}

/**
 * Email delivery events recorded by app/api/webhooks/resend/route.js (Club
 * Intelligence Centre delivery rate). Empty until that webhook is actually
 * configured in Resend and receiving traffic — see .env.local.example for
 * the RESEND_WEBHOOK_SECRET setup this depends on. RLS
 * (email_events_select_staff) already restricts this to staff.
 */
export async function loadEmailEvents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_events")
    .select("id, event_type, recipient, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return { error: error.message };

  const items = (data || []).map((e) => ({
    id: e.id,
    type: e.event_type,
    recipient: e.recipient,
    timestamp: e.created_at,
  }));
  return { items };
}

/**
 * Sends one notification to every Investor or every Finance Officer at once
 * (Club Intelligence Centre "Broadcast" action). Delegates entirely to the
 * public.broadcast_notification() RPC — that function, not this wrapper, is
 * what actually enforces the caller is super_admin, since it must hold even
 * against someone calling the RPC directly. Returns the recipient count so
 * the UI can confirm "sent to N people" instead of just "sent."
 */
export async function broadcastMessage(targetRole, title, message) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("broadcast_notification", {
    p_target_role: targetRole,
    p_title: title,
    p_message: message,
  });
  if (error) return { error: error.message };
  return { success: true, recipientCount: data };
}

/**
 * Sends one notification to a single investor (Risk & Compliance Monitor
 * "Message" action on a specific finding — incomplete KYC, missing info,
 * dormant account). Delegates to public.send_investor_notification(), which
 * enforces staff-only and investor-only server-side.
 */
export async function sendInvestorMessage(investorId, title, message) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_investor_notification", {
    p_investor_id: investorId,
    p_title: title,
    p_message: message,
  });
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * The "warn" half of warn-then-enforce: sends the message AND sets a real,
 * checkable pause_deadline on the investor's profile (public.profiles),
 * rather than just sending words that don't correspond to anything the
 * system will actually do. Returns the deadline so the UI can show it
 * immediately without waiting for a refetch.
 */
export async function scheduleAccountWarning(investorId, title, message, deadlineDays = 7) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("schedule_account_warning", {
    p_investor_id: investorId,
    p_title: title,
    p_message: message,
    p_deadline_days: deadlineDays,
  });
  if (error) return { error: error.message };
  return { success: true, deadline: data };
}

/** Cancels a pending warning without freezing — e.g. the investor fixed the issue in time. */
export async function clearAccountWarning(investorId) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("clear_account_warning", { p_investor_id: investorId });
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * The actual enforcement side of the pause threat — super_admin only
 * (enforced server-side in the RPC itself, not just here). Freezing sets
 * account_status='suspended', which login() already blocks on; unfreezing
 * restores access and clears any pending warning/deadline.
 */
export async function setAccountFreeze(investorId, frozen) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_account_freeze", {
    p_investor_id: investorId,
    p_frozen: frozen,
  });
  if (error) return { error: error.message };
  return { success: true };
}

/**
 * The investor's side of the freeze/unfreeze loop — called from
 * FrozenAccountScreen once they've finished uploading their KYC documents
 * (KYCUploadPanel's onStatusChange fires this when status flips to
 * 'pending', i.e. all three documents are now present). Notifies every
 * super_admin, since only a super_admin can actually unfreeze (
 * set_account_freeze is super_admin-only) — otherwise a paused member could
 * complete everything asked of them and no one would know to look.
 * notify_admins_freeze_response() itself checks auth.uid() = the investor
 * and that the account is actually still suspended.
 */
export async function respondToAccountFreeze(investorId) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("notify_admins_freeze_response", {
    p_investor_id: investorId,
  });
  if (error) return { error: error.message };
  return { success: true };
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
