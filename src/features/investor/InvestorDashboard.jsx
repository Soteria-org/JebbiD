import React from "react";
import { Award, Calendar, CheckCircle2, Plus, TrendingUp, Wallet } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState, GuidanceBanner, ProgressBar, StatCard } from "@/components/ui/primitives";
import { PauseCountdownBadge } from "@/components/ui/PauseCountdown";
import { VerifiedBadge, isVerifiedInvestor } from "@/components/ui/VerifiedBadge";
import { PositionRow } from "@/features/investor/PositionRow";
import { clampPct, currentValue, daysBetween, fmtDate, fmtUGX, todayISO } from "@/lib/format";
import { C, FONT_DISPLAY, FONT_MONO } from "@/lib/theme";
import { SUPPORT_EMAIL } from "@/lib/constants";

/**
 * Spec §7: "Your historical investment records have been migrated to
 * Jebbidox" — a clear, always-visible line, not something the investor has
 * to go find. Shown once, permanently, for any migrated investor (there's no
 * reason to ever dismiss a true historical fact about the account).
 */
function MigrationBanner({ inv }) {
  if (inv.migrationStatus !== "migrated") return null;
  return (
    <GuidanceBanner tone="info" icon={Award}>
      <strong>Your historical investment records have been migrated to Jebbidox.</strong> Everything below reflects your original contribution dates and amounts, exactly as recorded before this account existed.
    </GuidanceBanner>
  );
}

/**
 * Spec §7: "Profile/KYC completion prompt if kyc_status isn't approved —
 * reuse the existing FrozenAccountScreen-style pattern... rather than a
 * dismissible banner easy to ignore." Deliberately NOT a full-screen block
 * like FrozenAccountScreen itself (that's reserved for account_status =
 * 'suspended', a different, harsher gate this spec never asked to extend) —
 * this borrows FrozenAccountScreen's visual weight (large, un-missable, its
 * own call to action) while still letting a migrated investor see their real
 * historical positions underneath, which is the whole point of migrating the
 * money before the person.
 */
function KycCompletionPrompt({ inv, ctx }) {
  if (inv.migrationStatus !== "migrated" || inv.kycStatus === "approved") return null;
  return (
    <Card style={{ marginBottom: 20, border: "1.5px solid " + C.goldLine, background: C.warningBg }} data-testid="kyc-completion-prompt">
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: C.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <CheckCircle2 size={20} color={C.brand} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.warningText }}>Complete your profile to become a Verified Investor</div>
          <div style={{ fontSize: 12.5, color: C.warningText, marginTop: 2 }}>
            Your historical investments are already visible below, but identity verification (KYC) hasn&rsquo;t been completed on this account yet — {inv.kycStatus === "pending" ? "your documents are awaiting staff review." : inv.kycStatus === "rejected" ? "one or more documents were rejected and need re-upload." : "upload your ID and a selfie to get started."}
          </div>
        </div>
        <Btn size="sm" onClick={() => ctx.goTo("profile")}>{inv.kycStatus === "pending" ? "View Status" : "Complete Now"}</Btn>
      </div>
    </Card>
  );
}

/** Real, enforced deadline banner — shown whenever staff have actually scheduled
 * a pause on this account (profiles.pause_deadline), not a generic reminder. */
function PauseWarningBanner({ inv, ctx }) {
  if (!inv.pauseDeadline) return null;
  const notif = (ctx.notifications || []).find((n) => n.type === "account_status_alert" && !n.read);
  return (
    <Card style={{ marginBottom: 20, background: C.warningBg, border: "1px solid " + C.goldLine }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <PauseCountdownBadge warningAt={inv.pauseWarningAt} deadline={inv.pauseDeadline} size={40} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.warningText }}>{notif?.title || "Action required on your account"}</div>
          <div style={{ fontSize: 12.5, color: C.warningText, marginTop: 2 }}>
            {notif?.message || "Please resolve the outstanding item on your account before the deadline, or it may be paused."} Need help? Contact {SUPPORT_EMAIL}.
          </div>
        </div>
      </div>
    </Card>
  );
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
        <PauseWarningBanner inv={inv} ctx={ctx} />
        <MigrationBanner inv={inv} />
        <KycCompletionPrompt inv={inv} ctx={ctx} />
        <Card>
          <EmptyState icon={TrendingUp} title="Your portfolio is waiting for its first entry."
            body="Every investor begins with one deposit. Make yours today."
            action={<Btn icon={Plus} onClick={() => ctx.goTo("invest")}>Start Investing</Btn>} />
        </Card>
      </PageShell>
    );
  }

  const latestPackage = active.length ? active[active.length - 1].package : null;

  return (
    <PageShell ctx={ctx} title="Dashboard">
      <PauseWarningBanner inv={inv} ctx={ctx} />
      <MigrationBanner inv={inv} />
      <KycCompletionPrompt inv={inv} ctx={ctx} />
      <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginBottom: 22 }}>
        {/* Member Ledger — styled like a real membership/debit card (chip, grouped
            member number, cardholder + package "network mark") rather than a plain
            gradient panel. flex: 1 1 (not 0 0) so it shrinks on narrow phones
            instead of forcing horizontal overflow; maxWidth caps it near a real
            card's proportions on desktop. aspect-ratio keeps the card shape at
            any width instead of just the corners being rounded. */}
        <div style={{ flex: "1 1 280px", maxWidth: 340 }}>
          <div style={{
            position: "relative", overflow: "hidden", aspectRatio: "1.586 / 1",
            borderRadius: 16, padding: "20px 22px", boxSizing: "border-box",
            background: "linear-gradient(135deg, " + C.brand + " 0%, " + C.brandDark + " 100%)",
            boxShadow: C.shadowCard, color: C.white, display: "flex", flexDirection: "column", justifyContent: "space-between",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(115deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 34%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", right: -46, top: -46, width: 170, height: 170, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.10), rgba(255,255,255,0) 70%)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
              {/* EMV-style chip */}
              <div style={{ width: 36, height: 26, borderRadius: 6, background: "linear-gradient(135deg, #EBDCAE, #C7AC69)", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 7, borderTop: "1px solid rgba(0,0,0,0.18)" }} />
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 7, borderBottom: "1px solid rgba(0,0,0,0.18)" }} />
                <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,0.18)" }} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: 0.6 }}>JEBBIDOX</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: 1.4, opacity: 0.8, marginTop: 2 }}>MEMBER LEDGER</div>
              </div>
            </div>

            <div style={{ position: "relative" }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: "clamp(13px, 3.4vw, 17px)", letterSpacing: 2.5, marginBottom: 16, whiteSpace: "nowrap" }}>
                {inv.memberId ? inv.memberId.replace(/-/g, "  ") : "PENDING  ACTIVATION"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: 1, opacity: 0.75, marginBottom: 3 }}>CARDHOLDER</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{inv.fullName}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 8.5, letterSpacing: 1, opacity: 0.75, marginBottom: 3 }}>PACKAGE</div>
                  <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>{latestPackage || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: C.ink }}>
              Welcome back, {inv.fullName.split(" ")[0]}
            </div>
            <VerifiedBadge verified={isVerifiedInvestor({ kyc_status: inv.kycStatus, verification_status: inv.verificationStatus })} size={18} />
          </div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 16 }}>
            Goal: {inv.goal}
          </div>
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

      <Card style={{ marginBottom: 18, maxWidth: 420 }}>
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
