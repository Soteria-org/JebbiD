import React, { useState } from "react";
import { ChevronLeft, IdCard, Snowflake } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Avatar, Badge, Btn, Card, GuidanceBanner, TableWrap, Td, Th, statusBadge } from "@/components/ui/primitives";
import { PauseCountdownBadge } from "@/components/ui/PauseCountdown";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { fmtDate, fmtUGX } from "@/lib/format";
import { C, FONT_DISPLAY } from "@/lib/theme";
import { isVerifiedInvestor } from "@/lib/verification";
import { KYCUploadPanel } from "@/features/kyc/KYCUploadPanel";
import { createMigratedInvestorAccount, resendMigrationInvitation } from "@/lib/actions/migration-actions";

/**
 * Spec §6.3: "Migrated investor exists (auth account = none yet [functionally
 * — see supabase/migrations/20260814082254_historical_migration_schema.sql's
 * Conflict B note]) → Super Admin/FO selects investor → 'Create Account'".
 * A placeholder @import.jebbidox.internal email means no real temp password
 * has ever been issued for this investor yet (see migration-actions.js).
 */
function MigratedAccountPanel({ inv, ctx }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  if (inv.migrationStatus !== "migrated") return null;

  const needsEmail = !inv.email || inv.email.endsWith("@import.jebbidox.internal");

  async function handleIssue() {
    setBusy(true);
    setResult(null);
    const res = needsEmail
      ? await createMigratedInvestorAccount(inv.id, email.trim())
      : await resendMigrationInvitation(inv.id);
    setBusy(false);
    if (res.error) { setResult({ error: res.error, tempPassword: res.tempPassword }); return; }
    setResult({ success: true, tempPassword: res.tempPassword, email: res.email });
    ctx.showToast?.("Invitation sent to " + res.email, "success");
  }

  return (
    <Card style={{ marginBottom: 18, border: "1.5px solid " + C.goldLine }} data-testid="migrated-account-panel">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Badge tone="info">Migrated Investor</Badge>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>Historical financial records — {needsEmail ? "no account yet" : "account created"}</div>
      </div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 12 }}>
        {needsEmail
          ? "This investor's historical positions are already visible below. No login exists yet — provide their real email to create the account and send an invitation with a temporary password (expires in 48 hours)."
          : "An invitation was already sent to " + inv.email + ". Resending issues a new temporary password and invalidates the old one."}
      </div>
      {needsEmail && (
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="investor@example.com" data-testid="migrated-account-email"
          style={{ width: "100%", maxWidth: 320, padding: "9px 12px", borderRadius: 8, border: "1px solid " + C.line, fontSize: 13.5, marginBottom: 10 }}
        />
      )}
      <div>
        <Btn size="sm" disabled={busy || (needsEmail && !email.includes("@"))} onClick={handleIssue} testId="migrated-account-submit">
          {busy ? "Sending…" : needsEmail ? "Create Account & Invite" : "Resend Invitation"}
        </Btn>
      </div>
      {result?.error && <div style={{ color: C.danger, fontSize: 12.5, marginTop: 10 }} data-testid="migrated-account-error">{result.error}</div>}
      {result?.success && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: C.success }} data-testid="migrated-account-success">
          Invitation sent to {result.email}.
        </div>
      )}
      {result?.tempPassword && (
        <div style={{ marginTop: 6, fontSize: 12.5, color: C.inkSoft }}>
          Temp password (shown once — the email is the normal source of truth for the investor): <span data-testid="migrated-account-temp-password" style={{ fontFamily: "monospace", fontWeight: 700 }}>{result.tempPassword}</span>
        </div>
      )}
    </Card>
  );
}

