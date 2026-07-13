import React, { useState } from "react";
import { Eye, EyeOff, ShieldCheck, TrendingUp, UserCog } from "@/components/icons/index";
import { Btn, Field, TextInput } from "@/components/ui/primitives";
import { RegisterWizard } from "@/features/auth/RegisterWizard";
import { C, FONT_BODY, FONT_DISPLAY } from "@/lib/theme";

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
      <div style={{ flex: 1, background: C.sidebarBg, color: C.white, padding: "56px 48px", display: "flex",
        flexDirection: "column", justifyContent: "space-between", minWidth: 320 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={20} color={C.white} />
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, letterSpacing: 0.3 }}>Jebbidox</div>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 600, lineHeight: 1.25, marginBottom: 18, color: C.white }}>
            A guided investment journey, not a balance sheet.
          </div>
          <div style={{ fontSize: 14.5, color: C.sidebarText, lineHeight: 1.65, maxWidth: 420 }}>
            Jebbidox Youth Investment Club helps members build wealth through structured, transparent
            investment packages — with every deposit, approval, and maturity tracked and explained.
          </div>
        </div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
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
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.ink, marginBottom: 6 }}>Welcome back</div>
              <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 26 }}>Sign in to your investor account.</div>

              <Field label="Member ID, username, or email">
                <TextInput value={identifier} onChange={setIdentifier} placeholder="e.g. JBD-2026-000101" />
              </Field>
              <Field label="Password">
                <div style={{ position: "relative" }}>
                  <TextInput value={password} onChange={setPassword} placeholder="Enter password" type={showPw ? "text" : "password"} />
                  <div onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 13, top: 12, cursor: "pointer", color: C.inkFaint }}>
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </div>
                </div>
              </Field>
              {err ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
              <Btn full size="lg" onClick={handleLogin}>Sign In</Btn>
              <div style={{ fontSize: 12.5, color: C.inkFaint, marginTop: 10, lineHeight: 1.5 }}>
                Demo investor: JBD-2026-000101 / password123
              </div>
              <div style={{ textAlign: "center", margin: "18px 0", fontSize: 13, color: C.inkFaint }}>New to Jebbidox?</div>
              <Btn full variant="outline" onClick={() => setMode("register")}>Create an Investor Account</Btn>

              <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid " + C.line }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkFaint, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>
                  Quick Demo Access
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Btn variant="dark" icon={ShieldCheck} onClick={ctx.quickLoginAdmin}>Continue as Super Admin</Btn>
                  <Btn variant="subtle" icon={UserCog} onClick={ctx.quickLoginFO}>Continue as Finance Officer</Btn>
                </div>
              </div>
            </>
          ) : (
            <RegisterWizard ctx={ctx} onBackToLogin={() => setMode("login")} />
          )}
        </div>
      </div>
    </div>
  );
}
