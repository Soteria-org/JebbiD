import React from "react";
import { C } from "@/lib/theme";

/**
 * Custom countdown ring — not a stock icon. Draws an SVG arc that visually
 * depletes as the deadline approaches (elapsed fraction of pauseWarningAt ->
 * pauseDeadline), colored by urgency. Used anywhere a real, enforced pause
 * deadline needs to be shown as more than just text: Risk & Compliance
 * Monitor's "Pending Freezes" list and the investor's own dashboard banner.
 */
function urgency(daysLeft) {
  if (daysLeft <= 0) return { tone: C.danger, toneBg: C.dangerBg, label: "Overdue" };
  if (daysLeft <= 2) return { tone: C.danger, toneBg: C.dangerBg, label: daysLeft + " day" + (daysLeft === 1 ? "" : "s") + " left" };
  if (daysLeft <= 5) return { tone: C.warning, toneBg: C.warningBg, label: daysLeft + " days left" };
  return { tone: C.inkSoft, toneBg: C.cardBg, label: daysLeft + " days left" };
}

export function CountdownRing({ warningAt, deadline, size = 34 }) {
  const now = Date.now();
  const start = new Date(warningAt).getTime();
  const end = new Date(deadline).getTime();
  const total = Math.max(end - start, 1);
  const remaining = Math.max(end - now, 0);
  const elapsedFraction = Math.min(1, Math.max(0, 1 - remaining / total));
  const daysLeft = Math.ceil(remaining / (1000 * 60 * 60 * 24));
  const { tone } = urgency(daysLeft);

  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - elapsedFraction);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.line} strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={3}
        strokeDasharray={c} strokeDashoffset={c - dash} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.3s" }}
      />
    </svg>
  );
}

/** Full badge: ring + "N days left" text, used inline in lists and banners. */
export function PauseCountdownBadge({ warningAt, deadline, size = 28 }) {
  if (!warningAt || !deadline) return null;
  const daysLeft = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const u = urgency(daysLeft);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 4px", borderRadius: 999, background: u.toneBg }}>
      <CountdownRing warningAt={warningAt} deadline={deadline} size={size} />
      <span style={{ fontSize: 12, fontWeight: 700, color: u.tone }}>{u.label}</span>
    </div>
  );
}
