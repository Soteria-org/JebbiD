import React, { useRef, useState } from "react";
import { Banknote, ChevronLeft, FileCheck, FileText, Landmark } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, Field, GuidanceBanner, Modal, SectionTitle, TextInput } from "@/components/ui/primitives";
import { GOALS, MIN_INVESTMENT } from "@/lib/constants";
import { fmtUGX } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { C, FONT_DISPLAY } from "@/lib/theme";

/**
 * InvestWizard — 6-step deposit submission flow.
 *
 * Step 1: Package selection (read from ctx.packages, live from DB)
 * Step 2: Financial goal
 * Step 3: Amount entry + live preview + package conflict guard
 * Step 4: Review summary
 * Step 5: Deposit instructions + payment method selection
 * Step 6: Upload proof + submit
 *
 * The wizard submits a deposit_submissions row (not an investment_positions row).
 * The DB trigger creates the investment position automatically on FO approval.
 */
export function InvestWizard({ ctx }) {
  const [step, setStep] = useState(1);
  const [selectedPkg, setSelectedPkg] = useState(null);  // full package object from DB
  const [goal, setGoal] = useState("");
  const [amount, setAmount] = useState("");
  const [amountErr, setAmountErr] = useState("");
  const [showConflict, setShowConflict] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [network, setNetwork] = useState(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const packages = ctx.packages || [];
  const amt = Number(amount) || 0;
  const hasExisting = ctx.getInvestorInvestments(ctx.session.id).length > 0;

  // Live preview math uses the selected package's rate directly from the DB object
  const rate = selectedPkg ? selectedPkg.annual_return_rate / 100 : 0;
  const ret = Math.round(amt * rate);
  const mv = amt + ret;

  function continueFromAmount() {
    if (!selectedPkg) return;
    if (amt < MIN_INVESTMENT) { setAmountErr("Minimum investment is " + fmtUGX(MIN_INVESTMENT) + "."); return; }
    setAmountErr("");
    // Package conflict: investor chose Standard but amount qualifies for Corporate
    if (selectedPkg.code === "standard" && selectedPkg.max_amount !== null && amt > selectedPkg.max_amount) {
      setShowConflict(true); return;
    }
    // Reverse conflict: Corporate selected but amount is below Corporate threshold
    if (selectedPkg.code === "corporate" && amt < selectedPkg.min_amount) {
      setAmountErr("Corporate Package requires a minimum of " + fmtUGX(selectedPkg.min_amount) + ". Please increase the amount or switch to the Standard Package.");
      return;
    }
    setStep(4);
  }

  function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function submit() {
    if (!proofFile && !proofPreview) return;
    setSubmitting(true);
    try {
      let proofStoragePath = null;
      if (proofFile) {
        const supabase = createClient();
        const ext = proofFile.name.split(".").pop() || "jpg";
        const path = `${ctx.session.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("payment-proofs")
          .upload(path, proofFile, { contentType: proofFile.type, upsert: true });
        if (uploadErr) { ctx.showToast("Proof upload failed: " + uploadErr.message, "error"); setSubmitting(false); return; }
        proofStoragePath = path;
      }
      await ctx.submitInvestment({
        packageId: selectedPkg.id,
        amount: amt,
        goal,
        paymentMethod,
        network,
        transactionRef: transactionRef || null,
        proofStoragePath,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const steps = ["Package", "Goal", "Amount", "Review", "Deposit", "Upload Proof"];
  const corporatePkg = packages.find((p) => p.code === "corporate");

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
            {packages.length === 0 ? (
              <div style={{ color: C.inkFaint, fontSize: 13.5, padding: 20, textAlign: "center" }}>Loading packages…</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {packages.map((p) => (
                  <div key={p.id} onClick={() => setSelectedPkg(p)} style={{
                    border: "1.5px solid " + (selectedPkg?.id === p.id ? C.brand : C.line),
                    borderRadius: 12, padding: 18, cursor: "pointer",
                    background: selectedPkg?.id === p.id ? C.cardBg : C.white,
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 4 }}>{p.name}</div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: C.brand, marginBottom: 6 }}>
                      {p.annual_return_rate}%<span style={{ fontSize: 13, color: C.inkFaint, fontWeight: 400 }}> / year</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: C.inkSoft }}>
                      {p.max_amount ? "Below " + fmtUGX(p.max_amount + 1) : fmtUGX(p.min_amount) + " and above"}
                    </div>
                    <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>{p.duration_months}-month investment period</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 20 }}><Btn full disabled={!selectedPkg} onClick={() => setStep(2)}>Continue</Btn></div>
          </>
        )}

        {step === 2 && (
          <>
            <SectionTitle sub="This personalises your investment journey — it does not affect your return rate.">Choose Your Financial Goal</SectionTitle>
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
            {amt >= MIN_INVESTMENT && selectedPkg ? (
              <Card style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}><span>Package</span><strong>{selectedPkg.name}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}><span>Annual Return ({selectedPkg.annual_return_rate}%)</span><strong>{fmtUGX(ret)}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}><span>Estimated Value at Maturity</span><strong style={{ color: C.success }}>{fmtUGX(mv)}</strong></div>
              </Card>
            ) : null}
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(2)}>Back</Btn>
              <Btn full onClick={continueFromAmount}>Continue</Btn>
            </div>
          </>
        )}

        {step === 4 && selectedPkg && (
          <>
            <SectionTitle>Review Investment Summary</SectionTitle>
            {[
              ["Package", selectedPkg.name],
              ["Financial Goal", goal],
              ["Amount", fmtUGX(amt)],
              ["Investment Period", selectedPkg.duration_months + " months"],
              ["Expected Return (" + selectedPkg.annual_return_rate + "%)", fmtUGX(ret)],
              ["Estimated Maturity Value", fmtUGX(mv)],
            ].map((row) => (
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
            <SectionTitle sub="Choose how you'll send your funds, then send them using the details shown.">Deposit Instructions</SectionTitle>
            <Field label="Payment Method">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 6, marginBottom: 4 }}>
                {[
                  { key: "MTN", method: "mobile_money", label: "MTN Mobile Money" },
                  { key: "Airtel", method: "mobile_money", label: "Airtel Money" },
                  { key: "Bank", method: "bank_transfer", label: "Bank Transfer" },
                ].map((opt) => {
                  const selected = opt.method === "bank_transfer"
                    ? paymentMethod === "bank_transfer"
                    : paymentMethod === "mobile_money" && network === opt.key;
                  return (
                    <div key={opt.key} onClick={() => {
                      setPaymentMethod(opt.method);
                      setNetwork(opt.method === "mobile_money" ? opt.key : null);
                    }} style={{
                      padding: "14px 10px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700, textAlign: "center",
                      border: "1.5px solid " + (selected ? C.brand : C.line),
                      background: selected ? C.cardBg : C.white,
                      color: selected ? C.brand : C.ink,
                    }}>{opt.label}</div>
                  );
                })}
              </div>
            </Field>

            {paymentMethod === "mobile_money" && network === "MTN" && (
              <Card style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 13.5, color: C.ink, marginBottom: 6 }}><Banknote size={16} /> MTN Mobile Money</div>
                <div style={{ fontSize: 13.5, color: C.inkSoft }}>{ctx.org.mtnMomoLine}</div>
              </Card>
            )}
            {paymentMethod === "mobile_money" && network === "Airtel" && (
              <Card style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 13.5, color: C.ink, marginBottom: 6 }}><Banknote size={16} /> Airtel Money</div>
                <div style={{ fontSize: 13.5, color: C.inkSoft }}>{ctx.org.airtelMoneyLine}</div>
              </Card>
            )}
            {paymentMethod === "bank_transfer" && (
              <Card style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 700, fontSize: 13.5, color: C.ink, marginBottom: 6 }}><Landmark size={16} /> Bank Transfer</div>
                <div style={{ fontSize: 13.5, color: C.inkSoft }}>{ctx.org.bankLine}</div>
              </Card>
            )}

            {paymentMethod ? (
              <GuidanceBanner tone="info">Use your Member ID ({ctx.currentInvestor?.memberId}) as the payment reference so we can match your deposit quickly.</GuidanceBanner>
            ) : null}

            <Field label="Transaction Reference / ID" hint="Optional but speeds up verification">
              <TextInput value={transactionRef} onChange={setTransactionRef} placeholder="e.g. MTN ref or bank reference number" />
            </Field>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(4)}>Back</Btn>
              <Btn full disabled={!paymentMethod} onClick={() => setStep(6)}>I've Sent the Funds</Btn>
            </div>
          </>
        )}

        {step === 6 && (
          <>
            <SectionTitle sub="Attach a screenshot or transaction receipt as proof of your payment.">Upload Proof of Payment</SectionTitle>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={onFileSelected} />
            <div onClick={() => fileInputRef.current?.click()} style={{
              border: "1.5px dashed " + (proofFile ? C.success : C.line), borderRadius: 12, padding: 28, textAlign: "center",
              cursor: "pointer", background: proofFile ? C.successBg : C.cardBg, marginBottom: 16,
            }}>
              {proofFile ? (
                <>
                  <FileCheck size={26} color={C.success} style={{ marginBottom: 8 }} />
                  {proofPreview && proofFile.type.startsWith("image/") ? (
                    <img src={proofPreview} alt="Proof preview" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 8, marginBottom: 8, display: "block", marginLeft: "auto", marginRight: "auto" }} />
                  ) : null}
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.success }}>{proofFile.name} attached</div>
                  <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>Click to replace</div>
                </>
              ) : (
                <>
                  <FileText size={26} color={C.inkFaint} style={{ marginBottom: 8 }} />
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.inkSoft }}>Click to attach proof of payment</div>
                  <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>JPG, PNG, or PDF — screenshot or receipt</div>
                </>
              )}
            </div>
            <GuidanceBanner tone="warning">Your investment will show as "Pending Verification" until a Finance Officer reviews and approves this deposit.</GuidanceBanner>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" icon={ChevronLeft} onClick={() => setStep(5)}>Back</Btn>
              <Btn full disabled={!proofFile || submitting} onClick={submit}>{submitting ? "Submitting…" : "Submit for Verification"}</Btn>
            </div>
          </>
        )}
      </Card>

      {showConflict && corporatePkg ? (
        <Modal title="This amount qualifies for Corporate" onClose={() => setShowConflict(false)}>
          <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.6, marginBottom: 18 }}>
            You selected the <strong>Standard Package</strong>, but {fmtUGX(amt)} meets the{" "}
            {fmtUGX(corporatePkg.min_amount)} threshold for the <strong>Corporate Package</strong>{" "}
            ({corporatePkg.annual_return_rate}% annual return instead of {selectedPkg?.annual_return_rate}%). Did you
            mean to enter an extra zero, or would you like to switch to Corporate to earn the higher rate?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn full onClick={() => { setSelectedPkg(corporatePkg); setShowConflict(false); setStep(4); }}>Switch to Corporate Package</Btn>
            <Btn full variant="outline" onClick={() => { setShowConflict(false); setStep(4); }}>Keep Standard Package</Btn>
            <Btn full variant="ghost" onClick={() => setShowConflict(false)}>Let Me Edit the Amount</Btn>
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}
