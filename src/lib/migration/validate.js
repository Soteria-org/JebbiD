import { todayISO } from "@/lib/format";

/**
 * Validation rules — spec §4.4: "If a date, amount, or position is ambiguous,
 * flag it, don't guess." Every row gets a validation_status of 'valid',
 * 'warning' (importable, but a human should look), or 'error' (not imported
 * until fixed/resolved). Nothing here silently transforms a value — parsing
 * failures and ambiguity both become an explicit, readable message (spec §13),
 * never a default guess.
 */

// Confirmed business decision: "Company investment" gets its own investor
// account like everyone else on the sheet — nothing in this club's real
// membership is excluded as a non-person entity.
const NON_PERSON_NAMES = new Set();

function normalizeName(name) {
  return (name || "").trim().replace(/\s+/g, " ");
}

function looksLikeJointIdentity(name) {
  return /\s(&|and)\s/i.test(name || "");
}

/** "370,000/=" | "100000/=" | 250000 (already numeric from the wide-monthly sheet) -> number|null */
export function parseAmount(amountRaw) {
  if (typeof amountRaw === "number") return Number.isFinite(amountRaw) ? amountRaw : null;
  if (typeof amountRaw !== "string") return null;
  const cleaned = amountRaw.replace(/\/=/g, "").replace(/,/g, "").trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return parseFloat(cleaned);
}

/**
 * Resolves a row's dateRaw (either {year, monthNumber, monthLabel} from the
 * wide-monthly sheet, or {raw, wasExcelDateType} from the flat sheet) into an
 * ISO date, or null with a reason if it can't be resolved without guessing.
 */
export function parseRowDate(dateRaw) {
  if (!dateRaw) return { iso: null, reason: "No date information on this row." };

  if ("monthNumber" in dateRaw) {
    if (dateRaw.monthNumber == null) {
      return {
        iso: null,
        reason: `Column month header "${dateRaw.monthLabel}" is blank in the source file. Position (between JUNE 2026 and AUGUST 2026) suggests JULY 2026, but the header is genuinely blank — not assumed here. Resolve the actual month before import.`,
      };
    }
    const iso = `${dateRaw.year}-${String(dateRaw.monthNumber).padStart(2, "0")}-01`;
    return { iso, reason: null };
  }

  // Flat-sheet date: already ISO if it came from a real Excel date cell.
  if (dateRaw.wasExcelDateType) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw.raw)) {
      return { iso: null, reason: `Date "${dateRaw.raw}" was marked as an Excel date cell but isn't in the expected YYYY-MM-DD shape.` };
    }
    return { iso: dateRaw.raw, reason: null };
  }

  // Text date, e.g. "18/4/2026" — only resolve automatically when unambiguous
  // (one of the two numeric parts is > 12, so it can only be the day).
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((dateRaw.raw || "").trim());
  if (!m) return { iso: null, reason: `Date "${dateRaw.raw}" is not in a recognized format.` };
  const [, a, b, year] = m.map((x, i) => (i === 0 ? x : parseInt(x, 10)));
  const [first, second] = [parseInt(m[1], 10), parseInt(m[2], 10)];
  const yearNum = parseInt(m[3], 10);
  const firstIsDay = first > 12 && second <= 12;
  const secondIsDay = second > 12 && first <= 12;
  if (firstIsDay) return { iso: `${yearNum}-${String(second).padStart(2, "0")}-${String(first).padStart(2, "0")}`, reason: null };
  if (secondIsDay) return { iso: `${yearNum}-${String(first).padStart(2, "0")}-${String(second).padStart(2, "0")}`, reason: null };
  return {
    iso: null,
    reason: `Date "${dateRaw.raw}" is ambiguous (day/month order not established by this source file — both readings are plausible). Resolve manually before import.`,
  };
}

/**
 * @param {object} row a flat SourceRow from parseSheet.js
 * @returns {object} the row enriched with validation_status/errors/warnings/normalized fields
 */
