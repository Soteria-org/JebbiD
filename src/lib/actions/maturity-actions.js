"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Thin wrapper around choose_maturity_action() (migration 015). All the real
 * validation and the atomic multi-table write live in that Postgres function, not
 * here — this action exists only so the client component has a normal async
 * function to call, matching every other action in this codebase.
 */
export async function chooseMaturityAction(positionId, choice) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("choose_maturity_action", {
    p_position_id: positionId,
    p_choice: choice,
  });
  if (error) return { error: error.message };
  return { success: true, newPositionId: data?.new_position_id ?? null, withdrawalId: data?.withdrawal_id ?? null };
}
