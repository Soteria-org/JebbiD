"use server";

import { randomBytes } from "crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { randomTempPassword, TEMP_PASSWORD_EXPIRY_HOURS } from "@/lib/temp-credentials";
import { meltWideMonthlySheet, flattenFlatSheet } from "@/lib/migration/parseSheet";
import { validateRows } from "@/lib/migration/validate";
import { groupRowsByInvestor, analyzeInvestorGroups, matchAgainstExistingProfiles } from "@/lib/migration/dedupe";
import { buildReconciliationReport } from "@/lib/migration/reconciliation";
import { computeHistoricalPosition } from "@/lib/migration/calc";
import { sendEmail, migrationInvitationEmailHtml } from "@/lib/email/resend";

/**
 * Historical investment data migration pipeline — Server Actions.
 * docs/migration/HISTORICAL_DATA_MIGRATION_SPEC.md §4 (pipeline), §6 (onboarding).
 *
 * Return shape convention matches the rest of src/lib/actions: { success: true,
 * ...data } or { error: "message" }, never throw.
 */

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

async function requireCallerRole(supabase, allowedRoles) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile } = await supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  if (!profile) return { error: "Could not verify your account." };
  if (!allowedRoles.includes(profile.role)) {
    return { error: `Only ${allowedRoles.join(" or ")} can do this.` };
  }
  return { success: true, caller: profile };
}

// ---------------------------------------------------------------------------
// Stage 1: upload -> column detection/mapping -> validation -> staging
// (spec §4.1/§4.2/§4.3/§4.4)
// ---------------------------------------------------------------------------

/**
 * @param {object} input
 * @param {string} input.sourceFilename
 * @param {Array<{sheetName:string, format:'wide-monthly'|'flat', rows:Array<object>}>} input.sheets
 *   'wide-monthly': one row per member, one column per month — melted per spec §5
 *   ("each individual monthly contribution becomes its own investment position").
 *   'flat': already one row per transaction (name/amount/date).
 */
