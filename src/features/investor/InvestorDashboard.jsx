import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Award, Calendar, Plus, TrendingUp, Wallet } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState, GuidanceBanner, ProgressBar, StatCard } from "@/components/ui/primitives";
import { ThoughtBubble } from "@/components/ui/ThoughtBubble";
import { PositionRow } from "@/features/investor/PositionRow";
import { clampPct, currentValue, daysBetween, fmtDate, fmtUGX, todayISO } from "@/lib/format";
import { C, FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

/**
 * Picks one real, computed insight to surface — never a scripted generic
 * line. Priority: an upcoming maturity (most actionable) beats a general
 * portfolio observation.
 */
function dashboardInsight({ upcoming, today, expectedReturns, active }) {
  if (upcoming) {
    const days = daysBetween(today, upcoming.maturityDate);
    return { icon: "🎯", kicker: "Next Milestone", text: days <= 30
      ? (upcoming.referenceNumber || "Your position") + " matures in " + days + " day" + (days === 1 ? "" : "s") + " — start thinking about what's next."
      : (upcoming.referenceNumber || "Your position") + " matures in " + days + " days. Time is doing the work." };
  }
  if (active.length > 1) {
    return { icon: "📈", kicker: "Portfolio", text: "Your money doesn't sleep — " + active.length + " positions accruing right now." };
  }
  return { icon: "💰", kicker: "Financial Wisdom", text: "Money grows best when it has time. Yours has already started." };
}

export function InvestorDashboard({ ctx }) {
  const inv = ctx.currentInvestor;
  const today = todayISO();
  const positions = ctx.getInvestorInvestments(inv.id);
  const active = positions.filter((p) => p.status === "active");
  const totalInvested = active.reduce((s, p) => s + p.amount, 0);
  const projectedValue = active.reduce((s, p) => s + p.maturityValue, 0);
  const currentPortfolioValue = active.reduce((s, p) => s + currentValue(p.amount, p.package, p.startDate, p.maturityDate), 0);
  const expectedReturns = active.reduce((s, p) => s + p.expectedReturn, 0);
  const upcoming = active.filter((p) => p.maturityDate >= today).sort((a, b) => new Date(a.maturityDate) - new Date(b.maturityDate))[0];
  const maturable = positions.filter((p) => p.status === "active" && p.maturityDate <= today && !p.maturityChoice);

  if (positions.length === 0) {
    return (
      <PageShell ctx={ctx} title="Dashboard">
        <Card>
          <EmptyState icon={TrendingUp} title="Your portfolio is waiting for its first entry."
            body="Every investor begins with one deposit. Make yours today."
            action={<Btn icon={Plus} onClick={() => ctx.goTo("invest")}>Start Investing</Btn>} />
        </Card>
      </PageShell>
    );
  }

  const chartData = active.map((p) => ({ name: p.referenceNumber || "Pending", Principal: p.amount, Projected: p.maturityValue }));

  const latestPackage = active.length ? active[active.length - 1].package : null;

  return (
    <PageShell ctx={ctx} title="Dashboard">
      <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginBottom: 22 }}>
        {/* Member Ledger — the "hero wallet" this member's whole account lives inside */}
        <div style={{ flex: "0 0 300px" }}>
          <div style={{
            background: "linear-gradient(135deg, " + C.brand + ", " + C.brandDark + ")",
            borderRadius: 14, padding: 24, color: C.white, position: "relative", overflow: "hidden", boxShadow: C.shadowCard,
          }}>
            <div style={{ position: "absolute", right: -30, bottom: -30, width: 140, height: 140, border: "1px solid rgba(216,189,130,0.25)", borderRadius: "50%" }} />
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1.5, color: C.sidebarText, position: "relative" }}>MEMBER LEDGER</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, margin: "14px 0 26px", position: "relative" }}>{inv.fullName}</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 15, letterSpacing: 1.5, position: "relative" }}>{inv.memberId || "—"}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, fontSize: 11, color: C.sidebarText, position: "relative" }}>
              <span style={{ textTransform: "uppercase" }}>{latestPackage || "No Package Yet"}</span>
              <span>Since {fmtDate(inv.dateRegistered)}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
            Welcome back, {inv.fullName.split(" ")[0]}
          </div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 16 }}>
            Goal: {inv.goal}
          </div>
          {maturable.length === 0 ? (
            <ThoughtBubble {...dashboardInsight({ upcoming, today, expectedReturns, active })} />
          ) : null}
        </div>
      </div>

      {maturable.length > 0 ? (
        <GuidanceBanner tone="warning" icon={Award}>
          {maturable.length === 1 ? "One investment has " : maturable.length + " investments have "}
          reached maturity. Visit the Maturity Centre to choose what happens next.
          <span onClick={() => ctx.goTo("maturity")} style={{ marginLeft: 8, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Go to Maturity Centre</span>
        </GuidanceBanner>
      ) : null}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label="Current Value" value={fmtUGX(currentPortfolioValue)} icon={Wallet} sub={active.length + " active position" + (active.length === 1 ? "" : "s") + " · as of today"} tone="success" />
        <StatCard label="Total Invested" value={fmtUGX(totalInvested)} icon={Wallet} sub="Principal, unchanged" />
        <StatCard label="Projected Value" value={fmtUGX(projectedValue)} icon={TrendingUp} sub="At maturity, all positions" tone="success" />
        <StatCard label="Expected Returns" value={fmtUGX(expectedReturns)} icon={Award} sub="Combined across active positions" />
        <StatCard label="Next Maturity" value={upcoming ? fmtDate(upcoming.maturityDate) : "—"} icon={Calendar} sub={upcoming ? daysBetween(today, upcoming.maturityDate) + " days remaining" : "No upcoming maturities"} />
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
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>Digital Passbook · Active Positions</div>
          <Btn size="sm" variant="ghost" onClick={() => ctx.goTo("investments")}>View All</Btn>
        </div>
        {positions.slice(0, 4).map((p) => <PositionRow key={p.id} p={p} />)}
      </Card>
    </PageShell>
  );
}
