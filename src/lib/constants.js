import React from "react";
import { AlertTriangle, ArrowUpRight, Award, BarChart2, Bell, Briefcase, ClipboardList, FileText, Home, SettingsIcon, TrendingUp, User, Users, Wallet } from "@/components/icons/index";

// Shown to users on account/setup failures where self-service can't resolve it
// (e.g. login()'s orphaned-account self-heal failing) and in the public error
// page. Matches the contact address already published in the landing page
// footer (app/page.js) — reuse that one address everywhere rather than
// introducing a second, unmonitored-looking address.
export const SUPPORT_EMAIL = "zeal247invest@gmail.com";

export const RATES = { standard: 0.30, corporate: 0.40 };

export const MIN_INVESTMENT = 100000;

export const CORPORATE_THRESHOLD = 1000000;

export const PERIOD_MONTHS = 12;

export const PENALTY_RATE = 0.15;

export const TODAY = new Date(2026, 5, 30); // fixed demo "today" — June 30, 2026

export const GOALS = ["Buy Land", "Build a Home", "Education", "Business Growth", "Retirement", "Emergency Fund", "Other"];

export const NAV = {
  investor: [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "invest", label: "New Investment", icon: TrendingUp },
    { key: "transactions", label: "Transactions", icon: ClipboardList },
    { key: "withdrawals", label: "Withdrawals", icon: ArrowUpRight },
    { key: "maturity", label: "Maturity Centre", icon: Award },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "statements", label: "Statements", icon: FileText },
    { key: "profile", label: "Profile & Settings", icon: User },
  ],
  finance_officer: [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "investors", label: "Investors", icon: Users },
    { key: "deposits", label: "Deposits", icon: Wallet },
    { key: "withdrawals", label: "Withdrawals", icon: ArrowUpRight },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "reports", label: "Reports", icon: BarChart2 },
    { key: "auditlogs", label: "Audit Logs", icon: ClipboardList },
  ],
  super_admin: [
    { key: "dashboard", label: "Club Intelligence Centre", icon: Home },
    { key: "risk", label: "Risk & Compliance", icon: AlertTriangle },
    { key: "investors", label: "Investors", icon: Users },
    { key: "allinvestments", label: "All Investments", icon: Briefcase },
    { key: "deposits", label: "Deposits", icon: Wallet },
    { key: "withdrawals", label: "Withdrawals", icon: ArrowUpRight },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "reports", label: "Reports", icon: BarChart2 },
    { key: "auditlogs", label: "Audit Logs", icon: ClipboardList },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ],
};

export const ROLE_LABEL = { investor: "Investor", finance_officer: "Finance Officer", super_admin: "Super Administrator" };