export function InvestorDetailScreen({ ctx }) {
  const [tab, setTab] = useState("overview");
  const inv = ctx.getInvestor(ctx.selectedInvestorId);
  const positions = ctx.getInvestorInvestments(inv.id);
  const deposits = positions;
  if (!inv) return null;
  return (
    <PageShell ctx={ctx} title="Investor Detail">
      <div onClick={() => ctx.goTo("investors")} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: C.inkFaint, fontSize: 13, marginBottom: 14 }}>
        <ChevronLeft size={15} /> Back to Investors
      </div>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Avatar name={inv.fullName} size={52} />
            {isVerifiedInvestor(inv) ? <VerifiedBadge size={20} style={{ position: "absolute", right: -3, bottom: -3 }} /> : null}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, color: C.ink }}>{inv.fullName}</div>
              {inv.accountStatus === "suspended" ? <Badge tone="danger">Paused</Badge> : null}
            </div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{inv.memberId} · {inv.email} · {inv.phone}</div>
          </div>
          {inv.accountStatus !== "suspended" && inv.pauseDeadline ? (
            <PauseCountdownBadge warningAt={inv.pauseWarningAt} deadline={inv.pauseDeadline} />
          ) : null}
          {ctx.session.role === "super_admin" ? (
            inv.accountStatus === "suspended" ? (
              <Btn size="sm" variant="outline" onClick={() => ctx.setAccountFreeze(inv.id, false)}>Unfreeze Account</Btn>
            ) : (
              <Btn size="sm" variant="danger" icon={Snowflake} onClick={() => ctx.setAccountFreeze(inv.id, true)}>Freeze Account</Btn>
            )
          ) : null}
        </div>
      </Card>
      <MigratedAccountPanel inv={inv} ctx={ctx} />
      {inv.accountStatus === "suspended" ? (
        <GuidanceBanner tone="warning">
          This account is paused. Review their KYC documents in the KYC Documents tab before unfreezing —
          they&rsquo;re asked to complete those from their side while paused.
          <span onClick={() => setTab("kyc")} style={{ marginLeft: 8, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Go to KYC Documents</span>
        </GuidanceBanner>
      ) : null}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["overview", "Overview"], ["investments", "Investments"], ["nextofkin", "Next of Kin"], ["deposits", "Deposit History"], ["kyc", "KYC Documents"]].map((t) => (
          <div key={t[0]} onClick={() => setTab(t[0])} style={{ padding: "9px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer", background: tab === t[0] ? C.brand : C.cardBg, color: tab === t[0] ? C.white : C.inkSoft }}>{t[1]}</div>
        ))}
      </div>

      {tab === "overview" && (
        <Card style={{ maxWidth: 560 }}>
          {[["Member ID", inv.memberId], ["National ID", inv.nationalId], ["Address", inv.address], ["Occupation", inv.occupation],
            ["Financial Goal", inv.goal], ["Registered", fmtDate(inv.dateRegistered)],
            ["Financial History", inv.migrationStatus === "migrated" ? "Imported" : "Native"]].map((r) => (
            <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
              <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
            </div>
          ))}
        </Card>
      )}
      {tab === "investments" && (
        <TableWrap>
          <thead><tr><Th>Position</Th><Th>Package</Th><Th>Amount</Th><Th>Maturity</Th><Th>Status</Th></tr></thead>
          <tbody>{positions.map((p) => <tr key={p.id}><Td>{p.referenceNumber || "Pending"}</Td><Td style={{ textTransform: "capitalize" }}>{p.package}</Td><Td>{fmtUGX(p.amount)}</Td><Td>{p.maturityDate ? fmtDate(p.maturityDate) : "—"}</Td><Td>{statusBadge(p.status)}</Td></tr>)}</tbody>
        </TableWrap>
      )}
      {tab === "nextofkin" && (
        <Card style={{ maxWidth: 480 }}>
          <GuidanceBanner tone="info" icon={IdCard}>Next of Kin information is visible to Finance Officers and Super Administrators only.</GuidanceBanner>
          {[["Full Name", inv.nextOfKin.name], ["Relationship", inv.nextOfKin.relationship], ["Phone", inv.nextOfKin.phone], ["Address", inv.nextOfKin.address]].map((r) => (
            <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
              <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
            </div>
          ))}
        </Card>
      )}
      {tab === "deposits" && (
        <TableWrap>
          <thead><tr><Th>Position</Th><Th>Amount</Th><Th>Submitted</Th><Th>Status</Th></tr></thead>
          <tbody>{deposits.map((p) => <tr key={p.id}><Td>{p.referenceNumber || "Pending"}</Td><Td>{fmtUGX(p.amount)}</Td><Td>{fmtDate(p.createdAt)}</Td><Td>{statusBadge(p.depositStatus)}</Td></tr>)}</tbody>
        </TableWrap>
      )}
      {tab === "kyc" && (
        <Card style={{ maxWidth: 560 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>KYC Documents — {inv.fullName}</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
            Upload documents on behalf of this investor, or review and verify documents they have submitted.
          </div>
          <KYCUploadPanel investorProfileId={inv.id} staffMode={true} />
        </Card>
      )}
    </PageShell>
  );
}
