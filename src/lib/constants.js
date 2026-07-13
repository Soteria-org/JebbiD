import React from "react";
import { ArrowUpRight, Award, BarChart2, Bell, Briefcase, ClipboardList, FileText, Home, SettingsIcon, TrendingUp, User, Users, Wallet } from "@/components/icons/index";

export const RATES = { standard: 0.30, corporate: 0.40 };

// ⚠️ TEMPORARY TESTING VALUE — DO NOT SHIP TO PRODUCTION LIKE THIS.
// Real value is 100000 (matches investment_packages.min_amount for the Standard
// package, which was ALSO temporarily lowered to 1000 in the live DB via a direct
// execute_sql update — see chat history, not a migration file, specifically so it
// doesn't get mistaken for permanent schema). Both this constant and that DB row
// must be reset together before real investor money moves through this app:
//   UPDATE investment_packages SET min_amount = 100000 WHERE code = 'standard';
// and change the line below back to 100000.
export const MIN_INVESTMENT = 1000;

export const CORPORATE_THRESHOLD = 1000000;

export const PERIOD_MONTHS = 12;

export const PENALTY_RATE = 0.15;

export const TODAY = new Date(2026, 5, 30); // fixed demo "today" — June 30, 2026

export const GOALS = ["Buy Land", "Build a Home", "Education", "Business Growth", "Retirement", "Emergency Fund", "Other"];

export const NAV = {
  investor: [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "invest", label: "New Investment", icon: TrendingUp },
    { key: "investments", label: "My Investments", icon: Briefcase },
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
    { key: "reports", label: "Reports", icon: BarChart2 },
    { key: "auditlogs", label: "Audit Logs", icon: ClipboardList },
  ],
  super_admin: [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "investors", label: "Investors", icon: Users },
    { key: "allinvestments", label: "All Investments", icon: Briefcase },
    { key: "deposits", label: "Deposits", icon: Wallet },
    { key: "withdrawals", label: "Withdrawals", icon: ArrowUpRight },
    { key: "reports", label: "Reports", icon: BarChart2 },
    { key: "auditlogs", label: "Audit Logs", icon: ClipboardList },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ],
};

export const ROLE_LABEL = { investor: "Investor", finance_officer: "Finance Officer", super_admin: "Super Administrator" };
