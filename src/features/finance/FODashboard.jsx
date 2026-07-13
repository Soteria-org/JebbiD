import React from "react";
import { ArrowUpRight, Calendar, CheckCircle2, Wallet } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, StatCard } from "@/components/ui/primitives";
import { useStaffMetrics } from "@/features/staff/useStaffMetrics";
import { fmtDate, fmtUGX, todayISO } from "@/lib/format";
import { C } from "@/lib/theme";

export function FODashboard({ ctx }) {
  const m = useStaffMetrics(ctx);
  const today = todayISO();
  // auditLog is still mock (not wired yet) — "approved this week" isn't reliable
  // against real data until it is, so this stays a soft/approximate figure.
  const weeklyApproved = ctx.auditLog.filter((a) => a.action === "Deposit Approved" && daysAgo(a.timestamp, today) <= 7).length;
  const sortedDeposits = [...m.pendingDeposits].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const upcoming30 = m.upcomingMaturities.filter((p) => daysAgo(today, p.maturityDate) <= 30);

  return (
    <PageShell ctx={ctx} title="Finance Officer Dashboard">
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label="Pending Deposits" value={String(m.pendingDeposits.length)} icon={Wallet} sub="Awaiting your review" tone={m.pendingDeposits.length > 0 ? "warning" : undefined} />
        <StatCard label="Pending Withdrawals" value={String(m.pendingWithdrawals.length)} icon={ArrowUpRight} />
        <StatCard label="Maturities (90 days)" value={String(m.upcomingMaturities.length)} icon={Calendar} />
        <StatCard label="Approved This Week" value={String(weeklyApproved)} icon={CheckCircle2} tone="success" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>Deposit Queue — by wait time</div>
            <Btn size="sm" variant="ghost" onClick={() => ctx.goTo("deposits")}>View All</Btn>
          </div>
          {sortedDeposits.length === 0 ? <div style={{ fontSize: 13, color: C.inkFaint, padding: "20px 0" }}>No deposits awaiting review.</div> :
            sortedDeposits.slice(0, 5).map((d) => (
              <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid " + C.line }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{d.investor?.full_name ?? "—"}</div>
                  <div style={{ fontSize: 12, color: C.inkFaint }}>{fmtUGX(d.amount)} · waiting {daysAgo(d.created_at, today)}d</div>
                </div>
                <Btn size="sm" onClick={() => ctx.goTo("deposits")}>Review</Btn>
              </div>
            ))}
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 14 }}>Maturity Alerts (next 30 days)</div>
          {upcoming30.length === 0 ? <div style={{ fontSize: 13, color: C.inkFaint }}>None upcoming.</div> :
            upcoming30.map((p) => {
              const investor = ctx.getInvestor(p.investorId);
              return (
                <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid " + C.line }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{investor?.fullName ?? "—"}</div>
                  <div style={{ fontSize: 12, color: C.inkFaint }}>matures {fmtDate(p.maturityDate)} · {investor?.phone ?? "—"}</div>
                </div>
              );
            })}
        </Card>
      </div>
    </PageShell>
  );
}

function daysAgo(fromDateStr, toDateStr) {
  return Math.round((new Date(toDateStr) - new Date(fromDateStr)) / (1000 * 60 * 60 * 24));
}
