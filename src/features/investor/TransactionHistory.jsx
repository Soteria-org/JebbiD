import React, { useState } from "react";
import { ClipboardList } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Card, EmptyState, statusBadge } from "@/components/ui/primitives";
import { fmtDateTime, fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";

export function TransactionHistory({ ctx }) {
  const [filter, setFilter] = useState("all");
  const positions = ctx.getInvestorInvestments(ctx.session.id);
  const withdrawals = ctx.getInvestorWithdrawals(ctx.session.id);
  let events = [];
  positions.forEach((p) => {
    events.push({ type: "deposit", date: p.createdAt, label: "Deposit submitted — " + p.id, amount: p.amount, status: p.depositStatus });
    if (p.startDate) events.push({ type: "investment", date: p.startDate, label: "Investment activated — " + p.id, amount: p.amount, status: "active" });
  });
  withdrawals.forEach((w) => {
    events.push({ type: "withdrawal", date: w.requestedAt, label: "Withdrawal requested — " + w.id, amount: w.amount, status: w.status });
    if (w.paidAt) events.push({ type: "withdrawal", date: w.paidAt, label: "Withdrawal paid — " + w.id, amount: w.netAmount, status: "paid" });
  });
  events.sort((a, b) => b.date - a.date);
  if (filter !== "all") events = events.filter((e) => e.type === filter);

  return (
    <PageShell ctx={ctx} title="Transaction History">
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["all", "deposit", "investment", "withdrawal"].map((f) => (
          <div key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 14px", borderRadius: 100, fontSize: 12.5, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
            background: filter === f ? C.brand : C.cardBg, color: filter === f ? C.white : C.inkSoft,
          }}>{f}</div>
        ))}
      </div>
      <Card>
        {events.length === 0 ? <EmptyState icon={ClipboardList} title="No transactions" body="Activity will appear here as it happens." /> : events.map((e, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: i === events.length - 1 ? "none" : "1px solid " + C.line }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{e.label}</div>
              <div style={{ fontSize: 12, color: C.inkFaint }}>{fmtDateTime(e.date)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{fmtUGX(e.amount)}</div>
              {statusBadge(e.status)}
            </div>
          </div>
        ))}
      </Card>
    </PageShell>
  );
}
