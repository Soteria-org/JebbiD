import React, { useState } from "react";
import { AlertTriangle, LogOut, RefreshCw } from "@/components/icons/index";
import { Btn, Card, GuidanceBanner } from "@/components/ui/primitives";
import { Logo } from "@/components/ui/Logo";
import { KYCUploadPanel } from "@/features/kyc/KYCUploadPanel";
import { C, FONT_BODY, FONT_DISPLAY } from "@/lib/theme";

/**
 * Shown instead of the normal investor dashboard whenever account_status is
 * 'suspended' — JBDocsApp routes here regardless of `view`. Deliberately its
 * own standalone screen (no sidebar/header, like ForcedPasswordChange) rather
 * than a banner bolted onto the dashboard: the whole point of freezing is that
 * the member should NOT see their current positions/value while paused, and a
 * banner-on-top-of-the-real-dashboard would still render all of that
 * underneath.
 *
 * The actual resolution path is whatever KYC documents are still missing —
 * reuses KYCUploadPanel (the same component the investor's own Profile page
 * and staff's InvestorDetailScreen already use) rather than a separate
 * generic upload, so "what's missing" and "what staff review" are the exact
 * same three documents, not two different concepts. Once all three are
 * uploaded (KYCUploadPanel flips status to 'pending'), every super_admin is
 * notified — see respondToAccountFreeze in useJBDocsStore / admin-actions.js.
 */
export function FrozenAccountScreen({ ctx }) {
  const inv = ctx.currentInvestor;
  const [notified, setNotified] = useState(false);

  function notifyAdmin() {
    setNotified(true);
    ctx.respondToAccountFreeze(ctx.session.id);
  }

  function onKycStatusChange(newStatus) {
    // Fires when all three documents are uploaded. Covers the normal case —
    // the fallback button below covers a member whose KYC was already
    // complete before they were paused for something else, where this never
    // fires because there's nothing new to upload.
    if (newStatus === "pending" && !notified) notifyAdmin();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.pageBg, fontFamily: FONT_BODY, padding: 20 }}>
      <Card style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Logo size={30} />
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: C.ink }}>Jebbidox</div>
        </div>

        <div style={{ width: 46, height: 46, borderRadius: 10, background: C.warningBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.warningText, marginBottom: 16 }}>
          <AlertTriangle size={22} />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, marginBottom: 6, color: C.ink }}>
          Your account is paused
        </div>
        <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20, lineHeight: 1.55 }}>
          Your identity verification is incomplete. While paused, your investment balances aren&rsquo;t shown here,
          and new deposits or withdrawals can&rsquo;t be submitted. Upload the missing documents below to resolve it.
        </div>

        {notified ? (
          <>
            <GuidanceBanner tone="success">
              A super admin has been notified and will review your account. You&rsquo;ll get a notification the
              moment it&rsquo;s restored.
            </GuidanceBanner>
            <Btn full variant="outline" icon={RefreshCw} onClick={() => window.location.reload()}>Check Again</Btn>
          </>
        ) : (
          <>
            <KYCUploadPanel investorProfileId={ctx.session.id} staffMode={false} onStatusChange={onKycStatusChange} />
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 14, marginBottom: 8 }}>
              Already uploaded everything, or paused for a different reason? Let an admin know you&rsquo;re ready
              for review.
            </div>
            <Btn full variant="ghost" onClick={notifyAdmin}>Notify Admin</Btn>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid " + C.line }}>
          <span style={{ fontSize: 12.5, color: C.inkFaint }}>{inv?.fullName}</span>
          <div onClick={ctx.logout} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: C.inkFaint, fontSize: 12.5 }}>
            <LogOut size={14} /> Sign Out
          </div>
        </div>
      </Card>
    </div>
  );
}
