import React from "react";

/**
 * Every value here is a CSS custom property, not a literal color. The
 * properties themselves are defined twice in app/globals.css — once under
 * :root (light) and once under :root[data-theme="dark"] — so flipping the
 * `data-theme` attribute on <html> (see src/lib/useDarkMode.js) re-themes
 * every screen in the app without any component needing to know which mode
 * is active. Key names are unchanged from the original palette so none of
 * the ~40 files that already do `C.brand`, `C.pageBg`, etc. needed to change.
 */
export const C = {
  sidebarBg: "var(--sidebar-bg)",
  sidebarActive: "var(--sidebar-active-bg)",
  sidebarActiveText: "var(--sidebar-active-fg)",
  sidebarHover: "var(--sidebar-hover)",
  sidebarText: "var(--sidebar-text)",
  sidebarTextDim: "var(--sidebar-text-dim)",

  brand: "var(--garnet)",
  brandDark: "var(--garnet-deep)",

  cardBg: "var(--paper-soft)",
  cardBorder: "var(--line-soft)",
  // `white` stays LITERALLY white in both themes — every existing usage in
  // features/* is `color: C.white` (button/badge/avatar text sitting on a
  // brand-colored or always-dark background), which must not go dark-brown
  // in dark mode. Anything that instead wants an elevated PANEL surface
  // (cards, inputs, modals, dropdowns — which do need to go dark) uses the
  // separate `surface` token below.
  white: "#ffffff",
  surface: "var(--surface-raised)",
  pageBg: "var(--paper)",

  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  inkFaint: "var(--ink-faint)",
  line: "var(--line)",

  success: "var(--sage)",
  successBg: "var(--sage-soft)",
  warning: "var(--gold)",
  warningBg: "var(--gold-soft)",
  warningText: "var(--warning-text)",
  danger: "var(--garnet)",
  dangerBg: "var(--garnet-soft)",
  info: "var(--ink-soft)",
  infoBg: "var(--line-soft)",

  gold: "var(--gold)",
  goldLine: "var(--gold-line)",
  shadowCard: "var(--shadow-card)",
  shadowModal: "var(--shadow-modal)",
};

// Poppins is Jebbidox's one brand font, used platform-wide — display and body
// share the same family (weight does the differentiating, not a serif pairing).
export const FONT_DISPLAY = "'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const FONT_BODY = "'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
// Kept monospace deliberately — reference numbers and ledger figures (e.g.
// JBD-2026-000123) rely on tabular, fixed-width digits, which is a functional
// need distinct from the brand's display/body typeface.
export const FONT_MONO = "'IBM Plex Mono','SFMono-Regular',Consolas,monospace";
