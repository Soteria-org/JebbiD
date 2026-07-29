import React, { useState } from "react";
import { KeyRound } from "@/components/icons/index";
import { Btn, Card, Field, TextInput } from "@/components/ui/primitives";
import { PasswordStrengthMeter } from "@/components/ui/PasswordStrengthMeter";
import { checkPasswordStrength } from "@/lib/password-policy";
import { C, FONT_BODY, FONT_DISPLAY } from "@/lib/theme";

export function ForcedPasswordChange({ ctx }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const strong = checkPasswordStrength(pw).valid;
  async function submit() {
    if (!strong) { setErr("Password doesn't meet the requirements shown below yet."); return; }
    if (pw !== confirm) { setErr("Passwords do not match."); return; }
    setErr(""); setSaving(true);
    const result = await ctx.completeForcedPasswordChange(pw);
    setSaving(false);
    if (result && !result.ok) setErr(result.error);
  }
  const roleLabel = ctx.forcedPwSession?.role === "investor" ? "investor" : "staff";
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.pageBg, fontFamily: FONT_BODY, padding: 20 }}>
      <Card style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand, marginBottom: 16 }}>
          <KeyRound size={22} />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Set a new password</div>
        <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20 }}>
          This {roleLabel} account was created with a temporary password.
          You must set your own password before continuing.
        </div>
        <Field label="New Password"><TextInput value={pw} onChange={setPw} type="password" testId="forced-new-password" /></Field>
        <PasswordStrengthMeter password={pw} />
        <Field label="Confirm New Password"><TextInput value={confirm} onChange={setConfirm} type="password" /></Field>
        {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
        <Btn full onClick={submit} disabled={saving} testId="forced-submit">{saving ? "Saving…" : "Set Password & Continue"}</Btn>
      </Card>
    </div>
  );
}
