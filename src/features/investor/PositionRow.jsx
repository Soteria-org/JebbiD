import React from "react";
import { ProgressBar, statusBadge } from "@/components/ui/primitives";
import { clampPct, daysBetween, fmtUGX, todayISO } from "@/lib/format";
import { C, FONT_MONO } from "@/lib/theme";

/**
 * One "page" of the digital passbook — a single investment position rendered
 * like a printed ledger line rather than a generic list item: mono reference
 * number, dashed rule below, amount in tabular numerals.
 */
export function PositionRow({ p }) {
  const today = todayISO();
  const total = p.startDate ? daysBetween(p.startDate, p.maturityDate) : 365;
  const elapsed = p.startDate ? clampPct((daysBetween(p.startDate, today) / total) * 100) : 0;
  return (
    <div className="jbd-ledger-row" style={{ padding: "14px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 13, color: C.ink, letterSpacing: 0.3 }}>{p.referenceNumber || "PENDING"}</span>
          <span style={{ marginLeft: 8, fontSize: 12.5, color: C.inkFaint, textTransform: "capitalize" }}>{p.package} · {p.goal}</span>
        </div>
        {statusBadge(p.status === "pending_verification" ? "pending_verification" : p.status)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>
        <span style={{ fontFamily: FONT_MONO }}>{fmtUGX(p.amount)} invested</span>
        <span>{p.status === "active" ? (p.maturityDate <= today ? "Matured" : daysBetween(today, p.maturityDate) + "d to maturity") : "Awaiting approval"}</span>
      </div>
      {p.status === "active" ? <ProgressBar pct={elapsed} tone={elapsed >= 100 ? "warning" : undefined} /> : null}
    </div>
  );
}
