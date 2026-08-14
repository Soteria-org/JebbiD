/**
 * Reconciliation report — spec §4.6, run identically before import (dry-run)
 * and after (post-import). "A migration is not done until source totals and
 * system totals reconcile to zero, or every non-zero delta has a stated
 * reason" — so this always returns the delta AND the itemized reasons for it,
 * never just a pass/fail boolean.
 */
export function buildReconciliationReport(validatedRows, investorAnalyses) {
  const contributionRows = validatedRows.filter((r) => !r.isMemberSummaryOnly);

  const totalSourceRows = contributionRows.length;
  const totalSourceAmount = contributionRows.reduce((acc, r) => {
    const parsed = r.amountParsed;
    return acc + (typeof parsed === "number" ? parsed : 0);
  }, 0);

  const validRows = contributionRows.filter((r) => r.validation_status === "valid" || r.validation_status === "warning");
  const errorRows = contributionRows.filter((r) => r.validation_status === "error");

  // Rows belonging to an investor group that isn't a clean "new investor" import
  // (non-person entity, ambiguous joint identity, or a possible duplicate
  // against an existing profile) are importable in principle but require an
  // explicit human decision first — held out of "will actually be imported"
  // until that decision is made, per spec §4.5/§11 (never auto-merge/auto-split
  // on a weak signal).
  const heldForHumanDecisionKeys = new Set(
    investorAnalyses.filter((a) => a.resolution !== "new").map((a) => a.key)
  );
  const rowsHeldForDecision = validRows.filter((r) => heldForHumanDecisionKeys.has((r.normalizedName || "").trim().toLowerCase()));
  const rowsReadyToImport = validRows.filter((r) => !heldForHumanDecisionKeys.has((r.normalizedName || "").trim().toLowerCase()));

  const readyAmount = rowsReadyToImport.reduce((acc, r) => acc + (r.amountParsed || 0), 0);
  const heldAmount = rowsHeldForDecision.reduce((acc, r) => acc + (r.amountParsed || 0), 0);
  const errorAmount = errorRows.reduce((acc, r) => acc + (typeof r.amountParsed === "number" ? r.amountParsed : 0), 0);

  const delta = totalSourceAmount - (readyAmount + heldAmount + errorAmount);

  return {
    totalSourceRows,
    totalSourceAmount,
    readyToImportRowCount: rowsReadyToImport.length,
    readyToImportAmount: readyAmount,
    heldForDecisionRowCount: rowsHeldForDecision.length,
    heldForDecisionAmount: heldAmount,
    errorRowCount: errorRows.length,
    errorAmount,
    reconciledDelta: delta,
    reconciles: Math.abs(delta) < 0.01,
    explanation: [
      `${totalSourceRows} source contribution rows totaling ${totalSourceAmount.toLocaleString()}.`,
      `${rowsReadyToImport.length} rows (${readyAmount.toLocaleString()}) are clean and ready to import once confirmed.`,
      `${rowsHeldForDecision.length} rows (${heldAmount.toLocaleString()}) belong to investors requiring a human decision first (possible duplicate, non-person entity, or ambiguous joint identity) — not imported until resolved.`,
      `${errorRows.length} rows (${errorAmount.toLocaleString()}) failed validation and are not imported until corrected.`,
    ],
  };
}

/** Same computation, run again after import against what actually landed — spec §4.6. */
export function buildPostImportReconciliationReport(preImportReport, importedRows) {
  const importedCount = importedRows.filter((r) => r.resolution === "imported").length;
  const importedAmount = importedRows
    .filter((r) => r.resolution === "imported")
    .reduce((acc, r) => acc + (Number(r.mapped_data?.amountParsed) || 0), 0);

  const delta = preImportReport.readyToImportAmount - importedAmount;
  return {
    expectedImportedRowCount: preImportReport.readyToImportRowCount,
    expectedImportedAmount: preImportReport.readyToImportAmount,
    actualImportedRowCount: importedCount,
    actualImportedAmount: importedAmount,
    delta,
    reconciles: Math.abs(delta) < 0.01 && importedCount === preImportReport.readyToImportRowCount,
  };
}
