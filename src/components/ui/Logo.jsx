import React from "react";

// The real Jebbidox brand mark: a solid vivid-red disc with a dark, stylized
// "J". Fixed colors, not theme tokens — a logo is a lockup, not a themable
// surface, so it reads identically whether it sits on the light landing page,
// the dark hero, or the sidebar's garnet background. `animated` adds a slow,
// deliberate breathing ring (a stamped-wax-seal cue, not a spinner) — off by
// default so it isn't sprinkled onto every small nav usage.
const LOGO_RED = "#E71920";
const LOGO_INK = "#210606";

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
        color: LOGO_INK,
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 800,
        fontStyle: "italic",
        fontSize: s * 0.52,
        lineHeight: 1,
        boxShadow: animated ? "0 0 0 0 rgba(231,25,32,0.35)" : "none",
        animation: animated ? "jbd-logo-breathe 3.2s ease-in-out infinite" : "none",
      }}
    >
      J
    </div>
  );
}
