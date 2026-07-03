import React, { useState } from "react";
import { CheckCircle2 } from "@/components/icons/index";
import { Btn, Card, Field, GuidanceBanner, Modal, TextInput } from "@/components/ui/primitives";
import { C, FONT_DISPLAY } from "@/lib/theme";

export function CreateFOModal({ ctx }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(null);
  function submit() {
    if (!name || !email) return;
    const r = ctx.createFinanceOfficer(name, email);
    setResult(r);
  }
  if (result) {
    return (
      <Modal title="Finance Officer Created" onClose={ctx.closeModal}>
        <GuidanceBanner tone="success" icon={CheckCircle2}>{result.name} has been created and now appears in the role switcher.</GuidanceBanner>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 10 }}>Share this temporary password securely. It must be changed on first login.</div>
        <Card style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 4 }}>Temporary Password</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: C.brand, letterSpacing: 1 }}>{result.tempPassword}</div>
        </Card>
        <Btn full onClick={ctx.closeModal}>Done</Btn>
      </Modal>
    );
  }
  return (
    <Modal title="Create Finance Officer" onClose={ctx.closeModal}>
      <GuidanceBanner tone="info">Only the Super Administrator can create Finance Officer accounts. A temporary password will be generated and the officer will be forced to set their own on first login.</GuidanceBanner>
      <Field label="Full Name"><TextInput value={name} onChange={setName} /></Field>
      <Field label="Email"><TextInput value={email} onChange={setEmail} /></Field>
      <Btn full disabled={!name || !email} onClick={submit}>Create Finance Officer</Btn>
    </Modal>
  );
}
