import React, { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, Calendar, Clock, Users, Wallet } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Card, StatCard } from "@/components/ui/primitives";
import { useStaffMetrics } from "@/features/staff/useStaffMetrics";
import { fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";

export function AdminDashboard({ ctx }) {
  const m = useStaffMetrics(ctx);
  const aumTrend = useMemo(() => {
    const sorted = [...ctx.investments].filter((p) => p.status === "active").sort((a, b) => a.startDate - b.startDate);
    let running = 0;
    return sorted.map((p) => { running += p.amount; return { label: p.startDate.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), aum: running }; });
  }, [ctx.investments]);
  const depositThroughput = useMemo(() => {
    const buckets = {};
    ctx.investments.forEach((p) => {
      const key = p.createdAt.toLocaleDateString("en-GB", { month: "short" });
      buckets[key] = buckets[key] || { approved: 0, pending: 0 };
      if (p.depositStatus === "approved") buckets[key].approved += 1; else if (p.depositStatus === "pending") buckets[key].pending += 1;
    });
    return Object.keys(buckets).map((k) => ({ month: k, Approved: buckets[k].approved, Pending: buckets[k].pending }));
  }, [ctx.investments]);

  return (
    <PageShell ctx={ctx} title="Super Administrator Dashboard">
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label="Total Investors" value={String(ctx.investors.length)} icon={Users} />
        <StatCard label="Assets Under Management" value={fmtUGX(m.aum)} icon={Wallet} tone="success" />
        <StatCard label="Pending Approvals" value={String(m.pendingDeposits.length)} icon={Clock} tone={m.pendingDeposits.length > 0 ? "danger" : undefined} />
        <StatCard label="Pending Withdrawals" value={String(m.pendingWithdrawals.length)} icon={ArrowUpRight} />
        <StatCard label="Maturities (90 days)" value={String(m.upcomingMaturities.length)} icon={Calendar} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>AUM Growth Trajectory</div>
          <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 14 }}>Cumulative active assets by activation date</div>
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={aumTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} />
                <YAxis tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} tickFormatter={(v) => (v / 1000000).toFixed(1) + "M"} />
                <Tooltip formatter={(v) => fmtUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area type="monotone" dataKey="aum" stroke={C.brand} fill={C.cardBg} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Insights</div>
          <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 14 }}>Operational signals</div>
          {[
            ["Most Popular Package", m.standardCount >= m.corporateCount ? "Standard" : "Corporate"],
            ["Overdue Maturities", String(m.overdueMaturities.length) + " awaiting investor choice"],
            ["Deposit Backlog", String(m.pendingDeposits.length) + " pending review"],
            ["Avg. Position Size", fmtUGX(m.active.length ? m.aum / m.active.length : 0)],
          ].map((r) => (
            <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
              <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Deposit Processing Rate</div>
        <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 14 }}>Approved vs. pending, by submission month — a backlog signal</div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={depositThroughput}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} />
              <YAxis tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Approved" stackId="a" fill={C.success} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Pending" stackId="a" fill={C.warning} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </PageShell>
  );
}
