import React from "react";
import { CORPORATE_THRESHOLD, RATES } from "@/lib/constants";

/**
 * The ACTUAL current date, as an ISO "YYYY-MM-DD" string — matches how Postgres
 * `date` columns come back from Supabase, so it can be compared directly against
 * real fields like maturity_date without any Date-object coercion surprises.
 *
 * Deliberately separate from TODAY (lib/constants.js), which is a frozen demo
 * constant (June 30, 2026) used only for generating consistent-looking mock seed
 * data. Anywhere comparing against a REAL date from Supabase must use this instead
 * of TODAY — using the frozen constant there would silently drift wrong every day
 * that passes without someone remembering to edit it.
 */
export function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function fmtUGX(n) {
  const v = Math.round(Number(n) || 0);
  return "UGX " + v.toLocaleString("en-UG");
}

export function fmtDate(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function fmtDateTime(d) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) + ", " +
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function daysBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function clampPct(n) {
  return Math.max(0, Math.min(100, n));
}

export function packageForAmount(amount) {
  return amount >= CORPORATE_THRESHOLD ? "corporate" : "standard";
}

export function expectedReturn(amount, pkg) {
  return amount * RATES[pkg];
}

export function maturityValue(amount, pkg) {
  return amount + expectedReturn(amount, pkg);
}

export function isEarlyWithdrawal(maturityDate) {
  // This determines whether the 15% early-withdrawal penalty applies — it MUST
  // compare against the real current date. It previously compared against the
  // frozen TODAY demo constant (June 30, 2026), which meant every position
  // maturing between that frozen date and whenever this actually runs would be
  // judged "early" (and penalized) even after it had genuinely matured. Real
  // money impact, not cosmetic — see lib/constants.js for why TODAY exists at
  // all (seed/demo data generation only, never a real date comparison).
  return new Date() < new Date(maturityDate);
}

export function pad(n, len) {
  return String(n).padStart(len, "0");
}

export function initials(name) {
  return (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
