import * as XLSX from "xlsx";

/**
 * Browser-side spreadsheet ingestion — spec §4.3: "Inspect the uploaded
 * file's real headers; suggest a mapping ... but never assume it silently."
 *
 * This got a real rework after a real club spreadsheet (Jebbidox_SAVINGS.xlsx,
 * 6 sheets) exposed two problems with the original version:
 *
 * 1. It always assumed row 0 was the header row. Real club spreadsheets
 *    often have a title row above the real headers, or a two-row header
 *    (a merged year cell spanning several month columns, with month names in
 *    the row below it) — assuming row 0 silently produced garbage ("Column 1"
 *    instead of a real header name, every cell "Not mapped").
 * 2. It showed every sheet in the workbook as something to map, including
 *    ones this project's own migration spec explicitly says are out of scope
 *    (the club's internal bookkeeping sheets, not investor records). Six
 *    sheets, all defaulting to the same generic "Flat Transaction List" with
 *    mostly-unmapped columns, is exactly the "not clear, weird" complaint.
 *
 * Fixes: scan the first several rows for the one that actually looks like a
 * header (scored by how many recognizable name/amount/date/month hints it
 * contains) instead of assuming row 0; expand merged cells so a year cell
 * merged across many month columns is visible to every one of those columns;
 * combine an above-header year row with a month-name header row when a month
 * cell has no year of its own; and default sheets whose NAME matches this
 * club's own known non-investor sheets to "Skip", so the admin sees a short,
 * pre-sorted list instead of six identical-looking blocks.
 */

const MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const NAME_HEADER_HINTS = ["name", "investor", "member", "full name", "client"];
const AMOUNT_HEADER_HINTS = ["amount", "value", "sum", "total", "paid"];
const DATE_HEADER_HINTS = ["date", "when", "day"];

// This club's own bookkeeping sheets (not investor contribution records) —
// confirmed out of scope for this migration. "Monthly transaction register"
// was the old name for the "withdrawals" sheet (a record of withdrawals and
// the payment method used, not deposits) — both names are listed so an older
// upload of the same workbook still skips it correctly. "Daily savings" is
// deliberately NOT here: the club has folded that sheet's contributions into
// the historical record rather than keeping it as internal-only bookkeeping.
const KNOWN_NON_INVESTOR_SHEET_NAMES = ["expenses", "money sent to min.mark", "monthly transaction register", "withdrawals"];

const HEADER_SCAN_ROWS = 8;

/** @param {ArrayBuffer} arrayBuffer */
export function readWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  return wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    const rows = expandMerges(rawRows, ws["!merges"] || []);

    const { headerRowIndex, score } = findBestHeaderRow(rows);
    const headerRow = normalizeRow(rows[headerRowIndex] || []);
    // The year often lives only in the leftmost column of its block (e.g. one
    // "2025" cell followed by six blank cells under JUNE..DECEMBER, then a
    // fresh "2026" cell under JANUARY) rather than a real merged range or a
    // year repeated under every month — forward-fill so every column in the
    // block resolves to the year that actually applies to it.
    const aboveHeaderRow = headerRowIndex > 0 ? forwardFillRow(normalizeRow(rows[headerRowIndex - 1] || [])) : [];
    const dataRows = rows.slice(headerRowIndex + 1);

    const isKnownNonInvestorSheet = KNOWN_NON_INVESTOR_SHEET_NAMES.includes(sheetName.trim().toLowerCase());
    const detected = detectFormat(headerRow, aboveHeaderRow);

    return {
      sheetName,
      headerRow,
      aboveHeaderRow,
      dataRows,
      headerRowIndex,
      headerConfidence: score > 0 ? "detected" : "low",
      suggestedFormat: isKnownNonInvestorSheet ? "skip" : detected,
      // First couple of raw data rows, for the admin to visually sanity-check
      // detection against — the actual fix for "I can't tell what it read".
      preview: dataRows.slice(0, 2),
    };
  });
}

/** Copies each merged range's top-left value into every cell it covers, so a year merged across 12 month columns is visible to all 12, not just the first. */
function expandMerges(rows, merges) {
  if (!merges.length) return rows;
  const copy = rows.map((r) => (r ? [...r] : []));
  for (const { s, e } of merges) {
    const value = copy[s.r]?.[s.c];
    if (value === null || value === undefined || value === "") continue;
    for (let r = s.r; r <= e.r; r++) {
      if (!copy[r]) copy[r] = [];
      for (let c = s.c; c <= e.c; c++) {
        if (copy[r][c] === null || copy[r][c] === undefined || copy[r][c] === "") copy[r][c] = value;
      }
    }
  }
  return copy;
}

function normalizeRow(row) {
  return (row || []).map((h) => (h === null || h === undefined ? "" : String(h).trim()));
}

/** Carries each non-blank cell forward to the right until the next non-blank cell — for header rows where a value (like a year) is written once per block instead of repeated or merged across it. */
function forwardFillRow(row) {
  let last = "";
  return row.map((cell) => {
    if (cell) last = cell;
    return cell || last;
  });
}

/** Scores how "header-like" a row is: recognizable field-name hints or month names. */
function scoreHeaderRow(row) {
  const cells = normalizeRow(row);
  let score = 0;
  for (const cell of cells) {
    const lower = cell.toLowerCase();
    if (!cell) continue;
    if (parseMonthHeader(cell)) score += 1;
    if (NAME_HEADER_HINTS.some((h) => lower.includes(h))) score += 1;
    if (AMOUNT_HEADER_HINTS.some((h) => lower.includes(h))) score += 1;
    if (DATE_HEADER_HINTS.some((h) => lower.includes(h))) score += 1;
  }
  return score;
}

