import React from "react";
import { Download, FileText } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState } from "@/components/ui/primitives";
import { openPrintDocument } from "@/lib/print";
import { buildStatementHtml } from "@/lib/printTemplates";
import { C, FONT_MONO } from "@/lib/theme";

function monthKey(d) {
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/**
 * Settled ledger events only — a statement's running balance should reflect
 * money that has actually moved, not deposits still awaiting Finance Officer
 * approval. (TransactionHistory.jsx, by contrast, deliberately shows every
 * stage including pending ones — different purpose, so it builds its own list.)
 */
function buildSettledEvents(positions, withdrawals) {
  const events = [];
  positions.forEach((p) => {
    if (p.startDate) {
      events.push({ date: p.startDate, label: (p.referenceNumber || "Investment") + " activated — " + p.package, amount: p.amount, direction: "credit" });
    }
  });
  withdrawals.forEach((w) => {
    if (w.paidAt) {
      events.push({ date: w.paidAt, label: "Withdrawal paid — " + (w.referenceNumber || "Pending"), amount: w.netAmount ?? w.amount, direction: "debit" });
    }
  });
  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function StatementsScreen({ ctx }) {
  const inv = ctx.currentInvestor;
  if (!inv) {
    return (
      <PageShell ctx={ctx} title="Statements">
        <Card><EmptyState icon={FileText} title="No investor session" body="Log in as an investor to view statement history." /></Card>
      </PageShell>
    );
  }

  const positions = ctx.getInvestorInvestments?.(inv.id) || [];
  const withdrawals = ctx.getInvestorWithdrawals?.(inv.id) || [];
  const allEvents = buildSettledEvents(positions, withdrawals);

  const months = Array.from(new Set(allEvents.map((e) => monthKey(e.date))));
  const periods = ["All Time", ...months.reverse()];

  function viewStatement(period) {
    const events = period === "All Time" ? allEvents : allEvents.filter((e) => monthKey(e.date) === period);
    const html = buildStatementHtml({ org: ctx.org, investor: inv, events, periodLabel: period });
    const opened = openPrintDocument("Statement — " + period, html);
    if (!opened) ctx.showToast("Your browser blocked the statement window — allow pop-ups for this site and try again.", "error");
  }

  return (
    <PageShell ctx={ctx} title="Statements">
      {allEvents.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No settled activity yet" body="Your statement will populate once a deposit is approved and activated." /></Card>
      ) : (
        <Card padded={false}>
          {periods.map((period, i) => (
            <div key={period} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderBottom: i === periods.length - 1 ? "none" : "1px solid " + C.line }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <FileText size={18} color={C.brand} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>Statement — {period}</div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: C.inkFaint }}>{inv.memberId || "—"}</div>
                </div>
              </div>
              <Btn size="sm" variant="ghost" icon={Download} onClick={() => viewStatement(period)}>Print / Download</Btn>
            </div>
          ))}
        </Card>
      )}
      <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 12 }}>
        Statements open in a new tab as a printable document — use your browser&rsquo;s print dialog to save as PDF.
      </div>
    </PageShell>
  );
}
