"use server";

import { createClient } from "@/lib/supabase/server";
import { getFallbackPackages } from "@/lib/investment-packages";

/**
 * Loads active investment packages from the DB. Used by InvestWizard so that any
 * rate changes made in Admin Settings → Investment Settings take effect immediately
 * without a code deployment.
 */
export async function loadPackages() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("investment_packages")
    .select("id, code, name, min_amount, max_amount, annual_return_rate, duration_months")
    .eq("is_active", true)
    .order("min_amount", { ascending: true });
  if (error || !data?.length) return { packages: getFallbackPackages(), fallback: true };
  return { packages: data };
}

/**
 * Creates a deposit_submissions row and records the proof document reference.
 * The client component uploads the proof file directly to Supabase Storage first
 * (file goes browser → storage, never through this server), then passes the path
 * here. This action handles only the DB side.
 *
 * The trigger handle_deposit_submitted() fires automatically after insert and:
 *  - notifies the investor
 *  - notifies all staff
 *  - writes an audit log entry
 * So none of that needs to happen here.
 */
export async function submitDeposit({
  packageId, amount, goal, paymentMethod, network, transactionRef,
  depositorName, notes, proofStoragePath,
}) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { error: "Not signed in." };

  if (paymentMethod === "mobile_money" && !["MTN", "Airtel"].includes(network)) {
    return { error: "Please specify which mobile money network (MTN or Airtel) was used." };
  }

  // Server-side package validation — matches the same rules enforced on the client.
  // Belt-and-suspenders: even if a manipulated client bypasses the UI check, this
  // catches it before it hits the DB.
  const { data: pkg, error: pkgError } = await supabase
    .from("investment_packages")
    .select("id, code, min_amount, max_amount")
    .eq("id", packageId)
    .single();

  if (pkgError || !pkg) return { error: "Invalid investment package." };
  if (amount < pkg.min_amount) {
    return { error: `Minimum investment for ${pkg.code === "standard" ? "Standard" : "Corporate"} Package is ${pkg.min_amount.toLocaleString()} UGX.` };
  }
  if (pkg.max_amount !== null && amount > pkg.max_amount) {
    return { error: `Amount exceeds the ${pkg.code} package limit. Please choose the Corporate Package.` };
  }

  const { data: deposit, error: insertError } = await supabase
    .from("deposit_submissions")
    .insert({
      investor_id: user.id,
      package_id: packageId,
      amount,
      payment_method: paymentMethod,
      network: network ?? null,
      depositor_name: depositorName ?? null,
      transaction_reference: transactionRef ?? null,
      date_paid: new Date().toISOString().split("T")[0],
      financial_goal: goal ?? null,
      notes: notes ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) return { error: insertError.message };

  // Record proof document reference (linked to this specific deposit)
  if (proofStoragePath) {
    const { error: docError } = await supabase.from("uploaded_documents").insert({
      owner_profile_id: user.id,
      document_type: "deposit_proof",
      storage_bucket: "payment-proofs",
      storage_path: proofStoragePath,
      related_table: "deposit_submissions",
      related_id: deposit.id,
    });
    if (docError) {
      // Not a fatal error — the deposit exists, proof just isn't linked. Log it.
      console.error("Proof document record failed after deposit insert:", docError.message);
    }
  }

  return { success: true, deposit };
}

/**
 * Loads the deposit queue for staff. Returns all deposits with investor and package
 * info joined so the FO doesn't have to make separate lookups per row.
 * Also returns the proof document path (if any) for each deposit so the review
 * modal can generate a signed URL from the client.
 */
export async function loadDepositsQueue() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deposit_submissions")
    .select(`
      id, amount, payment_method, network, transaction_reference, depositor_name,
      date_paid, financial_goal, notes, status, clarification_note,
      created_at, reviewed_at,
      investor:profiles(id, full_name, member_id, email, phone),
      package:investment_packages(id, code, name, annual_return_rate),
      reviewer:profiles!deposit_submissions_reviewed_by_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  // Attach proof document paths (one per deposit) without a separate N+1 loop
  const depositIds = data.map((d) => d.id);
  const { data: docs } = await supabase
    .from("uploaded_documents")
    .select("related_id, storage_path")
    .eq("related_table", "deposit_submissions")
    .eq("document_type", "deposit_proof")
    .in("related_id", depositIds.length ? depositIds : ["00000000-0000-0000-0000-000000000000"]);

  const proofByDeposit = {};
  (docs || []).forEach((d) => { proofByDeposit[d.related_id] = d.storage_path; });

  const enriched = data.map((d) => ({
    ...d,
    proofStoragePath: proofByDeposit[d.id] ?? null,
  }));

  return { deposits: enriched };
}

/**
 * Staff: approve a deposit. The DB trigger handle_deposit_status_change() does
 * the real work: it creates the investment_positions row, notifies the investor,
 * and writes the audit log. This action only sets the status and records who
 * reviewed it.
 */
export async function approveDeposit(depositId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("deposit_submissions")
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", depositId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Staff: reject a deposit. Trigger notifies the investor and writes audit log.
 */
export async function rejectDeposit(depositId, reason) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("deposit_submissions")
    .update({
      status: "rejected",
      clarification_note: reason,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", depositId);

  if (error) return { error: error.message };
  return { success: true };
}

/**
 * Staff: request clarification from the investor. The investor can then respond
 * (via the deposits_investor_respond RLS policy) and the deposit moves back to
 * 'pending' for re-review. Trigger notifies the investor.
 */
export async function requestClarification(depositId, note) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("deposit_submissions")
    .update({
      status: "clarification_requested",
      clarification_note: note,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", depositId);

  if (error) return { error: error.message };
  return { success: true };
}
