import { CORPORATE_THRESHOLD, PERIOD_MONTHS, RATES } from "@/lib/constants";
import { addMonths, packageForAmount } from "@/lib/format";

/**
 * The historical calculation engine — spec §5. The club confirmed (see the
 * migration task brief) there is no separate historical rate table anywhere in
 * this schema or in the club's records: RATES/CORPORATE_THRESHOLD/PERIOD_MONTHS
 * from src/lib/constants.js ARE the rule, applied to the investment's own
 * historical start date, not today's date. Maturity is always start_date +
 * PERIOD_MONTHS — never the migration date, never "today".
 *
 * Deliberately reuses packageForAmount() from src/lib/format.js (the same
 * function the live deposit flow uses) rather than re-deriving the
 * >= CORPORATE_THRESHOLD rule a second time.
 */
export function computeHistoricalPosition(amount, startDateISO) {
  const packageCode = packageForAmount(amount);
  const ratePct = RATES[packageCode] * 100; // investment_packages.annual_return_rate is stored as 30.00/40.00, not 0.30/0.40
  const expectedReturn = round2(amount * RATES[packageCode]);
  const maturityValue = round2(amount + expectedReturn);
  const maturityDateISO = toISO(addMonths(startDateISO, PERIOD_MONTHS));

  return {
    packageCode,
    annualReturnRatePct: ratePct,
    durationMonths: PERIOD_MONTHS,
    startDateISO,
    maturityDateISO,
    expectedReturn,
    maturityValue,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function toISO(date) {
  return date.toISOString().split("T")[0];
}
