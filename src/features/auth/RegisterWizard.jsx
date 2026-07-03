import React, { useState } from "react";
import { ChevronLeft } from "@/components/icons/index";
import { Btn, Field, GuidanceBanner, TextInput } from "@/components/ui/primitives";
import { GOALS } from "@/lib/constants";
import { C, FONT_DISPLAY } from "@/lib/theme";

export function RegisterWizard({ ctx, onBackToLogin }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", nationalId: "", address: "", occupation: "",
    nokName: "", nokRelationship: "", nokPhone: "", nokAddress: "",
    goal: "", username: "", password: "", confirmPassword: "",
  });
  const [err, setErr] = useState("");
  function set(k, v) { setForm((f) => Object.assign({}, f, { [k]: v })); }

  function validateStep() {
    if (step === 1) {
      if (!form.fullName || !form.email || !form.phone) return "Please complete all personal information fields.";
    }
    if (step === 2) {
      if (!form.nationalId || !form.address || !form.occupation) return "Please complete identification and address details.";
    }
    if (step === 3) {
      if (!form.nokName || !form.nokRelationship || !form.nokPhone) return "Next of kin details are required for every investor.";
    }
    if (step === 4) {
      if (!form.goal) return "Please select a financial goal.";
    }
    if (step === 5) {
      if (!form.username || !form.password) return "Choose a username and password.";
      if (form.password.length < 6) return "Password must be at least 6 characters.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    return "";
  }

  function next() {
    const v = validateStep();
    if (v) { setErr(v); return; }
    setErr("");
    if (step === 5) {
      ctx.registerInvestor(form);
      return;
    }
    setStep(step + 1);
  }

  const steps = ["Personal Info", "Identification", "Next of Kin", "Financial Goal", "Security"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18, cursor: "pointer", color: C.inkFaint, fontSize: 13 }} onClick={onBackToLogin}>
        <ChevronLeft size={15} /> Back to sign in
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Create your investor account</div>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 18 }}>Step {step} of 5 — {steps[step - 1]}</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 22 }}>
        {steps.map((s, i) => <div key={s} style={{ flex: 1, height: 4, borderRadius: 100, background: i < step ? C.brand : C.line }} />)}
      </div>

      {step === 1 && (
        <>
          <Field label="Full Name"><TextInput value={form.fullName} onChange={(v) => set("fullName", v)} placeholder="As it appears on your ID" /></Field>
          <Field label="Email Address"><TextInput value={form.email} onChange={(v) => set("email", v)} placeholder="you@example.com" type="email" /></Field>
          <Field label="Phone Number"><TextInput value={form.phone} onChange={(v) => set("phone", v)} placeholder="+256 7XX XXXXXX" /></Field>
        </>
      )}
      {step === 2 && (
        <>
          <Field label="National ID Number"><TextInput value={form.nationalId} onChange={(v) => set("nationalId", v)} placeholder="CMxxxxxxxxxxxxx" /></Field>
          <Field label="Residential Address"><TextInput value={form.address} onChange={(v) => set("address", v)} placeholder="Town / City" /></Field>
          <Field label="Occupation"><TextInput value={form.occupation} onChange={(v) => set("occupation", v)} placeholder="What do you do?" /></Field>
          <GuidanceBanner tone="info">A passport photo and digital signature would be captured here in production. Skipped for this prototype.</GuidanceBanner>
        </>
      )}
      {step === 3 && (
        <>
          <GuidanceBanner tone="info">Next of kin details are visible to Finance Officers and Super Administrators only, never to other investors.</GuidanceBanner>
          <Field label="Next of Kin Full Name"><TextInput value={form.nokName} onChange={(v) => set("nokName", v)} /></Field>
          <Field label="Relationship"><TextInput value={form.nokRelationship} onChange={(v) => set("nokRelationship", v)} placeholder="e.g. Spouse, Parent, Sibling" /></Field>
          <Field label="Next of Kin Phone"><TextInput value={form.nokPhone} onChange={(v) => set("nokPhone", v)} /></Field>
          <Field label="Next of Kin Address" hint="Optional"><TextInput value={form.nokAddress} onChange={(v) => set("nokAddress", v)} /></Field>
        </>
      )}
      {step === 4 && (
        <Field label="What are you investing toward?">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {GOALS.map((g) => (
              <div key={g} onClick={() => set("goal", g)} style={{
                padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: 600,
                border: "1.5px solid " + (form.goal === g ? C.brand : C.line),
                background: form.goal === g ? C.cardBg : C.white, color: form.goal === g ? C.brand : C.ink,
              }}>{g}</div>
            ))}
          </div>
        </Field>
      )}
      {step === 5 && (
        <>
          <Field label="Username"><TextInput value={form.username} onChange={(v) => set("username", v)} placeholder="Used with your Member ID to sign in" /></Field>
          <Field label="Password"><TextInput value={form.password} onChange={(v) => set("password", v)} type="password" /></Field>
          <Field label="Confirm Password"><TextInput value={form.confirmPassword} onChange={(v) => set("confirmPassword", v)} type="password" /></Field>
        </>
      )}

      {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        {step > 1 ? <Btn variant="ghost" onClick={() => setStep(step - 1)} icon={ChevronLeft}>Back</Btn> : null}
        <Btn full onClick={next}>{step === 5 ? "Create Account" : "Continue"}</Btn>
      </div>
    </div>
  );
}
