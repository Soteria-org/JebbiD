import React, { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, UserCog } from "@/components/icons/index";
import { Btn, Field, TextInput } from "@/components/ui/primitives";
import { PasswordStrengthMeter } from "@/components/ui/PasswordStrengthMeter";
import { checkPasswordStrength } from "@/lib/password-policy";
import { Logo } from "@/components/ui/Logo";
import { RegisterWizard } from "@/features/auth/RegisterWizard";
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

/**
 * Reached by clicking the emailed recovery link — app/auth/reset-password/route.js
 * already verified the token and established a session, then redirected here
 * with ?resetPassword=1 (see JBDocsApp's initialMode prop). No separate page,
 * no code to type: the link IS the whole flow.
 */
function ResetPasswordForm({ ctx, onDone }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const strong = checkPasswordStrength(pw).valid;

  async function submit() {
    if (!strong) { setErr("Password doesn't meet the requirements shown below yet."); return; }
    if (pw !== confirm) { setErr("Passwords do not match."); return; }
    setErr(""); setSaving(true);
    const res = await ctx.completePasswordReset(pw);
    setSaving(false);
    if (res.ok) onDone();
    else setErr(res.error);
  }

  return (
    <>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand, marginBottom: 16 }}>
        <KeyRound size={22} />
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Set a new password</div>
      <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>
        Choose a new password for your Jebbidox account.
      </div>
      <Field label="New Password"><TextInput value={pw} onChange={setPw} type="password" testId="reset-new-password" /></Field>
      <PasswordStrengthMeter password={pw} />
      <Field label="Confirm New Password"><TextInput value={confirm} onChange={setConfirm} type="password" testId="reset-confirm-password" /></Field>
      {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
      <Btn full onClick={submit} disabled={saving} testId="reset-submit">{saving ? "Saving…" : "Set Password"}</Btn>
    </>
  );
}

/**
 * Two steps, both on this one screen — no emailed link to click, no
 * redirect, no Supabase redirect-URL allowlist involved at all. Step 1
 * sends the email (same requestPasswordReset() the link-based flow uses);
 * step 2 collects the 6-digit code from that email plus the new password
 * and submits both together via completePasswordResetWithCode().
 */
function ForgotPasswordForm({ ctx, onBack, onDone }) {
  const [identifier, setIdentifier] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const strong = checkPasswordStrength(pw).valid;

  async function sendCode() {
    setSending(true);
    const res = await ctx.requestPasswordReset(identifier.trim());
    setSending(false);
    if (res.ok) setSent(true);
  }

  async function submitCode() {
    if (!code.trim()) { setErr("Enter the code from your email."); return; }
    if (!strong) { setErr("Password doesn't meet the requirements shown below yet."); return; }
    if (pw !== confirm) { setErr("Passwords do not match."); return; }
    setErr(""); setSaving(true);
    const res = await ctx.completePasswordResetWithCode(identifier.trim(), code.trim(), pw);
    setSaving(false);
    if (res.ok) onDone();
    else setErr(res.error);
  }

  return (
    <>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: C.cardBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand, marginBottom: 16 }}>
        <KeyRound size={22} />
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: C.ink, marginBottom: 8 }}>Reset your password</div>
      {!sent ? (
        <>
          <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>
            Enter your Member ID or email and we&rsquo;ll send you a 6-digit code to reset your password.
          </div>
          <Field label="Member ID or email">
            <TextInput value={identifier} onChange={setIdentifier} placeholder="e.g. JBD-2026-000101" testId="forgot-identifier" />
          </Field>
          <Btn full onClick={sendCode} disabled={!identifier.trim() || sending} testId="forgot-submit">
            {sending ? "Sending…" : "Send Code"}
          </Btn>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20, lineHeight: 1.5 }}>
            If an account exists for that Member ID or email, a code has been sent. Enter it below along with your new
            password.
          </div>
          <Field label="6-digit code">
            <TextInput value={code} onChange={setCode} placeholder="123456" testId="reset-code" />
          </Field>
          <Field label="New Password"><TextInput value={pw} onChange={setPw} type="password" testId="reset-new-password" /></Field>
          <PasswordStrengthMeter password={pw} />
          <Field label="Confirm New Password"><TextInput value={confirm} onChange={setConfirm} type="password" testId="reset-confirm-password" /></Field>
          {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
          <Btn full onClick={submitCode} disabled={saving} testId="reset-submit">{saving ? "Saving…" : "Set Password"}</Btn>
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <span onClick={sendCode} style={{ fontSize: 12.5, color: C.brand, cursor: "pointer", fontWeight: 600 }}>
              {sending ? "Sending…" : "Resend code"}
            </span>
          </div>
        </>
      )}
      <div style={{ marginTop: 10 }}>
        <Btn full variant="ghost" onClick={onBack}>Back to Sign In</Btn>
      </div>
    </>
  );
}

