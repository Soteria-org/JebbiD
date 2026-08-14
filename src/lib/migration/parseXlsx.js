import * as XLSX from "xlsx";

/**
 * Browser-side spreadsheet ingestion — spec §4.3: "Inspect the uploaded
 * file's real headers; suggest a mapping ... but never assume it silently."
 * Reads the workbook, suggests a format per sheet (this club's real
 * spreadsheet has exactly two shapes — see src/lib/migration/parseSheet.js),
 * and hands back everything the admin needs to confirm or override before
 * anything is validated.
 */

const MONTH_NAMES = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const NAME_HEADER_HINTS = ["name", "investor", "member", "full name", "client"];
const AMOUNT_HEADER_HINTS = ["amount", "value", "sum", "total"];
const DATE_HEADER_HINTS = ["date", "when", "day"];

/** @param {ArrayBuffer} arrayBuffer */
export function readWorkbook(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  return wb.SheetNames.map((sheetName) => {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false, raw: true });
    const headerRow = (rows[0] || []).map((h) => (h === null || h === undefined ? "" : String(h).trim()));
    const dataRows = rows.slice(1);
    return { sheetName, headerRow, dataRows, suggestedFormat: detectFormat(headerRow) };
  });
}

function parseMonthHeader(headerText) {
  const upper = (headerText || "").trim().toUpperCase();
  const match = MONTH_NAMES.find((m) => upper.startsWith(m));
  if (!match) return null;
  const yearMatch = upper.match(/\d{4}/);
  return { monthLabel: match, year: yearMatch ? parseInt(yearMatch[0], 10) : null };
}

function detectFormat(headerRow) {
  const monthColumns = headerRow.filter((h) => parseMonthHeader(h)).length;
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

/** Builds rows in the exact shape src/lib/migration/parseSheet.js#meltWideMonthlySheet expects. */
export function buildWideMonthlyMembers(headerRow, dataRows) {
  const nameColIdx = headerRow.findIndex((h) => NAME_HEADER_HINTS.some((hint) => h.toLowerCase().includes(hint))) ?? 0;
  const totalColIdx = headerRow.findIndex((h) => h.toLowerCase().includes("total"));
  const monthCols = headerRow
    .map((h, idx) => ({ idx, parsed: parseMonthHeader(h), raw: h }))
    .filter((c) => c.idx !== nameColIdx && c.idx !== totalColIdx);

  return dataRows
    .filter((row) => row[nameColIdx] !== null && row[nameColIdx] !== undefined && String(row[nameColIdx]).trim() !== "")
    .map((row, i) => ({
      name: String(row[nameColIdx]).trim(),
      total_cell: totalColIdx >= 0 ? (typeof row[totalColIdx] === "number" ? row[totalColIdx] : row[totalColIdx] ?? null) : null,
      months: monthCols.map((c) => ({
        y: c.parsed?.year ?? null,
        m: c.parsed?.monthLabel ?? `UNLABELED_COL${c.idx}`,
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
