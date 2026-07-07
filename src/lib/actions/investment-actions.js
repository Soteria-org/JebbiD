"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Investors see ONE unified list on their "My Investments" screen: deposits still
 * awaiting a decision, sitting alongside already-approved investment positions. The
 * underlying tables are deliberately separate (see docs/database-schema.md §3), but
 * the UI predates that split and expects one merged, chronologically-sorted list —
 * so this function does the merging, normalizing both sources into the same shape
 * the screens already expect (no screen changes needed for this part).
 */
export async function loadMyInvestmentsView() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: pendingDeposits, error: depErr } = await supabase
    .from("deposit_submissions")
    .select("id, amount, financial_goal, status, clarification_note, created_at, package:investment_packages(code)")
    .eq("investor_id", user.id)
    .neq("status", "approved")
    .order("created_at", { ascending: false });
  if (depErr) return { error: depErr.message };

  const { data: positions, error: posErr } = await supabase
    .from("investment_positions")
    .select(`
      id, principal_amount, start_date, maturity_date, expected_return, maturity_value,
      status, maturity_action, created_at,
      package:investment_packages(code),
      deposit:deposit_submissions(financial_goal)
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });
  if (posErr) return { error: posErr.message };

  const pendingItems = (pendingDeposits || []).map((d) => ({
    id: d.id, investorId: user.id, package: d.package?.code, amount: d.amount, goal: d.financial_goal,
    status: d.status === "pending" ? "pending_verification" : d.status,
    rejectionReason: d.status === "rejected" ? d.clarification_note : null,
    clarificationNote: d.status === "clarification_requested" ? d.clarification_note : null,
    createdAt: d.created_at, startDate: null, maturityDate: null, expectedReturn: null, maturityValue: null,
    maturityChoice: null, isDepositRecord: true,
  }));

  const positionItems = (positions || []).map((p) => ({
    id: p.id, investorId: user.id, package: p.package?.code, amount: p.principal_amount,
    goal: p.deposit?.financial_goal || "—", status: p.status, rejectionReason: null, clarificationNote: null,
    createdAt: p.created_at, startDate: p.start_date, maturityDate: p.maturity_date,
    expectedReturn: p.expected_return, maturityValue: p.maturity_value, maturityChoice: p.maturity_action,
    isDepositRecord: false,
  }));

  const merged = [...pendingItems, ...positionItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { items: merged };
}

/**
 * Staff-wide view (AllInvestments screen). Only returns actual investment_positions
 * (approved investments) — pending deposits belong on the Deposits queue, not here,
 * matching the same separation the schema enforces. Each item carries the investor's
 * profile info embedded, both for direct display AND so the caller can "bridge" every
 * investor encountered into local mock state (see useJBDocsStore.js) — without this,
 * ctx.getInvestor(id) would break for any investor who hasn't logged in this session.
 */
export async function loadAllInvestmentsView() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("investment_positions")
    .select(`
      id, principal_amount, start_date, maturity_date, expected_return, maturity_value,
      status, maturity_action, created_at,
      package:investment_packages(code),
      deposit:deposit_submissions(financial_goal),
      investor:profiles(id, full_name, member_id, email, username)
    `)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const items = (data || []).map((p) => ({
    id: p.id, investorId: p.investor?.id, package: p.package?.code, amount: p.principal_amount,
    goal: p.deposit?.financial_goal || "—", status: p.status, rejectionReason: null,
    createdAt: p.created_at, startDate: p.start_date, maturityDate: p.maturity_date,
    expectedReturn: p.expected_return, maturityValue: p.maturity_value, maturityChoice: p.maturity_action,
    investorProfile: p.investor, // consumed by the store to bridge, not by screens directly
  }));

  return { items };
}
