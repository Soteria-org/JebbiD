import React, { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowUpRight, Bell, Clock, FileCheck, IdCard, Lock, Snowflake, ShieldCheck, UserCog, Users, Wallet,
} from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Badge, Btn, Card, Field, Modal, SectionTitle, TextArea, TextInput } from "@/components/ui/primitives";
import { PauseCountdownBadge } from "@/components/ui/PauseCountdown";
import { fmtDate, fmtDateTime, fmtUGX, todayISO } from "@/lib/format";
import { C } from "@/lib/theme";

function MessageModal({ ctx, target, onClose }) {
  const [title, setTitle] = useState(target.defaultTitle || "");
  const [message, setMessage] = useState(target.defaultMessage || "");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const result = await ctx.sendInvestorMessage(target.investorId, title.trim(), message.trim());
    setSending(false);
    if (result.ok) onClose();
  }

  return (
    <Modal title={"Message " + target.fullName} onClose={onClose} width={480}>
      <Field label="Title"><TextInput value={title} onChange={setTitle} /></Field>
      <Field label="Message"><TextArea value={message} onChange={setMessage} rows={5} /></Field>
      <Btn full disabled={!title.trim() || !message.trim() || sending} onClick={send}>
        {sending ? "Sending…" : "Send Message"}
      </Btn>
    </Modal>
  );
}

/**
 * The "warn" half of warn-then-enforce. Unlike MessageModal, this actually
 * sets profiles.pause_deadline via schedule_account_warning() — the
 * countdown the investor sees afterward is real, not decorative.
 */
function WarnModal({ ctx, target, onClose }) {
  const [title, setTitle] = useState(target.defaultTitle || "");
  const [message, setMessage] = useState(target.defaultMessage || "");
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const result = await ctx.scheduleAccountWarning(target.investorId, title.trim(), message.trim(), deadlineDays);
    setSending(false);
    if (result.ok) onClose();
  }

  return (
    <Modal title={"Warn " + target.fullName} onClose={onClose} width={480}>
      <Field label="Title"><TextInput value={title} onChange={setTitle} /></Field>
      <Field label="Message"><TextArea value={message} onChange={setMessage} rows={5} /></Field>
      <Field label="Pause deadline (days from now)">
        <TextInput type="number" min={1} max={90} value={String(deadlineDays)} onChange={(v) => setDeadlineDays(Math.max(1, Math.min(90, Number(v) || 1)))} />
      </Field>
      <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 14 }}>
        This sends the message and starts a real, visible countdown on the investor&rsquo;s account. If the deadline
        passes without resolution, this account will appear under &ldquo;Pending Freezes&rdquo; below for you to actually pause.
      </div>
      <Btn full disabled={!title.trim() || !message.trim() || sending} onClick={send}>
        {sending ? "Sending…" : "Send Warning & Start Countdown"}
      </Btn>
    </Modal>
  );
}

const LARGE_DEPOSIT_THRESHOLD = 2000000; // UGX — adjust here if the club's sense of "large" changes
const OVERDUE_DAYS = 3;
const DORMANT_DAYS = 90;
const FO_INACTIVE_DAYS = 14;
const FAILED_LOGIN_WINDOW_HOURS = 24;
const FAILED_LOGIN_THRESHOLD = 3;

function daysAgo(from, to) {
  return Math.round((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24));
}

const SEVERITY = {
  high: { tone: "danger", label: "High" },
  medium: { tone: "warning", label: "Medium" },
  low: { tone: "info", label: "Low" },
};

function FindingGroup({ icon: Icon, title, findings, emptyText }) {
  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand }}>
          <Icon size={15} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{title}</div>
        <Badge tone="neutral">{findings.length}</Badge>
      </div>
      {findings.length === 0 ? (
        <div style={{ fontSize: 13, color: C.inkFaint, paddingLeft: 4 }}>{emptyText}</div>
      ) : findings.slice(0, 6).map((f) => (
        <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px dashed " + C.line }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Badge tone={SEVERITY[f.severity].tone}>{SEVERITY[f.severity].label}</Badge>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{f.title}</span>
            </div>
            <div style={{ fontSize: 12, color: C.inkFaint }}>{f.detail}</div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {f.onClick ? <Btn size="sm" variant="ghost" onClick={f.onClick}>{f.actionLabel || "Review"}</Btn> : null}
            {f.onMessage ? <Btn size="sm" variant="outline" icon={Bell} onClick={f.onMessage}>Message</Btn> : null}
            {f.onWarn ? <Btn size="sm" variant="outline" icon={AlertTriangle} onClick={f.onWarn}>Warn</Btn> : null}
          </div>
        </div>
      ))}
      {findings.length > 6 ? <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 8 }}>+{findings.length - 6} more</div> : null}
    </Card>
  );
}

