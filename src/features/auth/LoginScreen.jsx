import React, { useState } from "react";
import { Eye, EyeOff, ShieldCheck, UserCog } from "@/components/icons/index";
import { Btn, Field, TextInput } from "@/components/ui/primitives";
import { Logo } from "@/components/ui/Logo";
import { RegisterWizard } from "@/features/auth/RegisterWizard";
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

export function LoginScreen({ ctx }) {
  const [mode, setMode] = useState("login");
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
          {[["30%", "Standard package return"], ["40%", "Corporate package return"], ["12mo", "Investment period"]].map((s) => (
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
          ) : (
            <RegisterWizard ctx={ctx} onBackToLogin={() => setMode("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
