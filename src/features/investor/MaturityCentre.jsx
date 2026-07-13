import React, { useState } from "react";
import { ArrowRightLeft, ArrowUpRight, Award, Banknote, Repeat, TrendingUp, Wallet } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState, Field, Modal, StatCard, TextInput } from "@/components/ui/primitives";
import { fmtDate, fmtUGX, todayISO } from "@/lib/format";
import { C } from "@/lib/theme";

const NEEDS_PAYOUT = ["withdraw_profit", "withdraw_all"];

export function MaturityCentre({ ctx }) {
  const positions = ctx.getInvestorInvestments(ctx.session.id);
  const today = todayISO();
  const maturable = positions.filter((p) => p.status === "active" && p.maturityDate && p.maturityDate <= today && !p.maturityChoice);
  const [choosing, setChoosing] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState("");

  // Payout detail fields — only relevant when choosing.choice needs a real payout
  const [paymentMethod, setPaymentMethod] = useState("");
  const [network, setNetwork] = useState(null);
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccName, setBankAccName] = useState("");
  const [bankAccNo, setBankAccNo] = useState("");

  function openChoice(positionId, choice) {
    setChoosing({ positionId, choice });
    setPaymentMethod(""); setNetwork(null); setPhone(""); setBankName(""); setBankAccName(""); setBankAccNo(""); setErr("");
  }

  async function confirmChoice() {
    setErr("");
    const needsPayout = NEEDS_PAYOUT.includes(choosing.choice);
    if (needsPayout) {
      if (!paymentMethod) { setErr("Choose how you'd like to be paid."); return; }
      if (paymentMethod === "mobile_money" && (!network || !phone)) { setErr("Network and phone number are required."); return; }
      if (paymentMethod === "bank_transfer" && (!bankName || !bankAccName || !bankAccNo)) { setErr("Complete all bank details."); return; }
    }
    setConfirming(true);
    const result = await ctx.chooseMaturityOption(choosing.positionId, choosing.choice, needsPayout ? {
      paymentMethod, network, phone, bankName, accountName: bankAccName, accountNumber: bankAccNo,
    } : undefined);
    setConfirming(false);
    if (result?.error) { setErr(result.error); return; }
    setChoosing(null);
  }

  return (
    <PageShell ctx={ctx} title="Maturity Centre">
      {maturable.length === 0 ? (
        <Card><EmptyState icon={Award} title="No investments at maturity" body="When a position reaches its 12-month maturity date, your options will appear here." /></Card>
      ) : maturable.map((p) => (
        <Card key={p.id} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: C.successBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.success }}><Award size={20} /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>Congratulations — {p.id} has matured</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>Matured {fmtDate(p.maturityDate)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
            <StatCard label="Principal" value={fmtUGX(p.amount)} icon={Wallet} />
            <StatCard label="Returns" value={fmtUGX(p.expectedReturn)} icon={TrendingUp} tone="success" />
            <StatCard label="Total Value" value={fmtUGX(p.maturityValue)} icon={Award} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Choose what happens next</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { key: "reinvest", icon: Repeat, label: "Reinvest Everything", desc: "Roll the full " + fmtUGX(p.maturityValue) + " into a new position" },
              { key: "withdraw_profit", icon: ArrowUpRight, label: "Withdraw Profit Only", desc: "Take out " + fmtUGX(p.expectedReturn) + ", reinvest the principal" },
              { key: "switch_package", icon: ArrowRightLeft, label: "Switch Package", desc: "Move proceeds into the other package" },
              { key: "withdraw_all", icon: Banknote, label: "Withdraw Everything", desc: "Request the full " + fmtUGX(p.maturityValue) },
            ].map((o) => (
              <div key={o.key} onClick={() => openChoice(p.id, o.key)} style={{
                border: "1px solid " + C.line, borderRadius: 11, padding: 14, cursor: "pointer", display: "flex", gap: 10,
              }}>
                <o.icon size={18} color={C.brand} style={{ flexShrink: 0, marginTop: 1 }} />
                <div><div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{o.label}</div><div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>{o.desc}</div></div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {choosing ? (
        <Modal title="Confirm Your Choice" onClose={() => setChoosing(null)}>
          <div style={{ fontSize: 14, color: C.ink, marginBottom: 18, lineHeight: 1.55 }}>
            {choosing.choice === "reinvest" && "This will close the matured position and open a new 12-month investment with the full maturity value as principal."}
            {choosing.choice === "withdraw_profit" && "Your profit will be submitted as a withdrawal request. Your principal will be reinvested into a new 12-month position."}
            {choosing.choice === "switch_package" && "This will close the matured position and open a new 12-month investment in the other package, using the full maturity value as principal."}
            {choosing.choice === "withdraw_all" && "The full maturity value will be submitted as a withdrawal request. No further investment will remain active for this position."}
          </div>

          {NEEDS_PAYOUT.includes(choosing.choice) ? (
            <div style={{ marginBottom: 8 }}>
              <Field label="How would you like to be paid?">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 6, marginBottom: 4 }}>
                  {[
                    { key: "MTN", method: "mobile_money", label: "MTN Mobile Money" },
                    { key: "Airtel", method: "mobile_money", label: "Airtel Money" },
                    { key: "Bank", method: "bank_transfer", label: "Bank Transfer" },
                  ].map((opt) => {
                    const selected = opt.method === "bank_transfer" ? paymentMethod === "bank_transfer" : paymentMethod === "mobile_money" && network === opt.key;
                    return (
                      <div key={opt.key} onClick={() => { setPaymentMethod(opt.method); setNetwork(opt.method === "mobile_money" ? opt.key : null); }} style={{
                        padding: "12px 8px", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: 700, textAlign: "center",
                        border: "1.5px solid " + (selected ? C.brand : C.line),
                        background: selected ? C.cardBg : C.white, color: selected ? C.brand : C.ink,
                      }}>{opt.label}</div>
                    );
                  })}
                </div>
              </Field>

              {paymentMethod === "mobile_money" ? (
                <Field label="Phone Number"><TextInput value={phone} onChange={setPhone} placeholder="e.g. 0787 905 165" /></Field>
              ) : null}

              {paymentMethod === "bank_transfer" ? (
                <>
                  <Field label="Bank Name"><TextInput value={bankName} onChange={setBankName} /></Field>
                  <Field label="Account Name"><TextInput value={bankAccName} onChange={setBankAccName} /></Field>
                  <Field label="Account Number"><TextInput value={bankAccNo} onChange={setBankAccNo} /></Field>
                </>
              ) : null}
            </div>
          ) : null}

          {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}

          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setChoosing(null)} disabled={confirming}>Cancel</Btn>
            <Btn full onClick={confirmChoice} disabled={confirming}>{confirming ? "Processing…" : "Confirm"}</Btn>
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}