export function LoginScreen({ ctx, initialMode }) {
  const [mode, setMode] = useState(initialMode || "login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");

  async function handleLogin() {
    const res = await ctx.loginInvestor(identifier.trim(), password);
    if (!res.ok) setErr(res.error);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: C.pageBg, fontFamily: FONT_BODY }}>
      <div style={{ flex: 1, background: "radial-gradient(circle at 18% 12%, " + C.brand + ", " + C.brandDark + " 62%)",
        color: C.white, padding: "56px 48px", display: "flex", flexDirection: "column", justifyContent: "space-between",
        minWidth: 320, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -60, top: -60, width: 280, height: 280, border: "1.5px solid rgba(216,189,130,0.25)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", right: -10, top: 30, width: 180, height: 180, border: "1.5px solid rgba(216,189,130,0.18)", borderRadius: "50%" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
            <Logo size={38} />
            <div style={{ fontFamily: FONT_MONO, fontSize: 13, letterSpacing: 2, color: C.sidebarText }}>JEBBIDOX</div>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 500, lineHeight: 1.22, marginBottom: 18, color: C.white, maxWidth: 440 }}>
            Small, consistent investments build great wealth.
          </div>
          <div style={{ height: 1, width: 64, background: C.gold, margin: "24px 0" }} />
          <div style={{ fontSize: 14, color: C.sidebarText, lineHeight: 1.65, maxWidth: 400 }}>
            A member-owned investment ledger — every deposit, approval, and maturity tracked, verified,
            and explained. Not a balance sheet. A guided investment journey.
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 28, flexWrap: "wrap" }}>
          {[["30%", "Standard package return"], ["40%", "Corporate package return"], ["12 months", "Investment period"]].map((s) => (
            <div key={s[0]}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 600, color: C.white }}>{s[0]}</div>
              <div style={{ fontSize: 12.5, color: C.sidebarText, marginTop: 2 }}>{s[1]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32, minWidth: 320 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {mode === "login" ? (
            <>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 2, color: C.inkFaint, marginBottom: 10 }}>MEMBER SIGN IN</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 600, color: C.ink, marginBottom: 26 }}>Welcome back.</div>

              <Field label="Member ID, username, or email">
                <TextInput value={identifier} onChange={setIdentifier} placeholder="e.g. JBD-2026-000101" testId="login-identifier" />
              </Field>
              <Field label="Password">
                <div style={{ position: "relative" }}>
                  <TextInput value={password} onChange={setPassword} placeholder="Enter password" type={showPw ? "text" : "password"} testId="login-password" />
                  <div onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 13, top: 12, cursor: "pointer", color: C.inkFaint }}>
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </div>
                </div>
              </Field>
              <div style={{ textAlign: "right", marginBottom: 14, marginTop: -8 }}>
                <span onClick={() => setMode("forgot")} data-testid="forgot-password-link" style={{ fontSize: 12.5, color: C.brand, cursor: "pointer", fontWeight: 600 }}>
                  Forgot your password?
                </span>
              </div>
              {err ? <div data-testid="login-error" style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
              <Btn full size="lg" onClick={handleLogin} testId="login-submit">Sign In</Btn>
              <div style={{ textAlign: "center", margin: "18px 0", fontSize: 13, color: C.inkFaint }}>New to Jebbidox?</div>
              <Btn full variant="outline" onClick={() => setMode("register")}>Create an Investor Account</Btn>

              {process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCHER === "true" ? (
                <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid " + C.line }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>
                    Quick Demo Access
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Btn variant="dark" icon={ShieldCheck} onClick={ctx.quickLoginAdmin}>Continue as Super Admin</Btn>
                    <Btn variant="subtle" icon={UserCog} onClick={ctx.quickLoginFO}>Continue as Finance Officer</Btn>
                  </div>
                </div>
              ) : null}
            </>
          ) : mode === "forgot" ? (
            <ForgotPasswordForm ctx={ctx} onBack={() => setMode("login")} onDone={() => setMode("login")} />
          ) : mode === "reset" ? (
            <ResetPasswordForm ctx={ctx} onDone={() => setMode("login")} />
          ) : (
            <RegisterWizard ctx={ctx} onBackToLogin={() => setMode("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
