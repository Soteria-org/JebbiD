"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Historical withdrawals -- club records of withdrawals paid out before this
 * investor existed on the platform. RLS on historical_withdrawals already
 * restricts rows to the investor themselves or staff (finance_officer /
 * super_admin), so the query below naturally returns nothing for anyone else
 * without needing an extra role check here.
 */
export async function getInvestorHistoricalWithdrawals(investorId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data, error } = await supabase
    .from("historical_withdrawals")
    .select("id, amount, withdrawal_date, month_covered, payment_method, source_note")
    .eq("investor_id", investorId)
    .order("withdrawal_date", { ascending: false });
  if (error) return { error: error.message };

  return { success: true, withdrawals: data };
}
