/**
 * Duplicate detection & idempotency — spec §4.5. Two distinct concerns, kept
 * separate on purpose:
 *
 *  - GROUPING: rows sharing the same normalized name within one upload are the
 *    same investor's multiple independent contributions (spec §5 — "one
 *    investor, multiple independent positions"). This is not a duplicate; it's
 *    the expected shape of the source data and is how multiple monthly
 *    contributions get attributed to one investor record.
 *  - DUPLICATE/OVERLAP: name matches against investors that ALREADY exist
 *    (from a prior import, prior native registration, or another sheet in the
 *    same upload) are flagged for human review, never auto-merged — a name
 *    match alone is an explicitly weak identity signal per spec §4.5, since
 *    this source data has no Member ID, email, or phone to corroborate it.
 */

function normalize(name) {
  return (name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Groups validated rows by normalized investor name. Skips summary-only rows (no contributions). */
export function groupRowsByInvestor(validatedRows) {
  const groups = new Map();
  for (const row of validatedRows) {
    const key = row.normalizedName ? normalize(row.normalizedName) : normalize(row.investorNameRaw);
    if (!groups.has(key)) {
      groups.set(key, { key, displayName: row.investorNameRaw, rows: [], sourceSheets: new Set() });
    }
    const group = groups.get(key);
    group.rows.push(row);
    group.sourceSheets.add(row.sourceSheet);
  }
  return groups;
}

/**
 * @param {Map} groups from groupRowsByInvestor
 * @param {Array<{id:string, full_name:string}>} existingProfiles investor profiles already in the DB
 * @returns {Array<object>} one reconciliation entry per investor group
 */
export function analyzeInvestorGroups(groups) {
  const results = [];
  for (const group of groups.values()) {
    const contributionRows = group.rows.filter((r) => !r.isMemberSummaryOnly);
    const crossSheetOverlap = group.sourceSheets.size > 1;
    const hasNonPersonFlag = group.rows.some((r) => r.isNonPerson);
    const hasJointFlag = group.rows.some((r) => r.isJoint);
    const hasNoContributions = contributionRows.length === 0;

    const validRows = contributionRows.filter((r) => r.validation_status !== "error");
    const errorRows = contributionRows.filter((r) => r.validation_status === "error");
    const sumValidAmount = validRows.reduce((acc, r) => acc + (r.amountParsed || 0), 0);

    results.push({
      key: group.key,
      displayName: group.displayName,
      sourceSheets: [...group.sourceSheets],
      crossSheetOverlap,
      isNonPerson: hasNonPersonFlag,
      isJointIdentity: hasJointFlag,
      hasNoContributions,
      totalRows: contributionRows.length,
      validRowCount: validRows.length,
      errorRowCount: errorRows.length,
      sumValidAmount,
      rows: group.rows,
    });
  }
  return results;
}

/**
 * Matches investor groups against profiles already in the database. A match
 * is a case/whitespace-insensitive full-name equality — flagged as
 * "possible_duplicate", never auto-linked, since name alone is a weak signal
 * (spec §4.5). Callers decide in the UI whether to link an import to an
 * existing investor or proceed as a new one.
 */
export function matchAgainstExistingProfiles(investorAnalyses, existingProfiles) {
  const byNormalizedName = new Map();
  for (const p of existingProfiles) {
    const key = normalize(p.full_name);
    if (!byNormalizedName.has(key)) byNormalizedName.set(key, []);
    byNormalizedName.get(key).push(p);
  }

  return investorAnalyses.map((analysis) => {
    const matches = byNormalizedName.get(analysis.key) || [];
    return {
      ...analysis,
      existingProfileMatches: matches.map((m) => ({ id: m.id, full_name: m.full_name, member_id: m.member_id, migration_status: m.migration_status })),
      resolution: matches.length > 0 ? "possible_duplicate" : analysis.isNonPerson ? "not_an_investor" : analysis.isJointIdentity ? "ambiguous_joint_identity" : "new",
    };
  });
}
