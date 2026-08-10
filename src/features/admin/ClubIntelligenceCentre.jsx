import React, { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowDownRight, ArrowUpRight, Award, Bell, Clock, ShieldCheck, TrendingUp, UserPlus, Users, Wallet,
} from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, Field, Modal, SectionTitle, Select, StatCard, TextArea, TextInput } from "@/components/ui/primitives";
import { useStaffMetrics } from "@/features/staff/useStaffMetrics";
import { fmtDateTime, fmtUGX, todayISO } from "@/lib/format";
import { C, FONT_MONO } from "@/lib/theme";

function BroadcastModal({ ctx, onClose }) {
  const [targetRole, setTargetRole] = useState("investor");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const result = await ctx.broadcastMessage(targetRole, title.trim(), message.trim());
    setSending(false);
    if (result.ok) onClose();
  }

  return (
    <Modal title="Broadcast a Message" onClose={onClose} width={480}>
      <Field label="Send to">
        <Select value={targetRole} onChange={setTargetRole} options={[
          { value: "investor", label: "All Investors" },
          { value: "finance_officer", label: "All Finance Officers" },
        ]} />
      </Field>
      <Field label="Title"><TextInput value={title} onChange={setTitle} placeholder="e.g. Scheduled Maintenance" /></Field>
      <Field label="Message"><TextArea value={message} onChange={setMessage} rows={4} placeholder="Keep it short — this appears in their Notifications." /></Field>
      <Btn full disabled={!title.trim() || !message.trim() || sending} onClick={send}>
        {sending ? "Sending…" : "Send Broadcast"}
      </Btn>
    </Modal>
  );
}

function Row({ label, value, tone }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px dashed " + C.line }}>
      <span style={{ fontSize: 13, color: C.inkSoft }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: tone === "danger" ? C.danger : tone === "success" ? C.success : C.ink }}>{value}</span>
    </div>
  );
}

