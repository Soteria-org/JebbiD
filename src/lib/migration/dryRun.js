import { validateRows } from "./validate";
import { groupRowsByInvestor, analyzeInvestorGroups, matchAgainstExistingProfiles } from "./dedupe";
import { buildReconciliationReport } from "./reconciliation";

/**
 * Runs the full validate -> group -> duplicate-match -> reconcile pipeline
 * (spec §4.1's VALIDATION -> DUPLICATE DETECTION -> DRY RUN / PREVIEW ->
 * RECONCILIATION PREVIEW stages) against already-parsed source rows, without
 * writing anything to the database. Pure/synchronous so it can run identically
 * against real data offline (for this task's mandated stop-at-dry-run step) or
 * against uploaded-and-parsed rows inside a server action.
 *
 * @param {Array<object>} sourceRows flat rows from parseSheet.js (one or more sheets combined)
 * @param {Array<{id:string, full_name:string, member_id:string, migration_status:string}>} existingProfiles
 */
export function runDryRun(sourceRows, existingProfiles, todayIsoOverride) {
  const validatedRows = validateRows(sourceRows, todayIsoOverride);
  const groups = groupRowsByInvestor(validatedRows);
  const analyses = analyzeInvestorGroups(groups);
  const investorAnalyses = matchAgainstExistingProfiles(analyses, existingProfiles);
  const reconciliation = buildReconciliationReport(validatedRows, investorAnalyses);

  const crossSheetOverlaps = investorAnalyses.filter((a) => a.crossSheetOverlap);
  const possibleDuplicates = investorAnalyses.filter((a) => a.resolution === "possible_duplicate");
  const nonPersonEntries = investorAnalyses.filter((a) => a.isNonPerson);
  const jointIdentityEntries = investorAnalyses.filter((a) => a.isJointIdentity);
  const noContributionMembers = investorAnalyses.filter((a) => a.hasNoContributions);
  const errorRows = validatedRows.filter((r) => !r.isMemberSummaryOnly && r.validation_status === "error");
  const warningRows = validatedRows.filter((r) => !r.isMemberSummaryOnly && r.validation_status === "warning");

  return {
    validatedRows,
    investorAnalyses,
    reconciliation,
    flags: {
      crossSheetOverlaps,
      possibleDuplicates,
      nonPersonEntries,
      jointIdentityEntries,
      noContributionMembers,
      errorRows,
      warningRows,
    },
  };
}