export async function uploadImportBatch({ sourceFilename, sheets }) {
  const supabase = await createClient();
  const access = await requireCallerRole(supabase, ["super_admin"]);
  if (access.error) return access;

  if (!sourceFilename || !Array.isArray(sheets) || sheets.length === 0) {
    return { error: "A source filename and at least one sheet are required." };
  }

  let sourceRows = [];
  for (const sheet of sheets) {
    if (sheet.format === "wide-monthly") {
      sourceRows = sourceRows.concat(meltWideMonthlySheet(sheet.rows, sheet.sheetName));
    } else if (sheet.format === "flat") {
      sourceRows = sourceRows.concat(flattenFlatSheet(sheet.rows, sheet.sheetName));
    } else {
      return { error: `Sheet "${sheet.sheetName}" has an unrecognized format "${sheet.format}" — expected "wide-monthly" or "flat". Never guessed silently, per spec §4.3.` };
    }
  }

  const validatedRows = validateRows(sourceRows);
  const groups = groupRowsByInvestor(validatedRows);
  const analyses = analyzeInvestorGroups(groups);

  const { data: existingProfiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, member_id, migration_status")
    .eq("role", "investor");
  if (profilesError) return { error: profilesError.message };

  const investorAnalyses = matchAgainstExistingProfiles(analyses, existingProfiles || []);
  const resolutionByKey = new Map(investorAnalyses.map((a) => [a.key, a.resolution]));

  const reconciliation = buildReconciliationReport(validatedRows, investorAnalyses);

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      source_filename: sourceFilename,
      source_type: "xlsx",
      uploaded_by: access.caller.id,
      total_rows: reconciliation.totalSourceRows,
      valid_rows: validatedRows.filter((r) => !r.isMemberSummaryOnly && r.validation_status === "valid").length,
      warning_rows: validatedRows.filter((r) => !r.isMemberSummaryOnly && r.validation_status === "warning").length,
      invalid_rows: reconciliation.errorRowCount,
      source_total_amount: reconciliation.totalSourceAmount,
      status: "validated",
    })
    .select()
    .single();
  if (batchError) return { error: batchError.message };

  const rowsToInsert = validatedRows.map((row) => {
    const normalizedKey = (row.normalizedName || row.investorNameRaw || "").trim().replace(/\s+/g, " ").toLowerCase();
    const groupResolution = resolutionByKey.get(normalizedKey);
    let resolution = "new";
    if (row.isMemberSummaryOnly || groupResolution === "not_an_investor") resolution = "skipped";
    else if (row.validation_status === "error" || groupResolution === "possible_duplicate" || groupResolution === "ambiguous_joint_identity") resolution = "pending";

    const { raw, ...mappedFields } = row;
    return {
      batch_id: batch.id,
      source_row_number: String(row.sourceRowNumber),
      source_data: raw ?? row,
      mapped_data: mappedFields,
      validation_status: row.isMemberSummaryOnly ? "warning" : row.validation_status,
      validation_errors: row.validation_errors || [],
      validation_warnings: row.validation_warnings || [],
      resolution,
    };
  });

  // Chunked insert — a real club's full history can be hundreds of rows; stay
  // well under PostgREST's default request-size comfort zone.
  for (let i = 0; i < rowsToInsert.length; i += 200) {
    const { error: rowsError } = await supabase.from("import_rows").insert(rowsToInsert.slice(i, i + 200));
    if (rowsError) return { error: `Batch created but failed writing rows ${i}-${i + 200}: ${rowsError.message}` };
  }

  return {
    success: true,
    batchId: batch.id,
    reconciliation,
    investorAnalyses,
    flagSummary: {
      crossSheetOverlaps: investorAnalyses.filter((a) => a.crossSheetOverlap).length,
      possibleDuplicates: investorAnalyses.filter((a) => a.resolution === "possible_duplicate").length,
      nonPersonEntries: investorAnalyses.filter((a) => a.isNonPerson).length,
      jointIdentityEntries: investorAnalyses.filter((a) => a.isJointIdentity).length,
      noContributionMembers: investorAnalyses.filter((a) => a.hasNoContributions).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Stage 2: dry-run / reconciliation preview (spec §4.6) — re-reads from
// staging, never re-parses the original file, so it reflects exactly what
// will be confirmed.
// ---------------------------------------------------------------------------

export async function getDryRunReport(batchId) {
  const supabase = await createClient();
  const access = await requireCallerRole(supabase, ["super_admin", "finance_officer"]);
  if (access.error) return access;

  const { data: batch, error: batchError } = await supabase.from("import_batches").select("*").eq("id", batchId).single();
  if (batchError) return { error: batchError.message };

  const { data: rows, error: rowsError } = await supabase.from("import_rows").select("*").eq("batch_id", batchId).order("source_row_number");
  if (rowsError) return { error: rowsError.message };

  // Batches whose confirmation was never finished (e.g. the tab was closed
  // after upload, before "Confirm & Import") need the exact same
  // investor-grouped, duplicate-matched view the original Review step showed
  // — recomputed from the persisted mapped_data rather than the original
  // file, so "Inspect" can resume a batch, not just report on a finished one.
  let investorAnalyses = null;
  let flagSummary = null;
  let reconciliation = null;
  if (batch.status !== "completed") {
    const groups = groupRowsByInvestor((rows || []).map((r) => r.mapped_data || {}));
    const analyses = analyzeInvestorGroups(groups);
    const { data: existingProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, member_id, migration_status")
      .eq("role", "investor");
    if (!profilesError) {
      investorAnalyses = matchAgainstExistingProfiles(analyses, existingProfiles || []);
      flagSummary = {
        crossSheetOverlaps: investorAnalyses.filter((a) => a.crossSheetOverlap).length,
        possibleDuplicates: investorAnalyses.filter((a) => a.resolution === "possible_duplicate").length,
        nonPersonEntries: investorAnalyses.filter((a) => a.isNonPerson).length,
        jointIdentityEntries: investorAnalyses.filter((a) => a.isJointIdentity).length,
        noContributionMembers: investorAnalyses.filter((a) => a.hasNoContributions).length,
      };
      reconciliation = buildReconciliationReport((rows || []).map((r) => r.mapped_data || {}), investorAnalyses);
    }
  }

  return { success: true, batch, rows, investorAnalyses, flagSummary, reconciliation };
}

// ---------------------------------------------------------------------------
// Stage 3: admin confirmation -> import (spec §4.1's ADMIN CONFIRMATION -> IMPORT)
// ---------------------------------------------------------------------------

function slugifyName(name) {
  return (name || "investor")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "investor";
}

/**
 * Creates the auth.users + profiles + investor_details rows for a migrated
 * investor who doesn't exist yet. Resolves Conflict B documented in
 * supabase/migrations/20260814082254_historical_migration_schema.sql: the
 * identity record must exist (profiles.id has a hard FK to auth.users), but
 * no temp password is issued and no email is sent here — the account is
 * created dormant. "Create Account" (createMigratedInvestorAccount below) is
 * the step that actually makes it reachable.
 */
async function createMigratedInvestorIdentity(callerSupabase, adminClient, fullName, callerId, batchId) {
  const placeholderEmail = `migrated-${slugifyName(fullName)}-${randomBytes(4).toString("hex")}@import.jebbidox.internal`;
  const discardedPassword = randomTempPassword(); // never returned, never stored, never emailed — this account cannot be signed into until createMigratedInvestorAccount() issues a real one

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: placeholderEmail,
    password: discardedPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, migrated: true },
  });
  if (createError) return { error: `Could not create identity for "${fullName}": ${createError.message}` };

  const userId = created.user.id;

  const { error: profileError } = await adminClient.from("profiles").insert({
    id: userId,
    role: "investor",
    full_name: fullName,
    email: placeholderEmail,
    must_change_password: true,
    account_status: "invited",
    migration_status: "migrated",
    created_by: callerId,
  });
  if (profileError) {
    await adminClient.auth.admin.deleteUser(userId).catch(() => {});
    return { error: `Could not create profile for "${fullName}": ${profileError.message}` };
  }

  const { error: detailsError } = await adminClient.from("investor_details").insert({
    profile_id: userId,
    financial_history_status: "imported_approved",
  });
  if (detailsError) {
    await adminClient.auth.admin.deleteUser(userId).catch(() => {});
    return { error: `Could not create investor details for "${fullName}": ${detailsError.message}` };
  }

  await callerSupabase.rpc("log_staff_action", {
    p_action: "Migrated Investor Identity Created",
    p_entity_table: "profiles",
    p_entity_id: userId,
    p_previous_value: null,
    p_new_value: { full_name: fullName, batch_id: batchId, placeholder_email: placeholderEmail },
  });

  return { success: true, investorId: userId, placeholderEmail };
}

