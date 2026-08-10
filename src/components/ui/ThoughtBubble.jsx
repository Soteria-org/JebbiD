import React from "react";
import { C, FONT_MONO } from "@/lib/theme";

/**
 * A floating message card — the "thought bubble" pattern from the brand
 * voice system: a small kicker label + one short, considered sentence,
 * not a paragraph. Content is passed in by the caller (never invented here)
 * so every instance stays honest — e.g. "Weekly Goal" progress reflects the
 * investor's real numbers, not a scripted line.
 */
export function ThoughtBubble({ icon, kicker, children, tone }) {
  const accent = tone === "gold" ? C.gold : tone === "sage" ? C.sage : C.brand;
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start", background: C.surface,
      border: "1px solid " + C.line, borderRadius: 8, padding: "14px 16px",
      boxShadow: C.shadowCard,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", background: C.cardBg, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: accent, marginBottom: 3 }}>
          {kicker}
        </div>
        <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  );
}
