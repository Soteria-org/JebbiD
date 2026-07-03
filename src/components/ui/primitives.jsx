import React from "react";
import { AlertCircle, CheckCircle2, Sparkles, User, X } from "@/components/icons/index";
import { clampPct, initials } from "@/lib/format";
import { C, FONT_BODY, FONT_DISPLAY } from "@/lib/theme";

export function Btn({ children, onClick, variant, size, icon: Icon, full, disabled, type }) {
  const base = {
    border: "1px solid transparent", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: FONT_BODY, fontWeight: 600, display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 8, transition: "background 0.15s, opacity 0.15s",
    opacity: disabled ? 0.55 : 1, width: full ? "100%" : "auto", whiteSpace: "nowrap",
  };
  const sizes = {
    sm: { padding: "6px 12px", fontSize: 13 },
    md: { padding: "10px 16px", fontSize: 14 },
    lg: { padding: "13px 20px", fontSize: 15 },
  };
  const variants = {
    primary: { background: C.brand, color: C.white },
    dark: { background: C.sidebarBg, color: C.white },
    outline: { background: C.white, color: C.brand, border: "1px solid " + C.brand },
    ghost: { background: "transparent", color: C.inkSoft, border: "1px solid " + C.line },
    success: { background: C.success, color: C.white },
    danger: { background: C.danger, color: C.white },
    subtle: { background: C.cardBg, color: C.brand, border: "1px solid " + C.cardBorder },
  };
  const v = variants[variant || "primary"];
  const s = sizes[size || "md"];
  return (
    <button type={type || "button"} disabled={disabled} onClick={disabled ? undefined : onClick}
      style={Object.assign({}, base, s, v)}>
      {Icon ? <Icon size={s.fontSize + 2} /> : null}
      {children}
    </button>
  );
}

export function Card({ children, style, padded }) {
  const s = { background: C.white, border: "1px solid " + C.line, borderRadius: 14, padding: padded === false ? 0 : 20 };
  return <div style={Object.assign({}, s, style || {})}>{children}</div>;
}

export function Badge({ children, tone }) {
  const tones = {
    success: { bg: C.successBg, fg: C.success },
    warning: { bg: C.warningBg, fg: C.warning },
    danger: { bg: C.dangerBg, fg: C.danger },
    info: { bg: C.infoBg, fg: C.info },
    neutral: { bg: C.cardBg, fg: C.inkSoft },
  };
  const t = tones[tone || "neutral"];
  return (
    <span style={{ background: t.bg, color: t.fg, fontSize: 12, fontWeight: 700, padding: "3px 10px",
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
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function Field({ label, children, hint, error }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label ? <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 6 }}>{label}</div> : null}
      {children}
      {hint && !error ? <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 5 }}>{hint}</div> : null}
      {error ? <div style={{ fontSize: 12, color: C.danger, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
        <AlertCircle size={13} />{error}</div> : null}
    </div>
  );
}

export const inputStyle = {
  width: "100%", padding: "11px 13px", borderRadius: 9, border: "1px solid " + C.line,
  fontSize: 14, fontFamily: FONT_BODY, color: C.ink, background: C.white, boxSizing: "border-box",
};

export function TextInput(props) {
  const { value, onChange, placeholder, type, errorState } = props;
  return (
    <input
      type={type || "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={Object.assign({}, inputStyle, errorState ? { border: "1px solid " + C.danger } : {})}
    />
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
    info: { bg: C.infoBg, fg: C.info, border: "#CFE0EE" },
    warning: { bg: C.warningBg, fg: C.warning, border: "#F0DDB3" },
    success: { bg: C.successBg, fg: C.success, border: "#C8E8D2" },
  };
  const t = tones[tone || "info"];
  const Ic = Icon || Sparkles;
  return (
    <div style={{ background: t.bg, border: "1px solid " + t.border, borderRadius: 10, padding: "12px 14px",
      display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: t.fg, lineHeight: 1.45, marginBottom: 16 }}>
      <Ic size={17} style={{ flexShrink: 0, marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, sub, tone }) {
  return (
    <div style={{ background: C.cardBg, border: "1px solid " + C.cardBorder, borderRadius: 14, padding: 18, flex: 1, minWidth: 180 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.inkSoft, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
        {Icon ? <div style={{ width: 30, height: 30, borderRadius: 9, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand }}>
          <Icon size={16} /></div> : null}
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 25, fontWeight: 600, color: C.ink, letterSpacing: 0.2 }}>{value}</div>
      {sub ? <div style={{ fontSize: 12.5, color: tone === "danger" ? C.danger : tone === "success" ? C.success : C.inkFaint, marginTop: 5 }}>{sub}</div> : null}
    </div>
  );
}

export function Modal({ title, onClose, children, width }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,8,8,0.55)", zIndex: 500, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: C.white, borderRadius: 16, width: width || 480, maxWidth: "100%", maxHeight: "88vh",
        overflowY: "auto", boxShadow: "0 20px 60px rgba(27,8,8,0.35)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px",
          borderBottom: "1px solid " + C.line, position: "sticky", top: 0, background: C.white, borderRadius: "16px 16px 0 0" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: C.ink }}>{title}</div>
          <div onClick={onClose} style={{ cursor: "pointer", color: C.inkFaint, padding: 4 }}><X size={20} /></div>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ pct, tone }) {
  const color = tone === "warning" ? C.warning : tone === "danger" ? C.danger : C.brand;
  return (
    <div style={{ width: "100%", height: 8, borderRadius: 100, background: C.cardBg, overflow: "hidden" }}>
      <div style={{ height: "100%", width: clampPct(pct) + "%", background: color, borderRadius: 100, transition: "width 0.3s" }} />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: C.inkSoft }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: C.cardBg, display: "flex", alignItems: "center",
        justifyContent: "center", margin: "0 auto 16px", color: C.brand }}>
        <Icon size={26} />
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 6 }}>{title}</div>
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
      padding: "13px 18px", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontSize: 14, fontWeight: 600, maxWidth: 360 }}>
      <t.Ic size={18} />{toast.message}
    </div>
  );
}

export function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.ink }}>{children}</div>
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
  return <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11.5, fontWeight: 700, color: C.inkFaint,
    textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid " + C.line, whiteSpace: "nowrap" }}>{children}</th>;
}

export function Td({ children, style }) {
  return <td style={Object.assign({ padding: "13px 14px", fontSize: 13.5, color: C.ink, borderBottom: "1px solid " + C.line, verticalAlign: "middle" }, style || {})}>{children}</td>;
}

export function TableWrap({ children }) {
  return <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid " + C.line }}>
    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>{children}</table>
  </div>;
}
