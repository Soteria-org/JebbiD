import React, { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Briefcase, TrendingUp, Wallet } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Card, StatCard } from "@/components/ui/primitives";
import { useStaffMetrics } from "@/features/staff/useStaffMetrics";
import { expectedReturn, fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";

export function ReportsScreen({ ctx }) {
  const m = useStaffMetrics(ctx);
  const pieData = [
    { name: "Standard", value: m.active.filter((p) => p.package === "standard").reduce((s, p) => s + p.amount, 0) },
    { name: "Corporate", value: m.active.filter((p) => p.package === "corporate").reduce((s, p) => s + p.amount, 0) },
  ];
  const liabilityByMonth = useMemo(() => {
    const buckets = {};
    m.active.forEach((p) => {
      const key = p.maturityDate ? new Date(p.maturityDate).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : "Pending";
      buckets[key] = (buckets[key] || 0) + (p.expectedReturn || 0);
    });
    return Object.keys(buckets).map((k) => ({ month: k, liability: buckets[k] }))
      .sort((a, b) => new Date("1 " + a.month) - new Date("1 " + b.month)).slice(0, 8);
  }, [m.active]);
  const contributionsByMonth = useMemo(() => {
    const buckets = {};
    const investments = Array.isArray(ctx.investments) ? ctx.investments : [];
    investments.forEach((p) => {
      const key = p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : "Pending";
      buckets[key] = (buckets[key] || 0) + (p.amount || 0);
    });
    return Object.keys(buckets).map((k) => ({ month: k, amount: buckets[k] }));
  }, [ctx.investments]);
  const PIE_COLORS = [C.brand, C.sidebarActive];

  return (
    <PageShell ctx={ctx} title="Reports">
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label="Assets Under Management" value={fmtUGX(m.aum)} icon={Wallet} />
        <StatCard label="Standard Package" value={String(m.standardCount)} icon={Briefcase} sub="active positions" />
        <StatCard label="Corporate Package" value={String(m.corporateCount)} icon={Briefcase} sub="active positions" />
        <StatCard label="Returns Liability" value={fmtUGX(m.active.reduce((s, p) => s + p.expectedReturn, 0))} icon={TrendingUp} sub="owed at maturity" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Corporate vs Standard Split</div>
          <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 14 }}>Share of AUM by package</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Returns Liability Forecast</div>
          <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 14 }}>Returns due by maturity month</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={liabilityByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} />
                <YAxis tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} tickFormatter={(v) => (v / 1000).toFixed(0) + "K"} />
                <Tooltip formatter={(v) => fmtUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="liability" fill={C.brand} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Monthly Contributions</div>
        <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 14 }}>Total deposits submitted per month</div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={contributionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} />
              <YAxis tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} tickFormatter={(v) => (v / 1000000).toFixed(1) + "M"} />
              <Tooltip formatter={(v) => fmtUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey="amount" stroke={C.brand} fill={C.cardBg} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </PageShell>
  );
}
