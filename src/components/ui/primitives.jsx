import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, RefreshCw, Sparkles, User, X } from "@/components/icons/index";
import { clampPct, initials } from "@/lib/format";
import { C, FONT_BODY, FONT_DISPLAY, FONT_MONO } from "@/lib/theme";

/**
 * Inline spinner for any in-progress action — reuses the `jbd-spin` keyframe
 * already defined globally (app/globals.css) rather than a one-off animation.
 */
export function Spinner({ size = 14, color }) {
  return <RefreshCw size={size} color={color} style={{ animation: "jbd-spin 0.8s linear infinite" }} />;
}

/**
 * `loading`: shows a spinner in place of the normal icon, forces the
 * not-allowed/disabled visual state regardless of `disabled`, and blocks the
 * click handler — the single place every "this can take a few seconds"
 * action in the app should signal that, instead of each screen inventing its
 * own text-only busy state. Callers still control the label text (e.g.
 * `{busy ? "Validating…" : "Continue to Review"}`) since only they know what
 * the operation actually is; this only owns the visual "something is
 * happening" signal.
 */
export function Btn({ children, onClick, variant, size, icon: Icon, full, disabled, loading, type, testId }) {
  const isDisabled = disabled || loading;
  const base = {
    border: "1px solid transparent", borderRadius: 8, cursor: isDisabled ? "not-allowed" : "pointer",
    fontFamily: FONT_BODY, fontWeight: 600, display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 8, transition: "background 0.15s, opacity 0.15s, border-color 0.15s",
    opacity: isDisabled ? 0.55 : 1, width: full ? "100%" : "auto", whiteSpace: "nowrap",
  };
  const sizes = {
    sm: { padding: "6px 12px", fontSize: 13 },
    md: { padding: "10px 16px", fontSize: 14 },
    lg: { padding: "13px 20px", fontSize: 15 },
  };
  const variants = {
    primary: { background: C.brand, color: C.white },
    dark: { background: C.sidebarBg, color: C.white },
    outline: { background: "transparent", color: C.brand, border: "1.5px solid " + C.brand },
    ghost: { background: "transparent", color: C.inkSoft, border: "1px solid " + C.line },
    success: { background: C.success, color: C.white },
    danger: { background: C.danger, color: C.white },
    subtle: { background: C.warningBg, color: C.brand, border: "1px solid " + C.goldLine },
  };
  const v = variants[variant || "primary"];
  const s = sizes[size || "md"];
  return (
    <button type={type || "button"} disabled={isDisabled} onClick={isDisabled ? undefined : onClick} data-testid={testId}
      style={Object.assign({}, base, s, v)}>
      {loading ? <Spinner size={s.fontSize + 2} color={v.color} /> : Icon ? <Icon size={s.fontSize + 2} /> : null}
      {children}
    </button>
  );
}

export function Card({ children, style, padded }) {
  const s = { background: C.surface, border: "1px solid " + C.line, borderRadius: 8, padding: padded === false ? 0 : 20, boxShadow: C.shadowCard };
  return <div style={Object.assign({}, s, style || {})}>{children}</div>;
}

/**
 * Standard "something is happening" state for a whole card/section — a
 * spinner plus an indeterminate progress bar (we never know a real %
 * complete for these operations), so users get continuous visual feedback
 * instead of a static "Loading…" card that looks identical whether it's
 * frozen or working.
 */
export function LoadingState({ label = "Loading…", compact }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: compact ? "10px 4px" : "28px 4px" }}>
      <Spinner size={compact ? 18 : 24} color={C.brand} />
      <div style={{ fontSize: 12.5, color: C.inkSoft }}>{label}</div>
      <div style={{ position: "relative", width: "100%", maxWidth: 220, height: 4, borderRadius: 100, background: C.cardBg, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, background: C.brand, borderRadius: 100, animation: "jbd-progress-indeterminate 1.4s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

export function Badge({ children, tone }) {
  const tones = {
    success: { bg: C.successBg, fg: C.success },
    warning: { bg: C.warningBg, fg: C.warningText },
    danger: { bg: C.dangerBg, fg: C.danger },
    info: { bg: C.infoBg, fg: C.info },
    neutral: { bg: C.cardBg, fg: C.inkSoft },
  };
  const t = tones[tone || "neutral"];
  return (
    <span style={{ background: t.bg, color: t.fg, fontSize: 11.5, fontWeight: 700, padding: "4px 11px",
      borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 5, letterSpacing: 0.2 }}>
      {children}
    </span>
  );
}

export function statusBadge(status) {
  const map = {
    active: { label: "Active", tone: "success" },
    pending_verification: { label: "Pending Verification", tone: "warning" },
    rejected: { label: "Rejected", tone: "danger" },
    matured: { label: "Matured", tone: "info" },
    withdrawn: { label: "Withdrawn", tone: "neutral" },
    pending: { label: "Pending", tone: "warning" },
    approved: { label: "Approved", tone: "success" },
    paid: { label: "Paid", tone: "success" },
  };
  const m = map[status] || { label: status, tone: "neutral" };
  return <Badge tone={m.tone}>● {m.label}</Badge>;
}

export function Field({ label, children, hint, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label ? <div style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div> : null}
      {children}
      {hint && !error ? <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 5 }}>{hint}</div> : null}
      {error ? <div style={{ fontSize: 12, color: C.danger, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
        <AlertCircle size={13} />{error}</div> : null}
    </div>
  );
}

export const inputStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 8, border: "1px solid " + C.line,
  fontSize: 14, fontFamily: FONT_BODY, color: C.ink, background: C.surface, boxSizing: "border-box",
};