function daysAgo(from, to) {
  return Math.round((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
}

/**
 * The Super Admin's home screen. Every widget here is computed from data the
 * app already loads for the existing dashboards/queues — nothing is polled
 * live and nothing is invented. Failed login attempts aren't shown here —
 * see Risk & Compliance Monitor instead.
 */
export function ClubIntelligenceCentre({ ctx }) {
  const m = useStaffMetrics(ctx);
  const today = todayISO();
  const investors = ctx.investors || [];
  const [broadcasting, setBroadcasting] = useState(false);

  const pendingKyc = useMemo(() => investors.filter((i) => i.kycStatus === "pending").length, [investors]);

  const maturing30 = useMemo(
    () => m.active.filter((p) => p.maturityDate && daysAgo(today, p.maturityDate) <= 30 && daysAgo(today, p.maturityDate) >= 0),
    [m.active, today]
  );

  const newThisWeek = useMemo(
    () => investors.filter((i) => i.dateRegistered && daysAgo(i.dateRegistered, today) <= 7 && daysAgo(i.dateRegistered, today) >= 0).length,
    [investors, today]
  );

  const activeInvestorIds = useMemo(() => new Set(m.active.map((p) => p.investorId)), [m.active]);
  const activeInvestors = investors.filter((i) => activeInvestorIds.has(i.id)).length;
  const inactiveInvestors = investors.length - activeInvestors;

  const monthFlow = useMemo(() => {
    const now = new Date(today);
    const inflow = m.active
      .filter((p) => p.startDate && new Date(p.startDate).getFullYear() === now.getFullYear() && new Date(p.startDate).getMonth() === now.getMonth())
      .reduce((s, p) => s + p.amount, 0);
    const outflow = (ctx.withdrawals || [])
      .filter((w) => w.status === "paid" && w.paidAt && new Date(w.paidAt).getFullYear() === now.getFullYear() && new Date(w.paidAt).getMonth() === now.getMonth())
      .reduce((s, w) => s + (w.netAmount ?? w.amount), 0);
    return { inflow, outflow };
  }, [m.active, ctx.withdrawals, today]);

  const failedTransactions = useMemo(() => {
    const rejectedDeposits = (ctx.depositSubmissions || []).filter((d) => d.status === "rejected").length;
    const rejectedWithdrawals = (ctx.withdrawals || []).filter((w) => w.status === "rejected").length;
    return rejectedDeposits + rejectedWithdrawals;
  }, [ctx.depositSubmissions, ctx.withdrawals]);

  const growthTrend = useMemo(() => {
    const sorted = [...m.active].filter((p) => p.startDate).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    let running = 0;
    return sorted.map((p) => {
      running += p.amount;
      return { label: new Date(p.startDate).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), aum: running };
    });
  }, [m.active]);

  const retention90d = useMemo(() => {
    const eligible = investors.filter((i) => i.dateRegistered && daysAgo(i.dateRegistered, today) >= 90);
    if (eligible.length === 0) return null;
    const stillInvesting = eligible.filter((i) => activeInvestorIds.has(i.id)).length;
    return Math.round((stillInvesting / eligible.length) * 100);
  }, [investors, activeInvestorIds, today]);

  const goalDistribution = useMemo(() => {
    const counts = {};
    m.active.forEach((p) => { counts[p.goal || "Unspecified"] = (counts[p.goal || "Unspecified"] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [m.active]);

  const staffThisMonth = useMemo(() => {
    const now = new Date(today);
    const counts = {};
    (ctx.auditLog || []).forEach((a) => {
      const d = new Date(a.timestamp);
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return;
      if (!/approved|verified|created/i.test(a.action)) return;
      counts[a.user] = (counts[a.user] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [ctx.auditLog, today]);

  const recentAudit = useMemo(
    () => [...(ctx.auditLog || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6),
    [ctx.auditLog]
  );

  return (
    <PageShell ctx={ctx} title="Club Intelligence Centre">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <SectionTitle sub="Everything the club's health depends on, in one place.">Club Intelligence Centre</SectionTitle>
        <Btn icon={Bell} variant="outline" onClick={() => setBroadcasting(true)}>Broadcast a Message</Btn>
      </div>

      {broadcasting ? <BroadcastModal ctx={ctx} onClose={() => setBroadcasting(false)} /> : null}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label="Assets Under Management" value={fmtUGX(m.aum)} icon={Wallet} sub="Principal invested" />
        <StatCard label="Monthly Inflow" value={fmtUGX(monthFlow.inflow)} icon={ArrowDownRight} tone="success" sub="Activated this month" />
        <StatCard label="Monthly Outflow" value={fmtUGX(monthFlow.outflow)} icon={ArrowUpRight} sub="Paid out this month" />
        <StatCard label="New This Week" value={newThisWeek} icon={UserPlus} sub="Registrations" />
        <StatCard label="Maturing (30 Days)" value={maturing30.length} icon={Award} tone={maturing30.length > 0 ? "warning" : undefined} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginBottom: 18 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>AUM Growth Trend</div>
          <div style={{ fontSize: 12.5, color: C.inkFaint, marginBottom: 14 }}>Cumulative active assets by activation date</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthTrend}>
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
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 14 }}>Membership</div>
          <Row label="Active Investors" value={activeInvestors} tone="success" />
          <Row label="Inactive Investors" value={inactiveInvestors} />
          <Row label="Pending KYC" value={pendingKyc} tone={pendingKyc > 0 ? "warning" : undefined} />
          <Row label="Retention (90+ day members still investing)" value={retention90d === null ? "Not enough data yet" : retention90d + "%"} />
        </Card>
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <StatCard label="Deposits Awaiting Review" value={m.pendingDeposits.length} icon={Clock} tone={m.pendingDeposits.length > 0 ? "warning" : undefined} />
        <StatCard label="Withdrawals Awaiting Approval" value={m.pendingWithdrawals.length} icon={ArrowUpRight} tone={m.pendingWithdrawals.length > 0 ? "warning" : undefined} />
        <StatCard label="Failed Transactions" value={failedTransactions} icon={ShieldCheck} tone={failedTransactions > 0 ? "danger" : undefined} sub="Rejected deposits + withdrawals" />
        <StatCard label="Standard / Corporate Split" value={m.standardCount + " / " + m.corporateCount} icon={TrendingUp} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 12 }}>Investment Goal Distribution</div>
          {goalDistribution.length === 0 ? <div style={{ fontSize: 13, color: C.inkFaint }}>No active positions yet.</div> :
            goalDistribution.map(([goal, count]) => (
              <Row key={goal} label={goal} value={count} />
            ))}
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Staff Performance</div>
          <div style={{ fontSize: 11.5, color: C.inkFaint, marginBottom: 10 }}>Approvals logged this month</div>
          {staffThisMonth.length === 0 ? <div style={{ fontSize: 13, color: C.inkFaint }}>No approvals logged yet this month.</div> :
            staffThisMonth.map(([name, count]) => <Row key={name} label={name} value={count} />)}
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Users size={15} color={C.brand} />
            <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>Recent Ledger &amp; Audit Activity</div>
          </div>
          {recentAudit.length === 0 ? (
            <div style={{ fontSize: 13, color: C.inkFaint }}>No audit activity recorded yet.</div>
          ) : recentAudit.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px dashed " + C.line, fontSize: 12.5 }}>
              <span><strong>{a.user}</strong> — {a.action}</span>
              <span style={{ fontFamily: FONT_MONO, color: C.inkFaint }}>{fmtDateTime(a.timestamp)}</span>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 18 }}>
        Failed login attempts are tracked in Risk &amp; Compliance Monitor.
      </div>
    </PageShell>
  );
}