/**
 * @param {string} batchId
 * @param {Record<string, {action:'import_as_new'|'link_existing'|'skip', linkProfileId?:string}>} groupDecisions
 *   Keyed by normalized investor name. Rows whose group already resolved
 *   cleanly ('new') need no entry. Rows held for a human decision (possible
 *   duplicate, ambiguous joint identity, or a validation error) are NOT
 *   imported unless an explicit decision is present here — spec §4.5/§11.
 */
export async function confirmImportBatch(batchId, groupDecisions = {}) {
  const supabase = await createClient();
  const access = await requireCallerRole(supabase, ["super_admin"]);
  if (access.error) return access;

  const { data: batch, error: batchError } = await supabase.from("import_batches").select("*").eq("id", batchId).single();
  if (batchError) return { error: batchError.message };
  if (batch.status === "completed") return { error: "This batch has already been imported." };

  const { data: rows, error: rowsError } = await supabase.from("import_rows").select("*").eq("batch_id", batchId).order("source_row_number");
  if (rowsError) return { error: rowsError.message };

  await supabase.from("import_batches").update({ status: "importing" }).eq("id", batchId);

  const adminClient = createAdminClient();
  const investorIdByName = new Map(); // normalizedName -> profileId, memoized for this run so one investor's many contributions share one identity

  // Seed the memo with anything already linked from a prior partial run of
  // this same batch, so re-running confirm after a failure doesn't create a
  // second investor for someone already created.
  for (const row of rows) {
    if (row.linked_investor_id) {
      const key = (row.mapped_data?.normalizedName || "").toLowerCase();
      if (key) investorIdByName.set(key, row.linked_investor_id);
    }
  }

  let importedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  const rowErrors = [];

  for (const row of rows) {
    if (row.resolution === "imported") continue; // already done in a prior run
    if (row.resolution === "skipped") {
      skippedCount += 1;
      continue;
    }

    const mapped = row.mapped_data || {};
    const normalizedKey = (mapped.normalizedName || "").toLowerCase();
    const decision = groupDecisions[normalizedKey];

    const isHeld = row.resolution === "pending";
    if (isHeld && !decision) {
      continue; // no decision supplied — stays pending, not imported, not counted as failed
    }
    if (isHeld && decision?.action === "skip") {
      await supabase.from("import_rows").update({ resolution: "skipped" }).eq("id", row.id);
      skippedCount += 1;
      continue;
    }
    if (row.validation_status === "error" && !(isHeld && decision?.action === "import_as_new")) {
      // A row with a real validation error (bad date/amount) can't be forced
      // through by a group-level decision — the row itself needs fixing, not
      // just a duplicate/identity judgment call.
      continue;
    }

    try {
      let investorId;
      if (decision?.action === "link_existing" && decision.linkProfileId) {
        investorId = decision.linkProfileId;
      } else if (investorIdByName.has(normalizedKey)) {
        investorId = investorIdByName.get(normalizedKey);
      } else {
        const identity = await createMigratedInvestorIdentity(supabase, adminClient, mapped.investorNameRaw, access.caller.id, batchId);
        if (identity.error) throw new Error(identity.error);
        investorId = identity.investorId;
        investorIdByName.set(normalizedKey, investorId);
      }

      const amount = mapped.amountParsed;
      const startDate = mapped.dateParsedISO;
      if (!(amount > 0) || !startDate) {
        throw new Error("Row is missing a valid amount or start date — cannot import.");
      }
      const computed = computeHistoricalPosition(amount, startDate);

      const { error: rpcError } = await supabase.rpc("import_historical_investment", {
        p_batch_id: batchId,
        p_row_id: row.id,
        p_investor_id: investorId,
        p_package_code: computed.packageCode,
        p_principal_amount: amount,
        p_annual_return_rate: computed.annualReturnRatePct,
        p_duration_months: computed.durationMonths,
        p_start_date: computed.startDateISO,
        p_maturity_date: computed.maturityDateISO,
        p_expected_return: computed.expectedReturn,
        p_maturity_value: computed.maturityValue,
      });
      if (rpcError) throw new Error(rpcError.message);

      importedCount += 1;
    } catch (err) {
      failedCount += 1;
      const message = err?.message || String(err);
      rowErrors.push({ rowId: row.id, sourceRef: row.source_data?.sourceRef, error: message });
      await supabase
        .from("import_rows")
        .update({ resolution: "failed", validation_errors: [...(row.validation_errors || []), message] })
        .eq("id", row.id);
    }
  }

  const { data: finalRows } = await supabase.from("import_rows").select("resolution, mapped_data").eq("batch_id", batchId);
  const finalImported = (finalRows || []).filter((r) => r.resolution === "imported");
  const finalFailedCount = (finalRows || []).filter((r) => r.resolution === "failed").length;
  const finalPendingCount = (finalRows || []).filter((r) => r.resolution === "pending").length;
  const importedTotalAmount = finalImported.reduce((acc, r) => acc + (Number(r.mapped_data?.amountParsed) || 0), 0);
  // Only stamp "completed" when nothing is left to resolve — a row still
  // pending a decision, or one that failed to write, means this run didn't
  // actually finish. Marking the batch completed anyway (as this used to)
  // made a partially/wholly failed run indistinguishable from a real
  // success and left it permanently unresumable via Inspect.
  const isFullyDone = finalFailedCount === 0 && finalPendingCount === 0;

  await supabase
    .from("import_batches")
    .update({
      status: isFullyDone ? "completed" : "failed",
      completed_at: isFullyDone ? new Date().toISOString() : null,
      imported_rows: finalImported.length,
      failed_rows: finalFailedCount,
      imported_total_amount: importedTotalAmount,
    })
    .eq("id", batchId);

  return {
    success: true,
    importedCount,
    failedCount,
    skippedCount,
    rowErrors,
    totalImportedInBatch: finalImported.length,
    importedTotalAmount,
  };
}

