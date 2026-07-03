import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, Calendar, Plus, TrendingUp, Wallet } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState, GuidanceBanner, ProgressBar, StatCard } from "@/components/ui/primitives";
import { PositionRow } from "@/features/investor/PositionRow";
import { TODAY } from "@/lib/constants";
import { clampPct, daysBetween, expectedReturn, fmtDate, fmtUGX, maturityValue } from "@/lib/format";
import { C, FONT_DISPLAY } from "@/lib/theme";

export function InvestorDashboard({ ctx }) {
  const inv = ctx.currentInvestor;
  const positions = ctx.getInvestorInvestments(inv.id);
  const active = positions.filter((p) => p.status === "active");
  const totalInvested = active.reduce((s, p) => s + p.amount, 0);
  const projectedValue = active.reduce((s, p) => s + p.maturityValue, 0);
  const expectedReturns = active.reduce((s, p) => s + p.expectedReturn, 0);
  const upcoming = active.filter((p) => p.maturityDate >= TODAY).sort((a, b) => a.maturityDate - b.maturityDate)[0];
  const maturable = positions.filter((p) => p.status === "active" && p.maturityDate <= TODAY && !p.maturityChoice);

  if (positions.length === 0) {
    return (
      <PageShell ctx={ctx} title="Dashboard">
        <Card>
          <EmptyState icon={TrendingUp} title={"Welcome, " + inv.fullName.split(" ")[0]}
            body="You have no active investments yet. Let's start your investment journey toward your goal of getting your funds into a package."
            action={<Btn icon={Plus} onClick={() => ctx.goTo("invest")}>Start Investing</Btn>} />
        </Card>
      </PageShell>
    );
  }

  const chartData = active.map((p) => ({ name: p.id, Principal: p.amount, Projected: p.maturityValue }));

  return (
    <PageShell ctx={ctx} title="Dashboard">
      <div style={{ marginBottom: 4, fontFamily: FONT_DISPLAY, fontSize: 21, fontWeight: 600, color: C.ink }}>
        Welcome back, {inv.fullName.split(" ")[0]}
      </div>
      <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20 }}>
        Goal: {inv.goal} · Member since {fmtDate(inv.dateRegistered)}
      </div>

      {maturable.length > 0 ? (
        <GuidanceBanner tone="warning" icon={Award}>
          {maturable.length === 1 ? "One investment has " : maturable.length + " investments have "}
          reached maturity. Visit the Maturity Centre to choose what happens next.
          <span onClick={() => ctx.goTo("maturity")} style={{ marginLeft: 8, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Go to Maturity Centre</span>
        </GuidanceBanner>
      ) : null}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label="Total Invested" value={fmtUGX(totalInvested)} icon={Wallet} sub={active.length + " active position" + (active.length === 1 ? "" : "s")} />
        <StatCard label="Projected Value" value={fmtUGX(projectedValue)} icon={TrendingUp} sub="At maturity, all positions" tone="success" />
        <StatCard label="Expected Returns" value={fmtUGX(expectedReturns)} icon={Award} sub="Combined across active positions" />
        <StatCard label="Next Maturity" value={upcoming ? fmtDate(upcoming.maturityDate) : "—"} icon={Calendar} sub={upcoming ? daysBetween(TODAY, upcoming.maturityDate) + " days remaining" : "No upcoming maturities"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 18, marginBottom: 18 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Portfolio Projection</div>
          <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 14 }}>Principal vs. projected value at maturity, per position</div>
          <div style={{ height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} />
                <YAxis tick={{ fontSize: 11, fill: C.inkFaint }} axisLine={{ stroke: C.line }} tickFormatter={(v) => (v / 1000000).toFixed(1) + "M"} />
                <Tooltip formatter={(v) => fmtUGX(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="Principal" fill={C.cardBorder} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Projected" fill={C.brand} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Goal Progress</div>
          <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 16 }}>{inv.goal}</div>
          {(() => {
            const goalTarget = Math.max(totalInvested * 1.6, 3000000);
            const pct = clampPct((projectedValue / goalTarget) * 100);
            return (
              <>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 600, color: C.ink, marginBottom: 8 }}>{pct.toFixed(0)}%</div>
                <ProgressBar pct={pct} />
                <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>
                  {fmtUGX(projectedValue)} of an estimated {fmtUGX(goalTarget)} target
                </div>
              </>
            );
          })()}
        </Card>
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>Active Positions</div>
          <Btn size="sm" variant="ghost" onClick={() => ctx.goTo("investments")}>View All</Btn>
        </div>
        {positions.slice(0, 4).map((p) => <PositionRow key={p.id} p={p} />)}
      </Card>
    </PageShell>
  );
}
