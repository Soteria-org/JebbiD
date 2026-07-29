import React from "react";
import { Check, X } from "@/components/icons/index";
import { checkPasswordStrength, passwordStrengthScore, PASSWORD_REQUIREMENTS } from "@/lib/password-policy";
import { C } from "@/lib/theme";

/**
 * Drop this under any password TextInput. Give it the live value and it shows a
 * strength bar plus a real-time checklist — the same PASSWORD_REQUIREMENTS the
 * server actually enforces (src/lib/password-policy.js), so this can never promise
 * "strong enough" and then have the server reject it anyway.
 *
 * Purely a feedback UI — it does not decide whether the surrounding form can
 * submit. Callers should check `checkPasswordStrength(password).valid` themselves
 * before enabling their submit button (see RegisterWizard / ForcedPasswordChange /
 * ProfileScreen / AdminSettings for the pattern).
 */
export function PasswordStrengthMeter({ password }) {
  const pw = password || "";
  const { results } = checkPasswordStrength(pw);
  const score = passwordStrengthScore(pw);
  const barColor = score <= 2 ? C.danger : score <= 4 ? C.warning : C.success;
  const label = pw.length === 0 ? "" : score <= 2 ? "Weak" : score <= 4 ? "Almost there" : "Strong";

  return (
    <div style={{ marginTop: 8, marginBottom: 14 }}>
      {pw.length > 0 ? (
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {PASSWORD_REQUIREMENTS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i < score ? barColor : C.line,
              transition: "background 0.15s",
            }} />
          ))}
        </div>
      ) : null}
      {label ? (
        <div style={{ fontSize: 12, fontWeight: 700, color: barColor, marginBottom: 6 }}>{label}</div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px" }}>
        {results.map((r) => (
          <div key={r.key} data-testid={"pw-req-" + r.key} data-passed={r.passed} style={{
            display: "flex", alignItems: "center", gap: 5, fontSize: 11.5,
            color: pw.length === 0 ? C.inkFaint : r.passed ? C.success : C.inkFaint,
          }}>
            {pw.length > 0 && r.passed ? <Check size={12} /> : <X size={12} style={{ opacity: pw.length === 0 ? 0.3 : 0.5 }} />}
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}
