import React, { useState } from "react";
import { Btn, Field, GuidanceBanner, Modal, Select, TextInput } from "@/components/ui/primitives";
import { GOALS } from "@/lib/constants";
import { C } from "@/lib/theme";

export function AddInvestorModal({ ctx }) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", username: "", nationalId: "", address: "", occupation: "", goal: GOALS[0], nokName: "", nokRelationship: "", nokPhone: "" });
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  function set(k, v) { setForm((f) => Object.assign({}, f, { [k]: v })); }

  async function submit() {
    if (!form.fullName || !form.phone || !form.nationalId) { setErr("Full name, phone, and National ID are required."); return; }
    if (!form.email) { setErr("Email is required to create a login account for this investor."); return; }
    setErr("");
    const r = await ctx.addInvestorByStaff(form);
    // Previously only the success case was handled — a failure (e.g. duplicate
    // email, or any server-side error) left the form just sitting there with no
    // visible explanation. ctx.showToast already fires for errors, but the modal
    // itself should say so too, since a toast can be missed.
    if (r && r.error) { setErr(r.error); return; }
    if (r && r.tempPassword) setResult(r);
  }

  function copyPassword() {
    if (!result?.tempPassword) return;
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(result.tempPassword).then(() => ctx.showToast("Temporary password copied.", "success"));
      return;
    }
    ctx.showToast("Temporary password is shown below. Copy it now.", "info");
  }

  if (result) {
    return (
      <Modal title="Investor Account Created" onClose={ctx.closeModal}>
        <GuidanceBanner tone="success">Account created successfully. Share these credentials with the investor securely — they will be prompted to change their password on first login.</GuidanceBanner>
        <div style={{ background: C.cardBg, borderRadius: 10, padding: "14px 16px", margin: "16px 0" }}>
          {[["Email", form.email], ["Temporary Password", result.tempPassword]].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
              <span style={{ color: C.inkSoft }}>{label}</span>
              <strong style={{ fontFamily: "monospace", color: C.ink }}>{val}</strong>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.danger, marginBottom: 16 }}>This password will not be shown again. Do not store it — share it directly and destroy any written copy.</div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn full variant="outline" onClick={copyPassword}>Copy Password</Btn>
          <Btn full onClick={ctx.closeModal}>Done</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Add Walk-in Investor" onClose={ctx.closeModal}>
      <GuidanceBanner tone="info">Use this for investors who register in person. A Member ID is generated automatically. The investor will be emailed to set their own password.</GuidanceBanner>
      <Field label="Full Name"><TextInput value={form.fullName} onChange={(v) => set("fullName", v)} /></Field>
      <Field label="Phone Number"><TextInput value={form.phone} onChange={(v) => set("phone", v)} /></Field>
      <Field label="Email" hint="Required for login"><TextInput value={form.email} onChange={(v) => set("email", v)} type="email" /></Field>
      <Field label="Username" hint="Optional — auto-generated from name if left blank"><TextInput value={form.username} onChange={(v) => set("username", v)} placeholder="e.g. john.doe" /></Field>
      <Field label="National ID"><TextInput value={form.nationalId} onChange={(v) => set("nationalId", v)} /></Field>
      <Field label="Address"><TextInput value={form.address} onChange={(v) => set("address", v)} /></Field>
      <Field label="Occupation"><TextInput value={form.occupation} onChange={(v) => set("occupation", v)} /></Field>
      <Field label="Financial Goal"><Select value={form.goal} onChange={(v) => set("goal", v)} options={GOALS} /></Field>
      <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, margin: "16px 0 10px" }}>Next of Kin</div>
      <Field label="Name"><TextInput value={form.nokName} onChange={(v) => set("nokName", v)} /></Field>
      <Field label="Relationship"><TextInput value={form.nokRelationship} onChange={(v) => set("nokRelationship", v)} /></Field>
      <Field label="Phone"><TextInput value={form.nokPhone} onChange={(v) => set("nokPhone", v)} /></Field>
      {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
      <Btn full onClick={submit}>Create Investor Account</Btn>
    </Modal>
  );
}
