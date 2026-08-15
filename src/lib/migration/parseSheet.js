/**
 * Turns the two real source-sheet shapes this club's spreadsheet actually uses
 * into a single flat row shape the rest of the pipeline (validate/dedupe/
 * reconcile/import) can treat uniformly. Per spec §4.4, nothing here silently
 * transforms or drops data — every month cell and every flat entry becomes
 * exactly one row, "-"/blank cells are skipped (not errors, not zeros written
 * anywhere), and anything genuinely ambiguous rides along as a flag for the
 * validation stage to surface rather than resolve.
 *
 * Two source shapes, because this club's real spreadsheet has two of them:
 *
 * 1. "Wide monthly" (MONTHLY REPORT 2025 sheet): one row per member, one
 *    column per month. Per the confirmed business decision, each individual
 *    monthly contribution becomes its own investment position — so this melts
 *    N month-columns into N flat rows per member, not one aggregated row.
 * 2. "Flat" (individual investmentsa sheet): already one row per transaction.
 */

const MONTH_NUMBER = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
  JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12,
};

/**
 * @param {Array<{name:string, total_cell:number|string|null, months:Array<{y:number,m:string,v:number|"-"}>}>} members
 * @returns {Array<object>} flat SourceRow[]
 */
export function meltWideMonthlySheet(members, sourceSheet = "MONTHLY REPORT 2025") {
  const rows = [];
  // import_rows.source_row_number is a plain integer column — one row in the
  // source sheet melts into N output rows here (spec §5: each month becomes
  // its own row), so this counts OUTPUT rows, not source sheet rows. The
  // human-readable "which member, which month" locator still lives in
  // sourceRef below; source_row_number is purely a stable ordering key.
  let outputRowCounter = 0;

  for (const member of members) {
    const contributionMonths = (member.months || []).filter((m) => m.v !== "-" && m.v !== null && m.v !== undefined && m.v !== "");

    if (contributionMonths.length === 0) {
      // Spec flag: a member listed with zero recorded contributions has no
      // position to create — surfaced, not silently skipped or errored.
      outputRowCounter += 1;
      rows.push({
        sourceRowNumber: outputRowCounter,
        sourceSheet,
        sourceRef: `${member.name}`,
        investorNameRaw: member.name,
        amountRaw: null,
        dateRaw: null,
        isMemberSummaryOnly: true,
        flags: ["no_contributions_recorded"],
        raw: member,
      });
      continue;
    }

    const sumOfMonths = contributionMonths.reduce((acc, m) => acc + (typeof m.v === "number" ? m.v : 0), 0);
    const totalCellIsNumber = typeof member.total_cell === "number";
    const totalCellIsBlank = member.total_cell === null || member.total_cell === undefined;
    const totalMismatch = totalCellIsNumber && Math.round(sumOfMonths * 100) !== Math.round(member.total_cell * 100);
    // Blank (null/undefined) and non-numeric-but-present ("paid") are both
    // "can't reconcile the sheet's own total against the sum of contributions"
    // -- reported as two distinct reasons so the reconciliation output is
    // specific about which case it is, per spec §4.6 (never just "mismatch").
    const totalCellBlankWithContributions = totalCellIsBlank && contributionMonths.length > 0;
    const totalCellUnusable = !totalCellIsNumber && !totalCellIsBlank;

    contributionMonths.forEach((monthEntry) => {
      const monthKey = monthEntry.m;
      const isUnlabeled = monthKey.startsWith("UNLABELED_COL");
      const monthNumber = MONTH_NUMBER[monthKey] ?? null;

      const flags = [];
      if (isUnlabeled) flags.push("unlabeled_month_column");
      if (totalMismatch) flags.push("total_cell_mismatch");
      if (totalCellUnusable) flags.push("total_cell_not_numeric");
      if (totalCellBlankWithContributions) flags.push("total_cell_blank_with_contributions");

      outputRowCounter += 1;
      rows.push({
        sourceRowNumber: outputRowCounter,
        sourceSheet,
        sourceRef: `${member.name}/${monthEntry.y}-${monthKey}`,
        investorNameRaw: member.name,
        amountRaw: monthEntry.v,
        dateRaw: { year: monthEntry.y, monthNumber, monthLabel: monthKey, unlabeledHint: monthEntry.unlabeledHint ?? null },
        isMemberSummaryOnly: false,
        memberTotalCellRaw: member.total_cell,
        memberSumOfMonths: sumOfMonths,
        flags,
        raw: { member: member.name, month: monthEntry },
      });
    });
  }

  return rows;
}

/**
 * @param {Array<{name:string, amount_raw:string, date_raw:string, date_was_excel_date_type:boolean}>} entries
 * @returns {Array<object>} flat SourceRow[]
 */
export function flattenFlatSheet(entries, sourceSheet = "individual investmentsa") {
  return entries.map((entry, idx) => ({
    sourceRowNumber: idx + 1,
    sourceSheet,
    sourceRef: `${entry.name}/${entry.date_raw}`,
    investorNameRaw: entry.name,
    amountRaw: entry.amount_raw,
    dateRaw: { raw: entry.date_raw, wasExcelDateType: entry.date_was_excel_date_type },
    isMemberSummaryOnly: false,
    flags: entry.date_was_excel_date_type === false ? ["date_not_native_excel_type"] : [],
    raw: entry,
  }));
}