export function validateRow(row, todayIsoOverride) {
  const today = todayIsoOverride || todayISO();
  const errors = [];
  const warnings = [];
  const normalizedName = normalizeName(row.investorNameRaw);

  if (row.isMemberSummaryOnly) {
    return {
      ...row,
      normalizedName,
      amountParsed: null,
      dateParsedISO: null,
      validation_status: "warning",
      validation_errors: [],
      validation_warnings: ["Member with no historical contributions recorded on this sheet — no position to create."],
    };
  }

  const isNonPerson = NON_PERSON_NAMES.has(normalizedName.toLowerCase());
  const isJoint = looksLikeJointIdentity(normalizedName);

  if (isNonPerson) {
    warnings.push(`"${row.investorNameRaw}" does not look like an individual investor (looks like a club/company entry) — excluded from investor/account creation. The associated amount is not silently discarded, but no investor record will be auto-created for it.`);
  }
  if (isJoint) {
    warnings.push(`"${row.investorNameRaw}" appears to name two people in one row (joint entry) — genuinely ambiguous single-vs-joint identity. Flagged for manual resolution; not auto-split, not auto-merged into one investor.`);
  }

  // Confirmed business decision: historical contributions below the
  // platform's current MIN_INVESTMENT are accepted as-is and fall under the
  // standard package (packageForAmount already does this — the only real
  // tier boundary is CORPORATE_THRESHOLD) — no verification flag needed.
  const amountParsed = parseAmount(row.amountRaw);
  if (amountParsed === null) {
    errors.push(`Amount "${row.amountRaw}" could not be parsed as a number.`);
  } else if (amountParsed <= 0) {
    errors.push(`Amount ${amountParsed} is not a positive value.`);
  }

  // Confirmed business decision: when the source only supplies month/year
  // (the wide-monthly sheet, by construction, never has a day), the 1st of
  // the month is the approved position start date — no verification flag
  // needed, same reasoning as the below-minimum-amount decision above.
  const { iso: dateParsedISO, reason: dateReason } = parseRowDate(row.dateRaw);
  if (!dateParsedISO) {
    errors.push(dateReason);
  } else {
    if (dateParsedISO > today) {
      errors.push(`Date ${dateParsedISO} is in the future relative to today (${today}). A historical investment cannot have a future date — this is very likely a data-entry error (wrong year, or day/month swapped), but the correct value is not guessed here. Resolve manually before import.`);
    }
  }

  for (const flag of row.flags || []) {
    if (flag === "unlabeled_month_column") {
      // Already surfaced via the date-parse error above when monthNumber is
      // null; nothing further to add here beyond the flag itself.
    } else if (flag === "total_cell_mismatch") {
      warnings.push(`This member's sheet total (${row.memberTotalCellRaw}) does not match the sum of their recorded monthly contributions (${row.memberSumOfMonths}). The sum of actual monthly values (${row.memberSumOfMonths}) is what gets imported — it's the mathematically verified figure, not the club's stated total, and not a guess. The difference likely reflects a contribution the club counted in their running total but never entered into a monthly column; worth confirming with the club, but it doesn't block import.`);
    } else if (flag === "total_cell_not_numeric") {
      warnings.push(`This member's sheet total is "${row.memberTotalCellRaw}", not a number — cannot be reconciled against the sum of their monthly contributions. If this reads "paid", it likely means this member's position has already been closed/withdrawn outside this sheet, not that the amount is unknown.`);
    } else if (flag === "total_cell_blank_with_contributions") {
      warnings.push(`This member has no total given in the source sheet at all, despite recorded contributions summing to ${row.memberSumOfMonths}. The sum of actual monthly values is treated as source of truth; the blank total is reported, not silently filled in.`);
    } else if (flag === "date_not_native_excel_type") {
      warnings.push(`This entry's date was stored as text in the source file, not a native Excel date cell (unlike most other entries on this sheet) — parsed on a best-effort basis; worth a second look.`);
    }
  }

  const validation_status = errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

  return {
    ...row,
    normalizedName,
    isNonPerson,
    isJoint,
    amountParsed,
    dateParsedISO,
    validation_status,
    validation_errors: errors,
    validation_warnings: warnings,
  };
}

export function validateRows(rows, todayIsoOverride) {
  return rows.map((r) => validateRow(r, todayIsoOverride));
}
