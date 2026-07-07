import React, { useState } from "react";
import { Btn, Field, GuidanceBanner, Modal, Select, TextInput } from "@/components/ui/primitives";
import { GOALS } from "@/lib/constants";
import { C } from "@/lib/theme";

export function AddInvestorModal({ ctx }) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", nationalId: "", address: "", occupation: "", goal: GOALS[0], nokName: "", nokRelationship: "", nokPhone: "" });
  const [err, setErr] = useState("");
  function set(k, v) { setForm((f) => Object.assign({}, f, { [k]: v })); }
  function submit() {
    if (!form.fullName || !form.phone || !form.nationalId) { setErr("Full name, phone, and National ID are required."); return; }
    ctx.addInvestorByStaff(form);
  }
  return (
    <Modal title="Add Walk-in Investor" onClose={ctx.closeModal}>
      <GuidanceBanner tone="info">Use this for investors who register in person. A Member ID is generated automatically.</GuidanceBanner>
      <Field label="Full Name"><TextInput value={form.fullName} onChange={(v) => set("fullName", v)} /></Field>
      <Field label="Phone Number"><TextInput value={form.phone} onChange={(v) => set("phone", v)} /></Field>
      <Field label="Email" hint="Optional"><TextInput value={form.email} onChange={(v) => set("email", v)} /></Field>
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
