import React from "react";
import { Check } from "@/components/icons/index";
import { C } from "@/lib/theme";

const TOOLTIP_TEXT = "Verified Investor";

/**
 * Small red circle + white checkmark — the Verified Investor trust credential.
 * Flat, no gradients/shadows-as-decoration, matching the rest of the app's
 * house style (see any Card/StatCard in primitives.jsx). A 1.5px ring in the
 * surrounding surface color separates it from whatever it's sitting on top of
 * (an avatar, a brand-colored card) — same "cutout" trick real badge UIs use.
 *
 * `variant="onBrand"` inverts the fill for use directly on a C.brand-colored
 * surface (e.g. the investor dashboard's Member Ledger card), where a red
 * badge on a red background would have no contrast.
 *
 * Hover/click (and long-press on touch) reveals "Verified Investor" via the
 * native `title` attribute — the same tooltip convention already used
 * throughout the app (see Header.jsx's theme toggle, sync indicator, etc.).
 */
export function VerifiedBadge({ size = 16, variant = "default", style, testId }) {
  const onBrand = variant === "onBrand";
  return (
    <span
      role="img"
      aria-label={TOOLTIP_TEXT}
      title={TOOLTIP_TEXT}
      data-testid={testId || "verified-badge"}
      style={Object.assign(
        {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          flexShrink: 0,
          boxSizing: "border-box",
          background: onBrand ? C.white : C.brand,
          border: (onBrand ? "1.5px solid " + C.brand : "1.5px solid " + C.surface),
          cursor: "default",
        },
        style
      )}
    >
      <Check size={Math.max(size * 0.6, 8)} color={onBrand ? C.brand : C.white} />
    </span>
  );
}
