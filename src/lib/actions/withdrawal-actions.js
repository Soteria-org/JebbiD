"use server";

import { createClient } from "@/lib/supabase/server";

const PENALTY_RATE = 0.15;

/**
 * Investor submits a withdrawal request against one of their own investment
 * positions. Penalty/net are recalculated here from the REAL maturity_date on the
 * server — the client shows a preview using the same math, but this is the
 * authoritative check (a manipulated client can't claim "no penalty" on an
 * early withdrawal).
 */
export async function requestWithdrawal({
  investmentId, amount, reason, paymentMethod, network, bankDetails, comments,
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: position, error: posError } = await supabase
    .from("investment_positions")
    .select("id, investor_id, principal_amount, maturity_date, status")
    .eq("id", investmentId)
    .single();

  if (posError || !position) return { error: "Investment position not found." };
  if (position.investor_id !== user.id) return { error: "This is not your investment position." };
  if (position.status !== "active") return { error: "This position is not eligible for withdrawal." };
  if (amount <= 0 || amount > position.principal_amount) {
    return { error: "Enter an amount up to " + position.principal_amount.toLocaleString() + "." };
  }

  const isEarly = new Date(position.maturity_date) > new Date();
  const penaltyAmount = isEarly ? Math.round(amount * PENALTY_RATE) : 0;
  const netAmount = amount - penaltyAmount;

  const payoutDetails =
    paymentMethod === "mobile_money"
      ? { network, phone: bankDetails?.phone }
      : { bankName: bankDetails?.bankName, accountName: bankDetails?.accountName, accountNumber: bankDetails?.accountNumber };

  const { data: withdrawal, error: insertError } = await supabase
    .from("withdrawal_requests")
    .insert({
      investment_id: investmentId,
      investor_id: user.id,
      amount_requested: amount,
      reason,
      comments: comments ?? null,
      payment_method: paymentMethod,
      payout_details: payoutDetails,
      is_early_withdrawal: isEarly,
      penalty_rate: isEarly ? PENALTY_RATE * 100 : null,
      penalty_amount: penaltyAmount,
      net_amount: netAmount,
    })
    .select()
    .single();

  if (insertError) return { error: insertError.message };
  // Trigger handle_withdrawal_submitted() notifies investor + staff and writes audit log.
  return { success: true, withdrawal };
}

/**
 * Staff queue: all withdrawal requests, with the investor's profile embedded both
 * for display and so the store can bridge investors who haven't logged in this
 * session (same reasoning as loadAllInvestmentsView).
 */
export async function loadWithdrawalsQueue() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select(`
      id, reference_number, amount_requested, penalty_amount, net_amount, payment_method,
      payout_details, is_early_withdrawal, status, created_at,
      investor:profiles(id, full_name, member_id, email)
    `)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { withdrawals: data };
}

export async function loadMyWithdrawals() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select("id, reference_number, investment_id, amount_requested, penalty_amount, net_amount, payment_method, status, created_at")
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { withdrawals: data };
}

export async function rejectWithdrawal(withdrawalId, reason) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("withdrawal_requests")
    .update({ status: "rejected", clarification_note: reason, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", withdrawalId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Marks a withdrawal as paid by inserting a payout_records row — NOT by setting
 * status='paid' directly. The trigger handle_payout_recorded() (migration 006) does
 * that automatically, and also closes the investment position in the same step.
 *
 * DECISION: this skips the intermediate 'approved' status entirely — pending goes
 * straight to paid, matching the existing prototype UX (one "Mark Paid" action, no
 * separate approve step). The schema still supports 'approved' as a distinct status
 * for a future maker-checker flow (someone approves, someone else pays) — that's a
 * V2 product decision, not something to build speculatively now.
 */
export async function markWithdrawalPaid({ withdrawalId, transactionId, payoutDate, notes }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: withdrawal, error: fetchError } = await supabase
    .from("withdrawal_requests")
    .select("net_amount, status")
    .eq("id", withdrawalId)
    .single();
  if (fetchError || !withdrawal) return { error: "Withdrawal request not found." };
  if (withdrawal.status === "paid") return { error: "This withdrawal has already been paid." };

  const { error } = await supabase.from("payout_records").insert({
    withdrawal_id: withdrawalId,
    paid_by: user.id,
    payout_date: payoutDate || new Date().toISOString().split("T")[0],
    transaction_id: transactionId,
    amount_paid: withdrawal.net_amount,
    notes: notes ?? null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
