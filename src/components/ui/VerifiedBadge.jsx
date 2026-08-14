import React from "react";
import { Check } from "@/components/icons/index";
import { C } from "@/lib/theme";

/**
 * Verified Investor status — spec §2.1/§2.2. A small red circular badge with
 * a white checkmark, placed beside an investor's name/Member ID wherever
 * their identity is shown. Deliberately reads ONLY off
 * investor_details.kyc_status === 'approved' (via the derived
 * verification_status column, or kyc_status directly if that's what the
 * caller has on hand) — never off migration_status. An imported record is
 * not, by itself, ever a reason to show this badge (spec §2.1: "Never show
 * this badge because a record was imported").
 *
 * @param {{ verified: boolean, size?: number }} props
 */
export function VerifiedBadge({ verified, size = 16 }) {
  if (!verified) return null;
  return (
    <span
      title="Verified Investor"
      aria-label="Verified Investor"
      data-testid="verified-investor-badge"
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: size, height: size, borderRadius: "50%", background: C.brand,
        flexShrink: 0, verticalAlign: "middle",
      }}
    >
      <Check size={size * 0.65} color={C.white} />
    </span>
  );
}

/** True iff an investor's current KYC is complete and approved — spec §2.2's exact definition of "Verified", independent of migration/financial-history status. */
export function isVerifiedInvestor(investorDetails) {
  if (!investorDetails) return false;
  if (investorDetails.verification_status) return investorDetails.verification_status === "verified";
  return investorDetails.kyc_status === "approved";
}
