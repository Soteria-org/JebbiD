import React, { useState } from "react";
import { KeyRound } from "@/components/icons/index";
import { Btn, Card, Field, TextInput } from "@/components/ui/primitives";
import { C, FONT_BODY, FONT_DISPLAY } from "@/lib/theme";

export function ForcedPasswordChange({ ctx }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  function submit() {
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (pw !== confirm) { setErr("Passwords do not match."); return; }
    ctx.completeForcedPasswordChange(pw);
  }
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.pageBg, fontFamily: FONT_BODY, padding: 20 }}>
      <Card style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand, marginBottom: 16 }}>
          <KeyRound size={22} />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Set a new password</div>
        <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20 }}>
          This is a Finance Officer account created by the Super Administrator with a temporary password.
          You must set your own password before continuing.
        </div>
        <Field label="New Password"><TextInput value={pw} onChange={setPw} type="password" /></Field>
        <Field label="Confirm New Password"><TextInput value={confirm} onChange={setConfirm} type="password" /></Field>
        {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
        <Btn full onClick={submit}>Set Password &amp; Continue</Btn>
      </Card>
    </div>
  );
}
