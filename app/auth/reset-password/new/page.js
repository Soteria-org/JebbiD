"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound } from "@/components/icons/index";
import { Logo } from "@/components/ui/Logo";
import { Btn, Card, Field, TextInput } from "@/components/ui/primitives";
import { PasswordStrengthMeter } from "@/components/ui/PasswordStrengthMeter";
import { checkPasswordStrength } from "@/lib/password-policy";
import { completePasswordReset } from "@/lib/actions/auth-actions";
import { C, FONT_BODY, FONT_DISPLAY } from "@/lib/theme";

/**
 * Reached only via app/auth/reset-password/route.js, which has already
 * verified the emailed recovery link and established a session — this page
 * itself is a standalone route (not part of the JBDocsApp SPA shell, since
 * that shell has no existing-session bootstrap), so it calls the server
 * action directly rather than going through ctx.
 */
export default function ResetPasswordPage() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const strong = checkPasswordStrength(pw).valid;

  async function submit() {
    if (!strong) { setErr("Password doesn't meet the requirements shown below yet."); return; }
    if (pw !== confirm) { setErr("Passwords do not match."); return; }
    setErr(""); setSaving(true);
    const result = await completePasswordReset(pw);
    setSaving(false);
    if (result.error) setErr(result.error);
    else setDone(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.pageBg, fontFamily: FONT_BODY, padding: 20 }}>
      <Card style={{ maxWidth: 420, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo size={40} />
        </div>
        {done ? (
          <>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, marginBottom: 6, textAlign: "center" }}>Password updated.</div>
            <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20, textAlign: "center" }}>
              Sign in with your new password to continue.
            </div>
            <Link href="/portal">
              <Btn full>Back to Sign In</Btn>
            </Link>
          </>
        ) : (
          <>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand, marginBottom: 16 }}>
              <KeyRound size={22} />
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Set a new password</div>
            <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20 }}>
              Choose a new password for your Jebbidox account.
            </div>
            <Field label="New Password"><TextInput value={pw} onChange={setPw} type="password" testId="reset-new-password" /></Field>
            <PasswordStrengthMeter password={pw} />
            <Field label="Confirm New Password"><TextInput value={confirm} onChange={setConfirm} type="password" testId="reset-confirm-password" /></Field>
            {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
            <Btn full onClick={submit} disabled={saving} testId="reset-submit">{saving ? "Saving…" : "Set Password"}</Btn>
          </>
        )}
      </Card>
    </div>
  );
}
