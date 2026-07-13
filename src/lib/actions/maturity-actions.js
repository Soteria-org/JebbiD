"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Thin wrapper around choose_maturity_action() (migrations 015, 019). All the real
 * validation and the atomic multi-table write live in that Postgres function, not
 * here — this action exists only so the client component has a normal async
 * function to call, matching every other action in this codebase.
 *
 * payoutDetails is only required (and only validated, by the DB function) when
 * choice is 'withdraw_profit' or 'withdraw_all' — reinvest/switch_package never
 * touch it, since no money leaves the system for those.
 */
export async function chooseMaturityAction(positionId, choice, payoutDetails = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("choose_maturity_action", {
    p_position_id: positionId,
    p_choice: choice,
    p_payment_method: payoutDetails.paymentMethod ?? null,
    p_network: payoutDetails.network ?? null,
    p_phone: payoutDetails.phone ?? null,
    p_bank_name: payoutDetails.bankName ?? null,
    p_account_name: payoutDetails.accountName ?? null,
    p_account_number: payoutDetails.accountNumber ?? null,
  });
  if (error) return { error: error.message };
  return { success: true, newPositionId: data?.new_position_id ?? null, withdrawalId: data?.withdrawal_id ?? null };
}