/**
 * Post-import reconciliation (spec §4.6) — re-runs the SAME comparison as the
 * pre-import report, but against what's actually in import_rows/import_batches
 * now, not a re-derived group analysis. Deliberately simple and hard to get
 * subtly wrong: every number here traces to a single column sum, not a
 * re-run of the dedupe/grouping logic against possibly-since-changed state.
 */
export async function getPostImportReconciliation(batchId) {
  const supabase = await createClient();
  const access = await requireCallerRole(supabase, ["super_admin", "finance_officer"]);
  if (access.error) return access;

  const { data: batch, error: batchError } = await supabase.from("import_batches").select("*").eq("id", batchId).single();
  if (batchError) return { error: batchError.message };

  const { data: rows, error: rowsError } = await supabase.from("import_rows").select("resolution, mapped_data, validation_errors").eq("batch_id", batchId);
  if (rowsError) return { error: rowsError.message };

  const byResolution = { imported: [], failed: [], skipped: [], pending: [], new: [] };
  for (const row of rows) {
    (byResolution[row.resolution] ?? (byResolution[row.resolution] = [])).push(row);
  }
  const sum = (list) => list.reduce((acc, r) => acc + (Number(r.mapped_data?.amountParsed) || 0), 0);

  const importedAmount = sum(byResolution.imported);
  const accountedAmount = importedAmount + sum(byResolution.failed) + sum(byResolution.skipped) + sum(byResolution.pending) + sum(byResolution.new);
  const delta = (batch.source_total_amount || 0) - accountedAmount;

  return {
    success: true,
    postImportReport: {
      sourceTotalAmount: batch.source_total_amount,
      importedRowCount: byResolution.imported.length,
      importedAmount,
      failedRowCount: byResolution.failed.length,
      failedAmount: sum(byResolution.failed),
      skippedRowCount: byResolution.skipped.length,
      skippedAmount: sum(byResolution.skipped),
      stillPendingRowCount: byResolution.pending.length + byResolution.new.length,
      stillPendingAmount: sum(byResolution.pending) + sum(byResolution.new),
      unaccountedDelta: delta,
      reconciles: Math.abs(delta) < 0.01,
    },
  };
}

