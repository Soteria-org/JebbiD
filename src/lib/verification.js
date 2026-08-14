/**
 * Verified Investor status — derived, never stored. Per the migration spec
 * (docs/migration/HISTORICAL_DATA_MIGRATION_SPEC.md §2.2), an investor is
 * Verified if and only if their KYC is currently approved. Migration status
 * and financial-history trust never factor into this — a migrated investor
 * with un-reviewed KYC is NOT verified just because their historical records
 * were imported.
 *
 * Accepts whichever shape the caller happens to have on hand: the app-wide
 * store's camelCase investor object (`kycStatus`), a raw `profiles` row with
 * `investor_details` joined in (object or array, depending on how Supabase
 * resolves the relationship), or a bare `investor_details` row itself.
 */
export function isVerifiedInvestor(investor) {
  if (!investor) return false;
  if (investor.kycStatus === "approved") return true;
  if (investor.kyc_status === "approved") return true;
  const details = Array.isArray(investor.investor_details) ? investor.investor_details[0] : investor.investor_details;
  return details?.kyc_status === "approved";
}