/**
 * Every finding here is derived from real data already loaded elsewhere in
 * the app (investors, investments, deposits, withdrawals, audit log) — none
 * of it is invented. Two categories from the original brief aren't included:
 * "multiple failed login attempts" and "repeated failed email deliveries"
 * would need auth-attempt logging and a Resend webhook respectively, and
 * neither exists in this schema yet.
 */
export function RiskComplianceMonitor({ ctx }) {
  const today = todayISO();
  const investors = ctx.investors || [];
  const [messaging, setMessaging] = useState(null);
  const [warning, setWarning] = useState(null);

  function goToInvestor(id) {
    ctx.setSelectedInvestorId(id);
    ctx.goTo("investorDetail");
  }

  function openMessage(investorId, fullName, defaultTitle, defaultMessage) {
    setMessaging({ investorId, fullName, defaultTitle, defaultMessage });
  }

  function openWarn(investorId, fullName, defaultTitle, defaultMessage) {
    setWarning({ investorId, fullName, defaultTitle, defaultMessage });
  }

  const incompleteKyc = useMemo(() => investors
    .filter((i) => i.kycStatus !== "approved")
    .map((i) => ({
      id: "kyc-" + i.id,
      severity: i.kycStatus === "rejected" ? "high" : daysAgo(i.dateRegistered, today) > 30 ? "high" : "medium",
      title: i.fullName,
      detail: "KYC status: " + (i.kycStatus || "not started").replace(/_/g, " "),
      actionLabel: "View",
      onClick: () => goToInvestor(i.id),
      onWarn: () => openWarn(i.id, i.fullName, "Complete Your Identity Verification",
        "Hi " + i.fullName.split(" ")[0] + ", your KYC verification is still incomplete. Please finish it from your Profile settings within 7 days — accounts with incomplete verification may be paused until this is resolved."),
    })), [investors, today]);

  const largeDeposits = useMemo(() => (ctx.depositSubmissions || [])
    .filter((d) => (d.status === "pending" || d.status === "clarification_requested") && d.amount >= LARGE_DEPOSIT_THRESHOLD)
    .sort((a, b) => b.amount - a.amount)
    .map((d) => ({
      id: "large-dep-" + d.id,
      severity: "high",
      title: (d.investor?.full_name || "Unknown investor") + " — " + fmtUGX(d.amount),
      detail: "Awaiting review, submitted " + fmtDate(d.created_at),
      actionLabel: "Review",
      onClick: () => ctx.goTo("deposits"),
    })), [ctx.depositSubmissions]);

  const dormant = useMemo(() => {
    const activeIds = new Set((ctx.investments || []).filter((p) => p.status === "active").map((p) => p.investorId));
    return investors
      .filter((i) => !activeIds.has(i.id) && i.dateRegistered && daysAgo(i.dateRegistered, today) >= DORMANT_DAYS)
      .map((i) => ({
        id: "dormant-" + i.id,
        severity: "low",
        title: i.fullName,
        detail: "Member " + daysAgo(i.dateRegistered, today) + " days, no active position",
        actionLabel: "View",
        onClick: () => goToInvestor(i.id),
        onWarn: () => openWarn(i.id, i.fullName, "Your Account Has Been Inactive",
          "Hi " + i.fullName.split(" ")[0] + ", you joined Jebbidox a while ago but haven't started an investment yet. Please make a deposit within 7 days — dormant accounts may be paused until there's activity on them."),
      }));
  }, [investors, ctx.investments, today]);

  const overdueApprovals = useMemo(() => {
    const deposits = (ctx.depositSubmissions || [])
      .filter((d) => (d.status === "pending" || d.status === "clarification_requested") && daysAgo(d.created_at, today) >= OVERDUE_DAYS)
      .map((d) => ({
        id: "od-dep-" + d.id,
        severity: daysAgo(d.created_at, today) >= OVERDUE_DAYS * 2 ? "high" : "medium",
        title: (d.investor?.full_name || "Unknown investor") + " deposit — " + fmtUGX(d.amount),
        detail: "Waiting " + daysAgo(d.created_at, today) + " days for review",
        actionLabel: "Review",
        onClick: () => ctx.goTo("deposits"),
      }));
    const withdrawals = (ctx.withdrawals || [])
      .filter((w) => w.status === "pending" && daysAgo(w.requestedAt, today) >= OVERDUE_DAYS)
      .map((w) => ({
        id: "od-wd-" + w.id,
        severity: daysAgo(w.requestedAt, today) >= OVERDUE_DAYS * 2 ? "high" : "medium",
        title: fmtUGX(w.amount) + " withdrawal",
        detail: "Waiting " + daysAgo(w.requestedAt, today) + " days for approval",
        actionLabel: "Review",
        onClick: () => ctx.goTo("withdrawals"),
      }));
    return [...deposits, ...withdrawals].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
  }, [ctx.depositSubmissions, ctx.withdrawals, today]);

  const missingInfo = useMemo(() => investors
    .filter((i) => !i.phone || !i.nationalId || !i.nextOfKin?.name)
    .map((i) => {
      const missing = [!i.phone && "phone", !i.nationalId && "National ID", !i.nextOfKin?.name && "next of kin"].filter(Boolean);
      return {
        id: "missing-" + i.id,
        severity: missing.length > 1 ? "medium" : "low",
        title: i.fullName,
        detail: "Missing " + missing.join(", "),
        actionLabel: "View",
        onClick: () => goToInvestor(i.id),
        onWarn: () => openWarn(i.id, i.fullName, "Please Complete Your Profile",
          "Hi " + i.fullName.split(" ")[0] + ", your profile is missing: " + missing.join(", ") + ". Please update it from your Profile settings within 7 days — incomplete accounts may be paused until this is resolved."),
      };
    }), [investors]);

  const foInactivity = useMemo(() => {
    const activityByName = {};
    (ctx.auditLog || []).forEach((a) => {
      if (!activityByName[a.user] || new Date(a.timestamp) > new Date(activityByName[a.user])) activityByName[a.user] = a.timestamp;
    });
    return (ctx.financeOfficers || [])
      .filter((fo) => {
        const last = activityByName[fo.name];
        return !last || daysAgo(last, today) >= FO_INACTIVE_DAYS;
      })
      .map((fo) => ({
        id: "fo-" + fo.id,
        severity: "low",
        title: fo.name,
        detail: activityByName[fo.name] ? "No logged activity in " + daysAgo(activityByName[fo.name], today) + " days" : "No logged activity yet",
        actionLabel: "Officers",
        onClick: () => ctx.goTo("settings"),
      }));
  }, [ctx.financeOfficers, ctx.auditLog, today]);

  const earlyWithdrawals = useMemo(() => (ctx.withdrawals || [])
    .filter((w) => w.penalty > 0 && (w.status === "pending" || w.status === "paid"))
    .map((w) => ({
      id: "early-wd-" + w.id,
      severity: "low",
      title: fmtUGX(w.amount) + " early withdrawal",
      detail: "Penalty applied: " + fmtUGX(w.penalty),
      actionLabel: "Review",
      onClick: () => ctx.goTo("withdrawals"),
    })), [ctx.withdrawals]);

  const repeatedFailedLogins = useMemo(() => {
    const recent = (ctx.loginAttempts || []).filter((a) => {
      const hoursSince = (Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60 * 60);
      return hoursSince <= FAILED_LOGIN_WINDOW_HOURS;
    });
    const byIdentifier = {};
    recent.forEach((a) => {
      byIdentifier[a.identifier] = byIdentifier[a.identifier] || [];
      byIdentifier[a.identifier].push(a);
    });
    return Object.entries(byIdentifier)
      .filter(([, attempts]) => attempts.length >= FAILED_LOGIN_THRESHOLD)
      .map(([identifier, attempts]) => ({
        id: "login-" + identifier,
        severity: attempts.length >= FAILED_LOGIN_THRESHOLD * 2 ? "high" : "medium",
        title: identifier,
        detail: attempts.length + " failed attempts in the last " + FAILED_LOGIN_WINDOW_HOURS + "h — most recent " + fmtDateTime(attempts[0].timestamp),
      }))
      .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1));
  }, [ctx.loginAttempts]);

  const totalHigh = [incompleteKyc, largeDeposits, overdueApprovals, repeatedFailedLogins].reduce((s, g) => s + g.filter((f) => f.severity === "high").length, 0);

  // Real, live state — not derived from findings above. These reflect what
  // schedule_account_warning()/set_account_freeze() have actually done to
  // profiles.pause_deadline/account_status, so the countdown here is the
  // same one the investor sees on their own dashboard.
  const pendingFreezes = useMemo(() => investors
    .filter((i) => i.accountStatus !== "suspended" && i.pauseDeadline)
    .sort((a, b) => new Date(a.pauseDeadline) - new Date(b.pauseDeadline)), [investors]);

  const frozenAccounts = useMemo(() => investors
    .filter((i) => i.accountStatus === "suspended"), [investors]);

  return (
    <PageShell ctx={ctx} title="Risk & Compliance Monitor">
      <SectionTitle sub="Flags unusual activity across the club automatically — nothing here is manually curated.">
        Risk &amp; Compliance Monitor
      </SectionTitle>

      {totalHigh === 0 ? (
        <Card style={{ marginBottom: 18, background: C.successBg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={18} color={C.success} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: C.success }}>No high-severity items right now.</div>
          </div>
        </Card>
      ) : (
        <Card style={{ marginBottom: 18, background: C.dangerBg }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} color={C.danger} />
            <div style={{ fontSize: 13.5, fontWeight: 600, color: C.danger }}>{totalHigh} high-severity item{totalHigh === 1 ? "" : "s"} need attention.</div>
          </div>
        </Card>
      )}

      {pendingFreezes.length > 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.warningBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.warning }}>
              <Snowflake size={15} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>Pending Freezes</div>
            <Badge tone="warning">{pendingFreezes.length}</Badge>
          </div>
          <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 12 }}>
            These investors were warned and are on a real countdown. Freeze early if you&rsquo;re confident nothing will change, or clear the warning if the issue&rsquo;s already resolved.
          </div>
          {pendingFreezes.map((i) => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px dashed " + C.line }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{i.fullName}</div>
                  <div style={{ fontSize: 12, color: C.inkFaint }}>Warned {fmtDateTime(i.pauseWarningAt)}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <PauseCountdownBadge warningAt={i.pauseWarningAt} deadline={i.pauseDeadline} />
                <Btn size="sm" variant="ghost" onClick={() => ctx.clearAccountWarning(i.id)}>Clear</Btn>
                <Btn size="sm" variant="danger" icon={Snowflake} onClick={() => ctx.setAccountFreeze(i.id, true)}>Freeze</Btn>
              </div>
            </div>
          ))}
        </Card>
      ) : null}

      {frozenAccounts.length > 0 ? (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.dangerBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.danger }}>
              <Snowflake size={15} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>Frozen Accounts</div>
            <Badge tone="danger">{frozenAccounts.length}</Badge>
          </div>
          {frozenAccounts.map((i) => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px dashed " + C.line }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{i.fullName}</div>
                <div style={{ fontSize: 12, color: C.inkFaint }}>{i.memberId || "Member"}</div>
              </div>
              <Btn size="sm" variant="outline" onClick={() => ctx.setAccountFreeze(i.id, false)}>Unfreeze</Btn>
            </div>
          ))}
        </Card>
      ) : null}

      <FindingGroup icon={Lock} title="Repeated Failed Logins" findings={repeatedFailedLogins} emptyText={"No identifier has " + FAILED_LOGIN_THRESHOLD + "+ failed attempts in the last " + FAILED_LOGIN_WINDOW_HOURS + "h."} />
      <FindingGroup icon={IdCard} title="Incomplete KYC" findings={incompleteKyc} emptyText="Every investor's KYC is verified." />
      <FindingGroup icon={Wallet} title="Large Deposits Awaiting Approval" findings={largeDeposits} emptyText={"No pending deposits above " + fmtUGX(LARGE_DEPOSIT_THRESHOLD) + "."} />
      <FindingGroup icon={Clock} title="Overdue Approvals" findings={overdueApprovals} emptyText={"Nothing has waited more than " + OVERDUE_DAYS + " days."} />
      <FindingGroup icon={Users} title="Dormant Investor Accounts" findings={dormant} emptyText={"No members inactive for " + DORMANT_DAYS + "+ days."} />
      <FindingGroup icon={FileCheck} title="Accounts With Missing Information" findings={missingInfo} emptyText="Every profile has phone, National ID, and next of kin on file." />
      <FindingGroup icon={UserCog} title="Finance Officer Inactivity" findings={foInactivity} emptyText={"Every officer has logged activity in the last " + FO_INACTIVE_DAYS + " days."} />
      <FindingGroup icon={ArrowUpRight} title="Early Withdrawal Patterns" findings={earlyWithdrawals} emptyText="No early (penalized) withdrawals outstanding." />

      <div style={{ fontSize: 11.5, color: C.inkFaint, marginTop: 8 }}>
        Email delivery rate is tracked on Club Intelligence Centre once the Resend webhook is receiving events.
        Failed login attempts are tracked above.
      </div>

      {messaging ? <MessageModal ctx={ctx} target={messaging} onClose={() => setMessaging(null)} /> : null}
      {warning ? <WarnModal ctx={ctx} target={warning} onClose={() => setWarning(null)} /> : null}
    </PageShell>
  );
}