/**
 * The investors a batch actually created/linked, each flagged with whether
 * they're reachable yet — i.e. whether "Create Account" has ever been run for
 * them (temp_password_issued_at set means a real, usable temp password was
 * issued; a still-placeholder @import.jebbidox.internal email means nobody
 * has supplied their real one yet). This is what closes the loop the UI was
 * missing: after import, staff need to see exactly who still needs an
 * invitation, without hunting through the full Investors table one by one.
 */
export async function getBatchInvestors(batchId) {
  const supabase = await createClient();
  const access = await requireCallerRole(supabase, ["super_admin", "finance_officer"]);
  if (access.error) return access;

  const { data: rows, error: rowsError } = await supabase
    .from("import_rows")
    .select("linked_investor_id")
    .eq("batch_id", batchId)
    .eq("resolution", "imported")
    .not("linked_investor_id", "is", null);
  if (rowsError) return { error: rowsError.message };

  const investorIds = [...new Set(rows.map((r) => r.linked_investor_id))];
  if (investorIds.length === 0) return { success: true, investors: [] };

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, member_id, email, migration_status, temp_password_issued_at")
    .in("id", investorIds)
    .order("full_name");
  if (profilesError) return { error: profilesError.message };

  const investors = (profiles || []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    memberId: p.member_id,
    email: p.email,
    needsRealEmail: !p.email || p.email.endsWith("@import.jebbidox.internal"),
    invited: !!p.temp_password_issued_at,
  }));

  return { success: true, investors };
}

// ---------------------------------------------------------------------------
// Batch history / inspection (spec §8)
// ---------------------------------------------------------------------------

export async function listImportBatches() {
  const supabase = await createClient();
  const access = await requireCallerRole(supabase, ["super_admin", "finance_officer"]);
  if (access.error) return access;

  const { data, error } = await supabase.from("import_batches").select("*, uploader:uploaded_by(full_name)").order("uploaded_at", { ascending: false });
  if (error) return { error: error.message };
  return { success: true, batches: data };
}

export async function getImportBatchDetail(batchId) {
  return getDryRunReport(batchId);
}

