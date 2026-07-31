import React from "react";
import { C, FONT_MONO } from "@/lib/theme";

/**
 * The shared "J" roundel — previously copy-pasted inline markup (a plain
 * TrendingUp-in-a-square) duplicated in Sidebar.jsx and LoginScreen.jsx with
 * no visual relationship to the passbook identity. `animated` adds a slow,
 * deliberate breathing ring (a stamped-wax-seal cue, not a spinner) — off by
 * default so it isn't sprinkled onto every small nav usage.
 */
export function Logo({ size, animated, tone }) {
  const s = size || 34;
  const isDark = tone !== "onLight";
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: "50%",
        border: "1.5px solid " + C.gold,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: isDark ? C.gold : C.brand,
        fontFamily: FONT_MONO,
        fontWeight: 600,
        fontSize: s * 0.4,
        background: "transparent",
        animation: animated ? "jbd-logo-breathe 3.2s ease-in-out infinite" : "none",
      }}
    >
      J
    </div>
  );
}