/** Scans the first several rows and picks the one that looks most like a real header — never assumes row 0. */
function findBestHeaderRow(rows) {
  let best = { headerRowIndex: 0, score: -1 };
  for (let i = 0; i < Math.min(HEADER_SCAN_ROWS, rows.length); i++) {
    const score = scoreHeaderRow(rows[i]);
    if (score > best.score) best = { headerRowIndex: i, score };
  }
  return best;
}

function parseMonthHeader(headerText) {
  const upper = (headerText || "").trim().toUpperCase();
  const match = MONTH_NAMES.find((m) => upper.startsWith(m));
  if (!match) return null;
  const yearMatch = upper.match(/\d{4}/);
  return { monthLabel: match, year: yearMatch ? parseInt(yearMatch[0], 10) : null };
}

/**
 * A month header often has no year of its own — the year is a separate
 * merged cell spanning several month columns, one row up. Combine them at
 * the point of use rather than guessing during header-row selection: try the
 * cell's own text first, then the same column in the row directly above.
 */
function parseMonthHeaderWithYearFallback(headerText, aboveCellText) {
  const own = parseMonthHeader(headerText);
  if (!own) return null;
  if (own.year) return own;
  const aboveYearMatch = (aboveCellText || "").match(/\d{4}/);
  return { monthLabel: own.monthLabel, year: aboveYearMatch ? parseInt(aboveYearMatch[0], 10) : null };
}

function detectFormat(headerRow, aboveHeaderRow) {
  const monthColumns = headerRow.filter((h, i) => parseMonthHeaderWithYearFallback(h, aboveHeaderRow[i])).length;
  if (monthColumns >= 3) return "wide-monthly";
  const hasName = headerRow.some((h) => NAME_HEADER_HINTS.some((hint) => h.toLowerCase().includes(hint)));
  const hasAmount = headerRow.some((h) => AMOUNT_HEADER_HINTS.some((hint) => h.toLowerCase().includes(hint)));
  const hasDate = headerRow.some((h) => DATE_HEADER_HINTS.some((hint) => h.toLowerCase().includes(hint)));
  if (hasName && hasAmount && hasDate) return "flat";
  return "unknown";
}

function suggestColumn(headerRow, hints) {
  const idx = headerRow.findIndex((h) => hints.some((hint) => h.toLowerCase().includes(hint)));
  return idx >= 0 ? idx : null;
}

/** Suggested column indices for a 'flat' sheet — admin confirms/overrides these before anything is parsed. */
export function suggestFlatMapping(headerRow) {
  return {
    nameCol: suggestColumn(headerRow, NAME_HEADER_HINTS),
    amountCol: suggestColumn(headerRow, AMOUNT_HEADER_HINTS),
    dateCol: suggestColumn(headerRow, DATE_HEADER_HINTS),
  };
}

// A per-column footer row (e.g. "MONTHLY TOTALS") sums every member's
// contribution for that month under a label that sits in the same NAME
// column as real members — nothing else in the sheet's shape marks it as
// different. A real investor is never literally named "total(s)"; treating
// that as the signal keeps this general instead of hard-coding one club's
// exact footer label.
const AGGREGATE_ROW_NAME_PATTERN = /\btotal(s)?\b/i;

/** Builds rows in the exact shape src/lib/migration/parseSheet.js#meltWideMonthlySheet expects. */
export function buildWideMonthlyMembers(headerRow, dataRows, aboveHeaderRow = []) {
  const nameColIdx = headerRow.findIndex((h) => NAME_HEADER_HINTS.some((hint) => h.toLowerCase().includes(hint))) ?? 0;
  const totalColIdx = headerRow.findIndex((h) => h.toLowerCase().includes("total"));
  const monthCols = headerRow
    .map((h, idx) => ({ idx, parsed: parseMonthHeaderWithYearFallback(h, aboveHeaderRow[idx]), raw: h }))
    .filter((c) => c.idx !== nameColIdx && c.idx !== totalColIdx && c.parsed);

  return dataRows
    .filter((row) => row[nameColIdx] !== null && row[nameColIdx] !== undefined && String(row[nameColIdx]).trim() !== "")
    .filter((row) => !AGGREGATE_ROW_NAME_PATTERN.test(String(row[nameColIdx]).trim()))
    .map((row) => ({
      name: String(row[nameColIdx]).trim(),
      total_cell: totalColIdx >= 0 ? (typeof row[totalColIdx] === "number" ? row[totalColIdx] : row[totalColIdx] ?? null) : null,
      months: monthCols.map((c) => ({
        y: c.parsed?.year ?? null,
        m: c.parsed?.year ? c.parsed.monthLabel : `UNLABELED_COL${c.idx}`,
        v: row[c.idx] === null || row[c.idx] === undefined || row[c.idx] === "" ? "-" : row[c.idx],
      })),
    }));
}

/** Builds rows in the exact shape src/lib/migration/parseSheet.js#flattenFlatSheet expects. */
export function buildFlatEntries(headerRow, dataRows, mapping) {
  const { nameCol, amountCol, dateCol } = mapping;
  return dataRows
    .filter((row) => row[nameCol] !== null && row[nameCol] !== undefined && String(row[nameCol]).trim() !== "")
    .map((row) => {
      const dateValue = row[dateCol];
      const isDateInstance = dateValue instanceof Date;
      return {
        name: String(row[nameCol]).trim(),
        amount_raw: row[amountCol],
        date_raw: isDateInstance ? dateValue.toISOString().split("T")[0] : dateValue,
        date_was_excel_date_type: isDateInstance,
      };
    });
}