/**
 * Deletes a batch that was uploaded/previewed but never confirmed — the "I
 * picked the wrong sheet, let me redo it" case. Refuses anything 'completed'
 * even if the RLS policy is somehow bypassed (belt-and-braces, matching the
 * house pattern elsewhere in this file): a completed batch has real investor
 * accounts and investment_positions rows tied to it, and this schema never
 * casually deletes financial records. import_rows cascades automatically.
 */
export async function deleteImportBatch(batchId) {
  const supabase = await createClient();
  const access = await requireCallerRole(supabase, ["super_admin"]);
  if (access.error) return access;

  const { data: batch, error: batchError } = await supabase.from("import_batches").select("id, status, source_filename").eq("id", batchId).single();
  if (batchError) return { error: batchError.message };
  if (batch.status === "completed") {
    return { error: "This batch was already imported — it created real investor accounts and investments, so it can't be deleted here." };
  }

  const { error: deleteError } = await supabase.from("import_batches").delete().eq("id", batchId);
  if (deleteError) return { error: deleteError.message };

  await supabase.rpc("log_staff_action", {
    p_action: "Import Batch Deleted",
    p_entity_table: "import_batches",
    p_entity_id: batchId,
    p_previous_value: { source_filename: batch.source_filename, status: batch.status },
    p_new_value: null,
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Account onboarding for a migrated investor (spec §6.3)
// ---------------------------------------------------------------------------

/**
 * Issues (or re-issues, for resend) real, usable login credentials for a
 * migrated investor and emails them — the moment their account actually
 * becomes reachable. Before this call, nobody (not even the admin) knows any
 * password for their auth.users row.
 */
async function issueMigrationInvitation(profileId, overrideEmail) {
  const supabase = await createClient();
  const access = await requireCallerRole(supabase, ["super_admin", "finance_officer"]);
  if (access.error) return access;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, member_id, migration_status, account_status")
    .eq("id", profileId)
    .single();
  if (profileError || !profile) return { error: "Investor not found." };
  if (profile.migration_status !== "migrated") return { error: "This action is only for migrated investors." };

  const adminClient = createAdminClient();
  let targetEmail = profile.email;

  if (overrideEmail) {
    const { error: emailUpdateError } = await adminClient.auth.admin.updateUserById(profileId, { email: overrideEmail, email_confirm: true });
    if (emailUpdateError) return { error: `Could not update email: ${emailUpdateError.message}` };
    await supabase.from("profiles").update({ email: overrideEmail }).eq("id", profileId);
    targetEmail = overrideEmail;
  }

  if (!targetEmail || targetEmail.endsWith("@import.jebbidox.internal")) {
    return { error: "This investor has no real email on file yet — provide one before sending an invitation." };
  }

  const tempPassword = randomTempPassword();
  const { error: pwError } = await adminClient.auth.admin.updateUserById(profileId, { password: tempPassword });
  if (pwError) return { error: `Could not issue credentials: ${pwError.message}` };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ temp_password_issued_at: new Date().toISOString(), must_change_password: true })
    .eq("id", profileId);
  if (updateError) return { error: updateError.message };

  const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/`;
  const emailResult = await sendEmail({
    to: targetEmail,
    subject: "Your Jebbidox investment history is ready to view",
    html: migrationInvitationEmailHtml({
      fullName: profile.full_name,
      memberId: profile.member_id,
      tempPassword,
      loginUrl,
      expiryHours: TEMP_PASSWORD_EXPIRY_HOURS,
    }),
  });
  if (emailResult.error) {
    return { error: `Credentials were issued but the invitation email failed to send: ${emailResult.error}. The temp password below still works — share it another way, or fix the email issue and use "Resend Invitation".`, tempPassword };
  }

  await supabase.rpc("notify_migration_invitation_sent", {
    p_investor_id: profileId,
    p_title: "Your Jebbidox account is ready",
    p_message: "Your historical investment records have been migrated. Check your email for login details.",
  });

  return { success: true, tempPassword, email: targetEmail };
}

export async function createMigratedInvestorAccount(profileId, email) {
  return issueMigrationInvitation(profileId, email);
}

export async function resendMigrationInvitation(profileId) {
  return issueMigrationInvitation(profileId, null);
}
