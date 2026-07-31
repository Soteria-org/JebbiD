import React, { useMemo } from "react";
import {
  AlertTriangle, Clock, FileCheck, Mail, Server, ShieldCheck, TrendingUp, Users,
} from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Badge, Card, SectionTitle } from "@/components/ui/primitives";
import { useStaffMetrics } from "@/features/staff/useStaffMetrics";
import { fmtDateTime, fmtUGX, todayISO } from "@/lib/format";
import { C, FONT_MONO } from "@/lib/theme";

function Row({ label, value, tone }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px dashed " + C.line }}>
      <span style={{ fontSize: 13, color: C.inkSoft }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: tone === "danger" ? C.danger : tone === "warning" ? C.warning : C.ink }}>{value}</span>
    </div>
  );
}

function SectionCard({ icon: Icon, title, sub, children }) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand }}>
          <Icon size={15} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{title}</div>
      </div>
      {sub ? <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 14, marginLeft: 40 }}>{sub}</div> : <div style={{ marginBottom: 10 }} />}
      {children}
    </Card>
  );
}

/**
 * Super Admin-only. Everything on this screen is computed from real ctx data
 * already loaded for the dashboard/queues — nothing here polls an external
 * service live, so "System & Compliance" is presented as configuration
 * reference rather than a live status light, which would be dishonest
 * without an actual uptime/API integration behind it.
 */
export function SystemHealthCenter({ ctx }) {
  const m = useStaffMetrics(ctx);
  const today = todayISO();

  const pendingKyc = useMemo(
    () => (ctx.investors || []).filter((i) => i.kycStatus === "pending").length,
    [ctx.investors]
  );

  const newThisMonth = useMemo(() => {
    const now = new Date(today);
    return (ctx.investors || []).filter((i) => {
      if (!i.dateRegistered) return false;
      const d = new Date(i.dateRegistered);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [ctx.investors, today]);

  const recentAudit = useMemo(
    () => [...(ctx.auditLog || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6),
    [ctx.auditLog]
  );

  return (
    <PageShell ctx={ctx} title="System Health Center">
      <SectionTitle sub="A single screen for platform health, financial position, users, and compliance — Super Admin only.">
        System Health Center
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginBottom: 18 }}>
        <SectionCard icon={AlertTriangle} title="Attention Needed" sub="Items awaiting staff action right now">
          <Row label="Pending Deposits" value={m.pendingDeposits.length} tone={m.pendingDeposits.length > 0 ? "warning" : undefined} />
          <Row label="Pending Withdrawals" value={m.pendingWithdrawals.length} tone={m.pendingWithdrawals.length > 0 ? "warning" : undefined} />
          <Row label="Pending KYC Verifications" value={pendingKyc} tone={pendingKyc > 0 ? "warning" : undefined} />
          <Row label="Overdue Maturities (no choice made)" value={m.overdueMaturities.length} tone={m.overdueMaturities.length > 0 ? "danger" : undefined} />
        </SectionCard>

        <SectionCard icon={TrendingUp} title="Financial Snapshot" sub="Live totals across all active positions">
          <Row label="Assets Under Management" value={fmtUGX(m.aum)} />
          <Row label="Current Portfolio Value" value={fmtUGX(m.currentAUM)} />
          <Row label="Maturing (next 90 days)" value={m.upcomingMaturities.length} />
          <Row label="Standard / Corporate split" value={m.standardCount + " / " + m.corporateCount} />
        </SectionCard>

        <SectionCard icon={Users} title="Users" sub="Membership growth and staffing">
          <Row label="Total Investors" value={(ctx.investors || []).length} />
          <Row label="New This Month" value={newThisMonth} />
          <Row label="Finance Officers" value={(ctx.financeOfficers || []).length} />
          <Row label="Verified KYC" value={(ctx.investors || []).filter((i) => i.kycStatus === "approved").length} />
        </SectionCard>

        <SectionCard icon={Server} title="System & Compliance" sub="Configuration reference — verify directly in Vercel/Supabase/Resend dashboards for live status">
          <Row label="Database" value={<Badge tone="success">RLS on every table</Badge>} />
          <Row label="Audit Trail" value={<Badge tone="success">Immutable, trigger-only</Badge>} />
          <Row label="Auth Email Delivery" value={<Badge tone="info">Resend via Supabase SMTP</Badge>} />
          <Row label="Custom Domain" value="jebbidox.site" />
        </SectionCard>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 14 }}>Recent Ledger &amp; Audit Activity</div>
          {recentAudit.length === 0 ? (
            <div style={{ fontSize: 13, color: C.inkFaint }}>No audit activity recorded yet.</div>
          ) : recentAudit.map((a) => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px dashed " + C.line, fontSize: 12.5 }}>
              <span><strong>{a.user}</strong> — {a.action}</span>
              <span style={{ fontFamily: FONT_MONO, color: C.inkFaint }}>{fmtDateTime(a.timestamp)}</span>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <ShieldCheck size={16} color={C.success} />
            <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>Security Posture</div>
          </div>
          {[
            [FileCheck, "No table permits hard deletes — default-deny."],
            [ShieldCheck, "Role/status escalation is blocked at the database trigger level."],
            [Mail, "Every KYC document lives in a private, own-folder-only storage bucket."],
            [Clock, "Deposits and withdrawals require human review before they settle."],
          ].map(([Icon, label]) => (
            <div key={label} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 0", fontSize: 12.5, color: C.inkSoft }}>
              <Icon size={14} style={{ flexShrink: 0, marginTop: 2, color: C.brand }} />
              <span>{label}</span>
            </div>
          ))}
        </Card>
      </div>
    </PageShell>
  );
}
