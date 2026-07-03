import React from "react";
import { ProgressBar, statusBadge } from "@/components/ui/primitives";
import { TODAY } from "@/lib/constants";
import { clampPct, daysBetween, fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";

export function PositionRow({ p }) {
  const total = p.startDate ? daysBetween(p.startDate, p.maturityDate) : 365;
  const elapsed = p.startDate ? clampPct((daysBetween(p.startDate, TODAY) / total) * 100) : 0;
  return (
    <div style={{ padding: "13px 0", borderBottom: "1px solid " + C.line }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{p.id}</span>
          <span style={{ marginLeft: 8, fontSize: 12.5, color: C.inkFaint, textTransform: "capitalize" }}>{p.package} · {p.goal}</span>
        </div>
        {statusBadge(p.status === "pending_verification" ? "pending_verification" : p.status)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>
        <span>{fmtUGX(p.amount)} invested</span>
        <span>{p.status === "active" ? (p.maturityDate <= TODAY ? "Matured" : daysBetween(TODAY, p.maturityDate) + "d to maturity") : "Awaiting approval"}</span>
      </div>
      {p.status === "active" ? <ProgressBar pct={elapsed} tone={elapsed >= 100 ? "warning" : undefined} /> : null}
    </div>
  );
}
