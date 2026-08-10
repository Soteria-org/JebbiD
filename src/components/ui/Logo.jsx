import React from "react";

// The real Jebbidox brand mark, reconstructed as a single filled vector path
// (not a stroked line, not a font glyph) against the brand's own reference
// geometry: a 359x375 canvas, a circle centered at (180,176) with r=164, and
// a calligraphic "J" silhouette — curled top terminating in a small bulb,
// a heavy right-leaning diagonal stem, and an open hooked tail (deliberately
// not a closed loop, preserving the red negative space inside the hook) —
// filling the (117,95)-(250,262) bounding box. Colors are fixed, not theme
// tokens: a logo is a lockup, not a themable surface, so it reads identically
// on the light landing page, the dark hero, or the sidebar's dark background.
// `animated` adds a slow, deliberate breathing ring (a stamped-wax-seal cue,
// not a spinner) — off by default so it isn't sprinkled onto every small nav
// usage.
const LOGO_RED = "#E80F28";
const LOGO_INK = "#2A0A0D";
const LOGO_J_PATH = "M 122 118 C 118 108 128 90 155 85 C 185 80 215 90 228 102 " +
  "C 238 110 235 122 222 128 C 210 148 200 175 188 202 C 178 222 166 238 152 250 " +
  "C 140 258 126 258 116 250 C 108 244 108 236 116 232 L 128 228 " +
  "C 138 222 148 212 158 198 C 168 184 176 168 184 150 C 190 136 196 126 198 116 " +
  "C 200 108 194 100 182 98 C 165 94 145 96 132 104 C 126 108 120 112 122 118 Z";

export function Logo({ size, animated }) {
  const s = size || 34;
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        flexShrink: 0,
        boxShadow: animated ? "0 0 0 0 rgba(232,15,40,0.35)" : "none",
        animation: animated ? "jbd-logo-breathe 3.2s ease-in-out infinite" : "none",
      }}
    >
      {/* viewBox is cropped to exactly the circle's own bounding box (not the
          reference image's full canvas, which has margin around the circle)
          so the red disc fills this component edge-to-edge, matching how the
          logo is used everywhere else in the app as a tight circular badge. */}
      <svg viewBox="16 12 328 328" style={{ width: "100%", height: "100%", display: "block" }} role="img" aria-label="Jebbidox">
        <circle cx="180" cy="176" r="164" fill={LOGO_RED} />
        <path d={LOGO_J_PATH} fill={LOGO_INK} />
      </svg>
    </div>
  );
}
