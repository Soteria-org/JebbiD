import React, { useState } from "react";
import { Banknote, ChevronLeft, FileCheck, FileText, Landmark } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, Field, GuidanceBanner, Modal, SectionTitle, TextInput } from "@/components/ui/primitives";
import { CORPORATE_THRESHOLD, GOALS, MIN_INVESTMENT, RATES } from "@/lib/constants";
import { expectedReturn, fmtUGX, maturityValue } from "@/lib/format";
import { C, FONT_DISPLAY } from "@/lib/theme";

export function InvestWizard({ ctx }) {
  const [step, setStep] = useState(1);
  const [pkg, setPkg] = useState("");
  const [goal, setGoal] = useState("");
  const [amount, setAmount] = useState("");
  const [amountErr, setAmountErr] = useState("");
  const [showConflict, setShowConflict] = useState(false);
  const [proofAttached, setProofAttached] = useState(false);
  const amt = Number(amount) || 0;
  const hasExisting = ctx.getInvestorInvestments(ctx.session.id).length > 0;

  function continueFromAmount() {
    if (amt < MIN_INVESTMENT) { setAmountErr("Minimum investment is " + fmtUGX(MIN_INVESTMENT) + "."); return; }
    setAmountErr("");
    if (pkg === "standard" && amt >= CORPORATE_THRESHOLD) { setShowConflict(true); return; }
    setStep(4);
  }

  function submit() {
    ctx.submitInvestment({ package: pkg, goal, amount: amt });
  }

  const steps = ["Package", "Goal", "Amount", "Review", "Deposit", "Upload Proof"];
  const ret = expectedReturn(amt, pkg);
  const mv = maturityValue(amt, pkg);

  return (
    <PageShell ctx={ctx} title="New Investment">
      <Card style={{ maxWidth: 680 }}>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 6 }}>Step {step} of 6 — {steps[step - 1]}</div>
        <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
          {steps.map((s, i) => <div key={s} style={{ flex: 1, height: 4, borderRadius: 100, background: i < step ? C.brand : C.line }} />)}
        </div>

        {step === 1 && (
          <>
            <SectionTitle sub="Choose the package that fits your contribution.">Choose Your Package</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { key: "standard", title: "Standard Package", rate: "30%", desc: "Below " + fmtUGX(CORPORATE_THRESHOLD) },
                { key: "corporate", title: "Corporate Package", rate: "40%", desc: fmtUGX(CORPORATE_THRESHOLD) + " and above" },
              ].map((p) => (
                <div key={p.key} onClick={() => setPkg(p.key)} style={{
                  border: "1.5px solid " + (pkg === p.key ? C.brand : C.line), borderRadius: 12, padding: 18, cursor: "pointer",
                  background: pkg === p.key ? C.cardBg : C.white,
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: C.brand, marginBottom: 6 }}>{p.rate}<span style={{ fontSize: 13, color: C.inkFaint, fontWeight: 400 }}> / year</span></div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft }}>{p.desc}</div>
                  <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>12-month investment period</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}><Btn full disabled={!pkg} onClick={() => setStep(2)}>Continue</Btn></div>
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle sub="This helps personalize your investment journey — it does not affect your return rate.">Choose Your Financial Goal</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {GOALS.map((g) => (
                <div key={g} onClick={() => setGoal(g)} style={{
                  padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                  border: "1.5px solid " + (goal === g ? C.brand : C.line),
                  background: goal === g ? C.cardBg : C.white, color: goal === g ? C.brand : C.ink,
                }}>{g}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(1)}>Back</Btn>
              <Btn full disabled={!goal} onClick={() => setStep(3)}>Continue</Btn>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <SectionTitle sub={"Minimum investment is " + fmtUGX(MIN_INVESTMENT) + "."}>Enter Your Amount</SectionTitle>
            {hasExisting ? <GuidanceBanner tone="info">This will create a separate investment position with its own start and maturity date — it will not merge with any existing investment.</GuidanceBanner> : null}
            <Field label="Investment Amount (UGX)" error={amountErr}>
              <TextInput value={amount} onChange={(v) => { setAmount(v.replace(/[^0-9]/g, "")); setAmountErr(""); }} placeholder="e.g. 500000" />
            </Field>
            {amt >= MIN_INVESTMENT ? (
              <Card style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}><span>Package</span><strong style={{ textTransform: "capitalize" }}>{pkg}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}><span>Annual Return ({(RATES[pkg] * 100)}%)</span><strong>{fmtUGX(ret)}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span>Estimated Value at Maturity</span><strong style={{ color: C.success }}>{fmtUGX(mv)}</strong></div>
              </Card>
            ) : null}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(2)}>Back</Btn>
              <Btn full onClick={continueFromAmount}>Continue</Btn>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <SectionTitle>Review Investment Summary</SectionTitle>
            {[["Package", pkg.charAt(0).toUpperCase() + pkg.slice(1)], ["Financial Goal", goal], ["Amount", fmtUGX(amt)],
              ["Investment Period", "12 months"], ["Expected Return (" + (RATES[pkg] * 100) + "%)", fmtUGX(ret)],
              ["Estimated Maturity Value", fmtUGX(mv)]].map((row) => (
              <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
                <span style={{ color: C.inkSoft }}>{row[0]}</span><strong style={{ color: C.ink }}>{row[1]}</strong>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(3)}>Back</Btn>
              <Btn full onClick={() => setStep(5)}>Confirm &amp; Continue</Btn>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <SectionTitle sub="Send your funds using either option below, then upload proof on the next step.">Deposit Instructions</SectionTitle>
            <Card style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 13.5, color: C.ink, marginBottom: 6 }}><Banknote size={16} /> Mobile Money</div>
              <div style={{ fontSize: 13.5, color: C.inkSoft }}>{ctx.org.momoLine}</div>
            </Card>
            <Card style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 13.5, color: C.ink, marginBottom: 6 }}><Landmark size={16} /> Bank Transfer</div>
              <div style={{ fontSize: 13.5, color: C.inkSoft }}>{ctx.org.bankLine}</div>
            </Card>
            <GuidanceBanner tone="info">Use your Member ID ({ctx.currentInvestor.memberId}) as the payment reference so we can match it quickly.</GuidanceBanner>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(4)}>Back</Btn>
              <Btn full onClick={() => setStep(6)}>I've Sent the Funds</Btn>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <SectionTitle sub="Attach a screenshot or transaction receipt as proof of your payment.">Upload Proof of Payment</SectionTitle>
            <div onClick={() => setProofAttached(true)} style={{
              border: "1.5px dashed " + (proofAttached ? C.success : C.line), borderRadius: 12, padding: 28, textAlign: "center",
              cursor: "pointer", background: proofAttached ? C.successBg : C.cardBg, marginBottom: 16,
            }}>
              {proofAttached ? (
                <>
                  <FileCheck size={26} color={C.success} style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.success }}>payment_proof.jpg attached</div>
                </>
              ) : (
                <>
                  <FileText size={26} color={C.inkFaint} style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.inkSoft }}>Click to attach proof of payment</div>
                  <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>JPG, PNG, or PDF</div>
                </>
              )}
            </div>
            <GuidanceBanner tone="warning">Your investment will show as "Pending Verification" until a Finance Officer or Administrator reviews and approves this deposit.</GuidanceBanner>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(5)}>Back</Btn>
              <Btn full disabled={!proofAttached} onClick={submit}>Submit for Verification</Btn>
            </div>
          </>
        )}
      </Card>

      {showConflict ? (
        <Modal title="This amount qualifies for Corporate" onClose={() => setShowConflict(false)}>
          <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.6, marginBottom: 18 }}>
            You selected the <strong>Standard Package</strong>, but {fmtUGX(amt)} meets the {fmtUGX(CORPORATE_THRESHOLD)}
            {" "}threshold for the <strong>Corporate Package</strong> (40% annual return instead of 30%). Did you mean to enter an extra zero,
            or would you like to switch to Corporate to earn the higher rate?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn full onClick={() => { setPkg("corporate"); setShowConflict(false); setStep(4); }}>Switch to Corporate Package</Btn>
            <Btn full variant="outline" onClick={() => { setShowConflict(false); setStep(4); }}>Keep Standard Package</Btn>
            <Btn full variant="ghost" onClick={() => setShowConflict(false)}>Let Me Edit the Amount</Btn>
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}
