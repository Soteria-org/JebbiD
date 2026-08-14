/**
 * Parses the club's "withdrawals" sheet shape (DATE / MEMBER / AMOUNT PAID /
 * MONTH COVERED / PAYMENT METHOD) into flat entries. Kept separate from
 * parseXlsx.js's investor-contribution pipeline (buildFlatEntries etc.) --
 * this is withdrawal history, not an investment contribution, and carries two
 * fields (month covered, payment method) that shape doesn't have room for.
 */

const MEMBER_HEADER_HINTS = ["member", "name", "investor", "client"];
const AMOUNT_HEADER_HINTS = ["amount", "paid"];
const DATE_HEADER_HINTS = ["date"];
const MONTH_COVERED_HEADER_HINTS = ["month covered", "month"];
const PAYMENT_METHOD_HEADER_HINTS = ["payment method", "method"];

function findColumn(headerRow, hints) {
  const idx = headerRow.findIndex((h) => hints.some((hint) => h.toLowerCase().includes(hint)));
  return idx >= 0 ? idx : null;
}

/** @returns {{memberCol:number|null, amountCol:number|null, dateCol:number|null, monthCoveredCol:number|null, paymentMethodCol:number|null}} */
export function suggestWithdrawalsMapping(headerRow) {
  return {
    memberCol: findColumn(headerRow, MEMBER_HEADER_HINTS),
    amountCol: findColumn(headerRow, AMOUNT_HEADER_HINTS),
    dateCol: findColumn(headerRow, DATE_HEADER_HINTS),
    monthCoveredCol: findColumn(headerRow, MONTH_COVERED_HEADER_HINTS),
    paymentMethodCol: findColumn(headerRow, PAYMENT_METHOD_HEADER_HINTS),
  };
}

/**
 * @param {Array<Array>} dataRows
 * @param {ReturnType<typeof suggestWithdrawalsMapping>} mapping
 * @returns {Array<{name:string, amount_raw:*, date_raw:string, date_was_excel_date_type:boolean, month_covered:string|null, payment_method_raw:string|null}>}
 */
export function buildWithdrawalEntries(dataRows, mapping) {
  const { memberCol, amountCol, dateCol, monthCoveredCol, paymentMethodCol } = mapping;
  return dataRows
    .filter((row) => row[memberCol] !== null && row[memberCol] !== undefined && String(row[memberCol]).trim() !== "")
    .map((row) => {
      const dateValue = row[dateCol];
      const isDateInstance = dateValue instanceof Date;
      return {
        name: String(row[memberCol]).trim(),
        amount_raw: row[amountCol],
        date_raw: isDateInstance ? dateValue.toISOString().split("T")[0] : dateValue,
        date_was_excel_date_type: isDateInstance,
        month_covered: monthCoveredCol !== null ? (row[monthCoveredCol] ? String(row[monthCoveredCol]).trim() : null) : null,
        payment_method_raw: paymentMethodCol !== null ? (row[paymentMethodCol] ? String(row[paymentMethodCol]).trim() : null) : null,
      };
    });
}

/** "Mobile money" / "Mobile Money " -> 'mobile_money'; "Bank transfer" -> 'bank_transfer'. Returns null (never guesses) if the source text doesn't clearly match either. */
export function normalizePaymentMethod(raw) {
  const lower = (raw || "").trim().toLowerCase();
  if (lower.includes("mobile")) return "mobile_money";
  if (lower.includes("bank")) return "bank_transfer";
  return null;
}
