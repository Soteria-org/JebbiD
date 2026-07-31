import React, { useState } from "react";
import { ClipboardList, FileText } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState, statusBadge } from "@/components/ui/primitives";
import { fmtDateTime, fmtUGX } from "@/lib/format";
import { openPrintDocument } from "@/lib/print";
import { buildReceiptHtml } from "@/lib/printTemplates";
import { C } from "@/lib/theme";

export function TransactionHistory({ ctx }) {
  const [filter, setFilter] = useState("all");
  const inv = ctx.currentInvestor;
  const positions = ctx.getInvestorInvestments(ctx.session.id);
  const withdrawals = ctx.getInvestorWithdrawals(ctx.session.id);
  let events = [];
  positions.forEach((p) => {
    events.push({ type: "deposit", date: p.createdAt, label: "Deposit submitted — " + (p.referenceNumber || p.id), amount: p.amount, status: p.depositStatus, receipt: { kind: "deposit", transaction: p } });
    if (p.startDate) events.push({ type: "investment", date: p.startDate, label: "Investment activated — " + (p.referenceNumber || p.id), amount: p.amount, status: "active", receipt: { kind: "deposit", transaction: p } });
  });
  withdrawals.forEach((w) => {
    events.push({ type: "withdrawal", date: w.requestedAt, label: "Withdrawal requested — " + (w.referenceNumber || w.id), amount: w.amount, status: w.status });
    if (w.paidAt) events.push({ type: "withdrawal", date: w.paidAt, label: "Withdrawal paid — " + (w.referenceNumber || w.id), amount: w.netAmount, status: "paid", receipt: { kind: "withdrawal", transaction: w } });
  });

  function viewReceipt(receipt) {
    if (!inv || !receipt) return;
    const html = buildReceiptHtml({ org: ctx.org, investor: inv, kind: receipt.kind, transaction: receipt.transaction });
    const opened = openPrintDocument("Receipt", html);
    if (!opened) ctx.showToast("Your browser blocked the receipt window — allow pop-ups for this site and try again.", "error");
  }
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
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: i === events.length - 1 ? "none" : "1px solid " + C.line, gap: 12 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{e.label}</div>
              <div style={{ fontSize: 12, color: C.inkFaint }}>{fmtDateTime(e.date)}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {e.receipt ? <Btn size="sm" variant="ghost" icon={FileText} onClick={() => viewReceipt(e.receipt)}>Receipt</Btn> : null}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{fmtUGX(e.amount)}</div>
                {statusBadge(e.status)}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </PageShell>
  );
}
