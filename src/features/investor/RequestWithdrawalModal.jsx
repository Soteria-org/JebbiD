import React, { useState, useEffect } from "react";
import { Btn, Card, Field, GuidanceBanner, Modal, Select, TextArea, TextInput } from "@/components/ui/primitives";
import { PENALTY_RATE } from "@/lib/constants";
import { fmtDate, fmtUGX, isEarlyWithdrawal } from "@/lib/format";
import { C } from "@/lib/theme";

export function RequestWithdrawalModal({ ctx, payload }) {
  const eligible = ctx.getInvestorInvestments(ctx.session.id).filter((p) => p.status === "active");
  const [investmentId, setInvestmentId] = useState(payload.investmentId || (eligible[0] ? eligible[0].id : ""));
  const position = eligible.find((p) => p.id === investmentId);
  const [amount, setAmount] = useState(position ? String(position.amount) : "");
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("mobile_money");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoNetwork, setMomoNetwork] = useState("MTN");
  const [bankName, setBankName] = useState("");
  const [bankAccName, setBankAccName] = useState("");
  const [bankAccNo, setBankAccNo] = useState("");
  const [comments, setComments] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { if (position) setAmount(String(position.amount)); }, [investmentId]);

  if (!position) return <Modal title="Request Withdrawal" onClose={ctx.closeModal}><div style={{ fontSize: 13.5 }}>No active positions are eligible for withdrawal.</div></Modal>;

  const amt = Number(amount) || 0;
  const early = isEarlyWithdrawal(position.maturityDate);
  const penalty = early ? amt * PENALTY_RATE : 0;
  const net = amt - penalty;

  async function submit() {
    if (amt <= 0 || amt > position.amount) { setErr("Enter an amount up to " + fmtUGX(position.amount) + "."); return; }
    if (!reason) { setErr("Please select a reason."); return; }
    if (method === "mobile_money" && !momoPhone) { setErr("Mobile money phone number is required."); return; }
    if (method === "bank_transfer" && (!bankName || !bankAccName || !bankAccNo)) { setErr("Complete all bank details."); return; }
    await ctx.requestWithdrawal({
      investmentId, amount: amt, reason, paymentMethod: method,
      details: method === "mobile_money" ? { phone: momoPhone, network: momoNetwork } : { bankName, accountName: bankAccName, accountNumber: bankAccNo },
      comments, penalty, netAmount: net,
    });
  }

  return (
    <Modal title="Request Withdrawal" onClose={ctx.closeModal}>
      <Field label="Investment Position">
        <Select value={investmentId} onChange={setInvestmentId} options={eligible.map((p) => ({ value: p.id, label: p.id + " — " + fmtUGX(p.amount) + " (" + p.package + ")" }))} />
      </Field>
      <Field label="Amount to Withdraw (UGX)"><TextInput value={amount} onChange={(v) => setAmount(v.replace(/[^0-9]/g, ""))} /></Field>

      {early ? (
        <GuidanceBanner tone="warning">This investment matures on {fmtDate(position.maturityDate)}. Withdrawing now is early and will incur a 15% penalty.</GuidanceBanner>
      ) : (
        <GuidanceBanner tone="success">This investment has matured — no early withdrawal penalty applies.</GuidanceBanner>
      )}

      <Card style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 8 }}><span>Penalty (15% if early)</span><strong style={{ color: penalty > 0 ? C.danger : C.success }}>{penalty > 0 ? "-" + fmtUGX(penalty) : "None"}</strong></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}><span>Net Payable</span><span style={{ color: C.success }}>{fmtUGX(net)}</span></div>
      </Card>

      <Field label="Reason"><Select value={reason} onChange={setReason} placeholder="Select a reason" options={["Business", "Savings", "Emergency", "Other"]} /></Field>
      <Field label="Payment Method">
        <Select value={method} onChange={setMethod} options={[{ value: "mobile_money", label: "Mobile Money" }, { value: "bank_transfer", label: "Bank Transfer" }]} />
      </Field>
      {method === "mobile_money" ? (
        <>
          <Field label="Network"><Select value={momoNetwork} onChange={setMomoNetwork} options={["MTN", "Airtel"]} /></Field>
          <Field label="Phone Number"><TextInput value={momoPhone} onChange={setMomoPhone} placeholder="+256 7XX XXXXXX" /></Field>
        </>
      ) : (
        <>
          <Field label="Bank Name"><TextInput value={bankName} onChange={setBankName} /></Field>
          <Field label="Account Name"><TextInput value={bankAccName} onChange={setBankAccName} /></Field>
          <Field label="Account Number"><TextInput value={bankAccNo} onChange={setBankAccNo} /></Field>
        </>
      )}
      <Field label="Comments" hint="Optional"><TextArea value={comments} onChange={setComments} rows={2} /></Field>
      {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
      <Btn full onClick={submit}>Submit Withdrawal Request</Btn>
    </Modal>
  );
}