export function TextInput(props) {
  const { value, onChange, placeholder, type, errorState, testId } = props;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  if (!isPassword) {
    return (
      <input
        type={type || "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        style={Object.assign({}, inputStyle, errorState ? { border: "1px solid " + C.danger } : {})}
      />
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        type={revealed ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        style={Object.assign({}, inputStyle, { paddingRight: 42 }, errorState ? { border: "1px solid " + C.danger } : {})}
      />
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        tabIndex={-1}
        style={{
          position: "absolute", top: "50%", right: 4, transform: "translateY(-50%)",
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: C.inkFaint,
        }}
      >
        {revealed ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={Object.assign({}, inputStyle, { cursor: "pointer" })}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (typeof o === "string"
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function TextArea({ value, onChange, placeholder, rows }) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows || 3}
      style={Object.assign({}, inputStyle, { resize: "vertical", fontFamily: FONT_BODY })} />
  );
}

export function Toggle({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 44, height: 24, borderRadius: 100, background: on ? C.brand : C.line, cursor: "pointer",
      position: "relative", transition: "background 0.15s", flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: C.white, position: "absolute", top: 3,
        left: on ? 23 : 3, transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
      }} />
    </div>
  );
}

export function GuidanceBanner({ children, tone, icon: Icon }) {
  const tones = {
    info: { bg: C.infoBg, fg: C.ink, border: C.line },
    warning: { bg: C.warningBg, fg: C.warningText, border: C.goldLine },
    success: { bg: C.successBg, fg: C.success, border: C.line },
  };
  const t = tones[tone || "info"];
  const Ic = Icon || Sparkles;
  return (
    <div style={{ background: t.bg, border: "1px solid " + t.border, borderRadius: 8, padding: "12px 14px",
      display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: t.fg, lineHeight: 1.45, marginBottom: 16 }}>
      <Ic size={17} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, sub, tone }) {
  return (
    <div style={{ background: C.surface, border: "1px solid " + C.line, borderRadius: 8, padding: 18, flex: 1, minWidth: 180, boxShadow: C.shadowCard }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 600, color: C.inkFaint, textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
        {Icon ? <div style={{ width: 28, height: 28, borderRadius: 8, background: C.dangerBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand }}>
          <Icon size={15} /></div> : null}
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.ink, letterSpacing: 0.2, animation: "jbd-count-fade 0.3s ease" }}>{value}</div>
      {sub ? <div style={{ fontSize: 12, color: tone === "danger" ? C.danger : tone === "success" ? C.success : C.inkFaint, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

export function Modal({ title, onClose, children, width }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,12,8,0.6)", zIndex: 500, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.surface, borderRadius: 10, width: width || 480, maxWidth: "100%", maxHeight: "88vh",
        overflowY: "auto", boxShadow: C.shadowModal, border: "1px solid " + C.line,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px",
          borderBottom: "1px solid " + C.line, position: "sticky", top: 0, background: C.surface, borderRadius: "10px 10px 0 0" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: C.ink }}>{title}</div>
          <div onClick={onClose} style={{ cursor: "pointer", color: C.inkFaint, padding: 4 }}><X size={20} /></div>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ pct, tone }) {
  const color = tone === "warning" ? C.warning : tone === "danger" ? C.danger : C.gold;
  return (
    <div style={{ width: "100%", height: 8, borderRadius: 100, background: C.cardBg, overflow: "hidden", border: "1px solid " + C.line }}>
      <div style={{ height: "100%", width: clampPct(pct) + "%", background: color, borderRadius: 100, transition: "width 0.4s ease" }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: C.inkSoft }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.cardBg, border: "1px solid " + C.line, display: "flex", alignItems: "center",
        justifyContent: "center", margin: "0 auto 16px", color: C.brand }}>
        <Icon size={26} />
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, color: C.ink, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13.5, marginBottom: 18, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>{body}</div>
      {action}
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  const tones = { success: { bg: C.success, Ic: CheckCircle2 }, error: { bg: C.danger, Ic: AlertCircle }, info: { bg: C.sidebarBg, Ic: Sparkles } };
  const t = tones[toast.type || "success"];
  return (
    <div style={{ position: "fixed", bottom: 22, right: 22, zIndex: 700, background: t.bg, color: C.white,
      padding: "13px 18px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, boxShadow: C.shadowModal,
      fontSize: 14, fontWeight: 600, maxWidth: 360, border: "1px solid rgba(255,255,255,0.1)" }}>
      <t.Ic size={18} />{toast.message}
    </div>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 23, fontWeight: 600, color: C.ink }}>{children}</div>
      {sub ? <div style={{ fontSize: 13.5, color: C.inkSoft, marginTop: 4 }}>{sub}</div> : null}
    </div>
  );
}

export function Avatar({ name, size }) {
  const s = size || 36;
  return (
    <div style={{ width: s, height: s, borderRadius: "50%", background: C.brand, color: C.white,
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: s * 0.36,
      flexShrink: 0, fontFamily: FONT_BODY }}>
      {initials(name) || <User size={s * 0.5} />}
    </div>
  );
}

export function Th({ children }) {
  return <th style={{ textAlign: "left", padding: "10px 14px", fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 600, color: C.inkFaint,
    textTransform: "uppercase", letterSpacing: 0.8, borderBottom: "1.5px solid " + C.ink, whiteSpace: "nowrap" }}>{children}</th>;
}

export function Td({ children, style }) {
  return <td className="jbd-ledger-row" style={Object.assign({ padding: "13px 14px", fontSize: 13.5, color: C.ink, verticalAlign: "middle" }, style || {})}>{children}</td>;
}

export function TableWrap({ children }) {
  return <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid " + C.line, background: C.surface }}>
    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>{children}</table>
  </div>;
}
