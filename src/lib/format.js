import React from "react";
import { CORPORATE_THRESHOLD, RATES, TODAY } from "@/lib/constants";

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
  return TODAY < new Date(maturityDate);
}

export function pad(n, len) {
  return String(n).padStart(len, "0");
}

export function initials(name) {
  return (name || "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
