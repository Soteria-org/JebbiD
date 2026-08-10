import React from "react";

// The real Jebbidox brand mark: a solid vivid-red disc with a dark, hand-
// traced script "J" — not a system font glyph (no typeface has this exact
// curled-top, hooked-tail letterform). Fixed colors, not theme tokens — a
// logo is a lockup, not a themable surface, so it reads identically whether
// it sits on the light landing page, the dark hero, or the sidebar's dark
// background. `animated` adds a slow, deliberate breathing ring (a stamped-
// wax-seal cue, not a spinner) — off by default so it isn't sprinkled onto
// every small nav usage.
const LOGO_RED = "#E71920";
const LOGO_INK = "#210606";
const LOGO_J_PATH = "M 63 15 C 54 8, 41 13, 41 21 C 41 27.5, 49 28.5, 52 22.5 " +
  "L 54 58 C 54.5 71, 48 81.5, 38 84 C 30 86, 24 80, 27 72.5 C 28 70, 30.5 69, 32.5 70.5";

export function Logo({ size, animated }) {
  const s = size || 34;
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: LOGO_RED,
        boxShadow: animated ? "0 0 0 0 rgba(231,25,32,0.35)" : "none",
        animation: animated ? "jbd-logo-breathe 3.2s ease-in-out infinite" : "none",
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: "66%", height: "66%" }} aria-hidden="true">
        <path d={LOGO_J_PATH} fill="none" stroke={LOGO_INK} strokeWidth="10.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
