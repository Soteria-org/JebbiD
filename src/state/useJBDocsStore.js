"use client";
import { useEffect, useRef, useState } from "react";
import { buildSeed } from "@/lib/seedData";
import { TODAY } from "@/lib/constants";
import { fmtUGX, pad } from "@/lib/format";
import {
  login as loginAction,
  logout as logoutAction,
  registerInvestor as registerInvestorAction,
  createStaffOrInvestorAccount as createStaffOrInvestorAccountAction,
  completeForcedPasswordChange as completeForcedPasswordChangeAction,
} from "@/lib/actions/auth-actions";
import {
  loadPackages as loadPackagesAction,
  submitDeposit as submitDepositAction,
  approveDeposit as approveDepositAction,
  rejectDeposit as rejectDepositAction,
  requestClarification as requestClarificationAction,
  loadDepositsQueue as loadDepositsQueueAction,
} from "@/lib/actions/deposit-actions";
import {
  loadMyInvestmentsView as loadMyInvestmentsViewAction,
  loadAllInvestmentsView as loadAllInvestmentsViewAction,
} from "@/lib/actions/investment-actions";
import {
  requestWithdrawal as requestWithdrawalAction,
  loadWithdrawalsQueue as loadWithdrawalsQueueAction,
  loadMyWithdrawals as loadMyWithdrawalsAction,
  rejectWithdrawal as rejectWithdrawalAction,
  markWithdrawalPaid as markWithdrawalPaidAction,
} from "@/lib/actions/withdrawal-actions";
import { chooseMaturityAction } from "@/lib/actions/maturity-actions";

/**
 * useJBDocsStore
 * ----------------------------------------------------------------
 * Single in-memory data + business-logic layer for the JBDocs demo.
 * Everything in this file is a mock of what will eventually become
 * Supabase-backed calls (auth, deposits, withdrawals, investments,
 * finance officer management, audit log, notifications).
 *
 * IMPORTANT FOR BACKEND INTEGRATION:
 * The *shape* of the object this hook returns ("ctx") is the contract
 * the whole UI is built against. When wiring up Supabase, the goal is
 * to keep this same shape (same field names / function signatures)
 * but swap the internals (useState -> Supabase queries/mutations,
 * useEffect -> Supabase realtime subscriptions, etc). Screens should
 * not need to change.
 * ----------------------------------------------------------------
 */
export default function useJBDocsStore() {
  const seedRef = useRef(buildSeed());
  const seed = seedRef.current;
  const counters = useRef({ pos: 8, wd: 1, fo: 2, audit: 7, notif: 8, member: 106 });

  const [investors, setInvestors] = useState(seed.investors);
  const [investments, setInvestments] = useState(seed.investments);
  const [withdrawals, setWithdrawals] = useState(seed.withdrawals);
  const [financeOfficers, setFinanceOfficers] = useState(seed.financeOfficers);
  const [superAdmin, setSuperAdmin] = useState(seed.superAdmin);
  const [auditLog, setAuditLog] = useState(seed.auditLog);
  const [notifications, setNotifications] = useState(seed.notifications);
  const org = seed.org;

  const [session, setSession] = useState(null); // {role, id}
  const [forcedPwSession, setForcedPwSession] = useState(null);
  const [view, setView] = useState("dashboard");
  const [selectedInvestorId, setSelectedInvestorId] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 900 : false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Real data from Supabase — loaded below via useEffect
  const [packages, setPackages] = useState([]);
  const [depositSubmissions, setDepositSubmissions] = useState([]);

  // Load investment packages for all users (InvestWizard needs them)
  const [packagesError, setPackagesError] = useState(null);
  function loadPackages() {
    setPackagesError(null);
    loadPackagesAction().then((result) => {
      if (result.error) { setPackagesError(result.error); return; }
      setPackages(result.packages || []);
    });
  }
  useEffect(() => { loadPackages(); }, []);

  // Load deposits queue for staff whenever their session is established
  useEffect(() => {
    if (!session || session.role === "investor") return;
    loadDepositsQueueAction().then((result) => {
      if (!result.error) setDepositSubmissions(result.deposits);
    });
  }, [session?.role]);

  // Load investments: investor sees their own merged pending+active list; staff see
  // every investor's positions, with each investor bridged into mock state so
  // ctx.getInvestor(id) resolves even for investors who haven't logged in this
  // session (AllInvestments/WithdrawalsQueue depend on that lookup).
  useEffect(() => {
    if (!session) return;
    if (session.role === "investor") {
      loadMyInvestmentsViewAction().then((result) => {
        if (!result.error) setInvestments(result.items);
      });
    } else {
      loadAllInvestmentsViewAction().then((result) => {
        if (result.error) return;
        const seen = new Set();
        result.items.forEach((item) => {
          if (item.investorProfile && !seen.has(item.investorProfile.id)) {
            seen.add(item.investorProfile.id);
            bridgeInvestorProfile(item.investorProfile);
          }
        });
        setInvestments(result.items.map((item) => {
          const { investorProfile, ...rest } = item;
          return rest;
        }));
      });
    }
  }, [session?.role, session?.id]);

  // Load withdrawals the same way — own list for investors, full queue + bridging for staff.
  useEffect(() => {
    if (!session) return;
    if (session.role === "investor") {
      loadMyWithdrawalsAction().then((result) => {
        if (!result.error) setWithdrawals(normalizeWithdrawals(result.withdrawals));
      });
    } else {
      loadWithdrawalsQueueAction().then((result) => {
        if (result.error) return;
        result.withdrawals.forEach((w) => { if (w.investor) bridgeInvestorProfile(w.investor); });
        setWithdrawals(normalizeWithdrawals(result.withdrawals));
      });
    }
  }, [session?.role, session?.id]);

  function normalizeWithdrawals(rows) {
    return rows.map((w) => ({
      id: w.id, referenceNumber: w.reference_number, investmentId: w.investment_id,
      investorId: w.investor?.id ?? session.id,
      amount: w.amount_requested, penalty: w.penalty_amount, netAmount: w.net_amount,
      paymentMethod: w.payment_method, status: w.status, requestedAt: w.created_at,
      transactionRef: null, paidAt: null,
    }));
  }

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth < 900;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true); else setSidebarOpen(false);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function showToast(message, type) {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }
  function goTo(v) { setView(v); }
  function openModal(type, payload) { setActiveModal({ type, payload: payload || {} }); }
  function closeModal() { setActiveModal(null); }

  function getInvestor(id) { return investors.find((i) => i.id === id); }
  function getInvestorInvestments(id) { return investments.filter((p) => p.investorId === id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  function getInvestorWithdrawals(id) { return withdrawals.filter((w) => w.investorId === id).sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)); }

  function addAudit(user, action, prev, next) {
    const id = "AUD-" + pad(counters.current.audit++, 4);
    setAuditLog((l) => [...l, { id, user, action, previousValue: prev, newValue: next, timestamp: TODAY }]);
  }
  function addNotification(investorId, type, message) {
    const id = "NTF-" + pad(counters.current.notif++, 4);
    setNotifications((n) => [...n, { id, investorId, type, message, timestamp: TODAY, read: false }]);
  }

  /**
   * BRIDGE (temporary, remove once investors/investments/etc. are wired to Supabase
   * too): everything except auth is still 100% mock data. Real login now returns a
   * real Supabase UUID that won't exist anywhere in the mock investors/
   * financeOfficers arrays, so every downstream mock function
   * (getInvestor(session.id), dashboards, etc.) would silently break without this.
   * This creates a matching mock-shaped record, keyed on the REAL id, the first time
   * a given real account is seen. It does not persist anything — it's rebuilt each
   * session, same as the rest of the mock state.
   */
  function bridgeInvestorProfile(profile) {
    setInvestors((list) => {
      if (list.find((i) => i.id === profile.id)) return list;
      return [...list, {
        id: profile.id, memberId: profile.member_id, fullName: profile.full_name, email: profile.email,
        phone: profile.phone || "", nationalId: "", address: "", occupation: "", goal: "",
        username: profile.username || profile.email, password: null,
        nextOfKin: { name: "", relationship: "", phone: "", address: "" },
        dateRegistered: TODAY, notifPrefs: { email: true, sms: true }, darkMode: false,
      }];
    });
  }
  function bridgeStaffProfile(profile) {
    if (profile.role === "super_admin") {
      setSuperAdmin((s) => Object.assign({}, s, { id: profile.id, name: profile.full_name, email: profile.email }));
      return;
    }
    setFinanceOfficers((list) => {
      if (list.find((f) => f.id === profile.id)) return list;
      return [...list, {
        id: profile.id, name: profile.full_name, email: profile.email, username: profile.email,
        password: null, mustChangePassword: profile.must_change_password, createdAt: TODAY, createdBy: "System",
      }];
    });
  }
  function bridgeProfile(profile) {
    if (profile.role === "investor") bridgeInvestorProfile(profile);
    else bridgeStaffProfile(profile);
  }

  /* ---------------- AUTH ---------------- */
  /**
   * ⚠️ DEMO-ONLY, NOT WIRED TO SUPABASE, AND DELIBERATELY LEFT THAT WAY.
   * quickLoginAdmin/quickLoginFO/switchToFO/switchToInvestor (used by
   * RoleSwitcher.jsx) let anyone become any role with one click — that's
   * fundamentally incompatible with real authentication. This is a product/security
   * decision, not a coding detail: either remove RoleSwitcher entirely before any
   * real deployment, or gate it behind an explicit dev-only build flag
   * (e.g. NEXT_PUBLIC_ENABLE_DEMO_ROLE_SWITCHER) that is never set in production.
   * Not deciding this silently — flag it back before shipping past a demo.
   */
  function quickLoginAdmin() {
    setSession({ role: "super_admin", id: superAdmin.id });
    setView("dashboard"); setForcedPwSession(null);
  }
  function quickLoginFO() {
    const fo = financeOfficers[0];
    setSession({ role: "finance_officer", id: fo.id });
    setView("dashboard"); setForcedPwSession(null);
  }
  function switchToFO(id) {
    const fo = financeOfficers.find((f) => f.id === id);
    if (fo.mustChangePassword) { setForcedPwSession({ role: "finance_officer", id: fo.id }); return; }
    setSession({ role: "finance_officer", id: fo.id }); setView("dashboard");
  }
  function switchToInvestor(id) {
    setSession({ role: "investor", id }); setView("dashboard");
  }
  async function completeForcedPasswordChange(newPw) {
    const s = forcedPwSession;
    const result = await completeForcedPasswordChangeAction(newPw);
    if (result.error) {
      showToast(result.error, "error");
      return { ok: false, error: result.error };
    }
    // Local bridge state (financeOfficers/investors mock records) mirrors the flag
    // for anywhere the UI still reads it directly, but the source of truth is now
    // `profiles.must_change_password` in Supabase, already cleared by the action above.
    setFinanceOfficers((list) => list.map((f) => f.id === s.id ? Object.assign({}, f, { mustChangePassword: false }) : f));
    setSession(Object.assign({}, s, { mustChangePassword: false }));
    setForcedPwSession(null);
    setView("dashboard");
    showToast("Password set. Welcome to Jebbidox.", "success");
    return { ok: true };
  }
  async function loginInvestor(identifier, password) {
    const result = await loginAction({ identifier, password });
    if (result.error) return { ok: false, error: result.error };

    bridgeProfile(result.profile);

    const nextSession = {
      role: result.profile.role,
      id: result.profile.id,
      fullName: result.profile.full_name,
      memberId: result.profile.member_id,
    };

    if (result.profile.must_change_password) {
      setForcedPwSession(nextSession);
      return { ok: true };
    }

    setSession(nextSession);
    setView("dashboard");
    return { ok: true };
  }
  async function registerInvestor(form) {
    const result = await registerInvestorAction({
      fullName: form.fullName, email: form.email, phone: form.phone, password: form.password,
      username: form.username, nationalIdNumber: form.nationalId, address: form.address, occupation: form.occupation,
      financialGoal: form.goal, nextOfKinName: form.nokName, nextOfKinPhone: form.nokPhone,
      nextOfKinRelationship: form.nokRelationship,
    });

    if (result.error) {
      showToast(result.error, "error");
      return { ok: false, error: result.error };
    }

    if (result.pendingConfirmation) {
      // Email confirmation is ON (the Resend/SMTP path): no session yet, nothing to
      // log into. The investor must click the emailed link before anything else
      // happens — app/auth/confirm/route.js finishes account creation at that point.
      showToast("Check your email to confirm your account before logging in.", "info");
      return { ok: true, pendingConfirmation: true };
    }

    // Email confirmation OFF: signUp() returned an active session immediately, and
    // registerInvestorAction already created profiles/investor_details. Log them in.
    return loginInvestor(form.email, form.password);
  }
  async function logout() {
    await logoutAction();
    setSession(null); setView("dashboard"); setSelectedInvestorId(null);
  }

  /* ---------------- INVESTMENTS ---------------- */
  async function submitInvestment(data) {
    const result = await submitDepositAction({
      packageId: data.packageId,
      amount: data.amount,
      goal: data.goal,
      paymentMethod: data.paymentMethod,
      network: data.network ?? null,
      transactionRef: data.transactionRef ?? null,
      depositorName: data.depositorName ?? null,
      notes: data.notes ?? null,
      proofStoragePath: data.proofStoragePath ?? null,
    });
    if (result.error) { showToast(result.error, "error"); return { ok: false, error: result.error }; }
    // The DB trigger already creates the notification and audit row.
    // Add the new deposit to local state so the investor can see it immediately
    // without a full page reload (it won't have the joined investor/package objects
    // yet, but that's fine — the investor's own view doesn't need those).
    setDepositSubmissions((list) => [result.deposit, ...list]);
    showToast("Investment submitted for verification.", "success");
    setView("investments");
    return { ok: true };
  }

  async function approveDeposit(depositId) {
    const result = await approveDepositAction(depositId);
    if (result.error) { showToast(result.error, "error"); return; }
    // Optimistically update local state so the queue reflects the change immediately
    setDepositSubmissions((list) =>
      list.map((d) => d.id === depositId ? Object.assign({}, d, { status: "approved" }) : d)
    );
    showToast("Deposit approved. Investment position created.", "success");
  }

  async function rejectDeposit(depositId, reason) {
    const result = await rejectDepositAction(depositId, reason);
    if (result.error) { showToast(result.error, "error"); return; }
    setDepositSubmissions((list) =>
      list.map((d) => d.id === depositId ? Object.assign({}, d, { status: "rejected", clarification_note: reason }) : d)
    );
    showToast("Deposit rejected.", "info");
  }

  async function requestClarification(depositId, note) {
    const result = await requestClarificationAction(depositId, note);
    if (result.error) { showToast(result.error, "error"); return; }
    setDepositSubmissions((list) =>
      list.map((d) => d.id === depositId ? Object.assign({}, d, { status: "clarification_requested", clarification_note: note }) : d)
    );
    showToast("Clarification requested. Investor has been notified.", "info");
  }

  /* ---------------- WITHDRAWALS ---------------- */
  async function requestWithdrawal(data) {
    const result = await requestWithdrawalAction({
      investmentId: data.investmentId, amount: data.amount, reason: data.reason,
      paymentMethod: data.paymentMethod, network: data.details?.network,
      bankDetails: data.paymentMethod === "mobile_money"
        ? { phone: data.details?.phone }
        : { bankName: data.details?.bankName, accountName: data.details?.accountName, accountNumber: data.details?.accountNumber },
      comments: data.comments,
    });
    if (result.error) { showToast(result.error, "error"); return; }
    setWithdrawals((list) => [{
      id: result.withdrawal.id, referenceNumber: result.withdrawal.reference_number, investorId: session.id,
      amount: result.withdrawal.amount_requested, penalty: result.withdrawal.penalty_amount,
      netAmount: result.withdrawal.net_amount, paymentMethod: result.withdrawal.payment_method,
      status: result.withdrawal.status, requestedAt: result.withdrawal.created_at, transactionRef: null, paidAt: null,
    }, ...list]);
    showToast("Withdrawal request submitted.", "success");
    closeModal();
    setView("withdrawals");
  }

  async function rejectWithdrawal(wdId, reason) {
    const result = await rejectWithdrawalAction(wdId, reason);
    if (result.error) { showToast(result.error, "error"); return; }
    setWithdrawals((list) => list.map((w) => w.id === wdId ? Object.assign({}, w, { status: "rejected" }) : w));
    showToast("Withdrawal rejected.", "info");
  }

  async function markWithdrawalPaid(wdId, ref, payDate, notes) {
    const result = await markWithdrawalPaidAction({ withdrawalId: wdId, transactionId: ref, payoutDate: payDate, notes });
    if (result.error) { showToast(result.error, "error"); return; }
    // Trigger closes the investment_positions row too — reflect that locally.
    const wd = withdrawals.find((w) => w.id === wdId);
    setWithdrawals((list) => list.map((w) => w.id === wdId ? Object.assign({}, w, { status: "paid", transactionRef: ref, paidAt: TODAY }) : w));
    if (wd) setInvestments((list) => list.map((p) => p.investorId === wd.investorId && p.status === "active" ? Object.assign({}, p, { status: "closed" }) : p));
    showToast("Withdrawal marked as paid.", "success");
  }

  /* ---------------- MATURITY ---------------- */
  /**
   * Wired to choose_maturity_action() (migrations 015, 019) — a single atomic
   * Postgres function, not hand-simulated here. See those migrations' comments for
   * why reinvestment creates investment_positions rows directly instead of going
   * through deposit_submissions, and why real payout details (mobile money network/
   * phone, or bank account) are required for withdraw_profit/withdraw_all but not
   * for reinvest/switch_package.
   */
  async function chooseMaturityOption(posId, choice, payoutDetails) {
    const result = await chooseMaturityAction(posId, choice, payoutDetails);
    if (result.error) { showToast(result.error, "error"); return; }
    showToast("Maturity option confirmed.", "success");
    // The DB function did the real (atomic) work — close old position, maybe open a
    // new one, maybe create a withdrawal. Simplest correct way to reflect that
    // locally is to reload from Supabase rather than hand-simulate the same branching
    // logic twice in two languages.
    const [invResult, wdResult] = await Promise.all([
      loadMyInvestmentsViewAction(),
      loadMyWithdrawalsAction(),
    ]);
    if (!invResult.error) setInvestments(invResult.items);
    if (!wdResult.error) setWithdrawals(normalizeWithdrawals(wdResult.withdrawals));
  }

  /* ---------------- FINANCE OFFICER MANAGEMENT ---------------- */
  async function createFinanceOfficer(name, email) {
    const result = await createStaffOrInvestorAccountAction({ role: "finance_officer", fullName: name, email });
    if (result.error) {
      showToast(result.error, "error");
      return { error: result.error };
    }
    bridgeStaffProfile({
      id: result.userId, role: "finance_officer", full_name: name, email, must_change_password: true,
    });
    showToast(name + " created. Temporary password generated.", "success");
    return { name, tempPassword: result.tempPassword };
  }

  /* ---------------- STAFF ADDING INVESTOR ---------------- */
  async function addInvestorByStaff(form) {
    if (!form.email) {
      showToast("Email is required to create an investor account.", "error");
      return { error: "Email is required." };
    }
    const username = form.username || form.fullName.toLowerCase().replace(/[^a-z]+/g, ".");
    const result = await createStaffOrInvestorAccountAction({
      role: "investor", fullName: form.fullName, email: form.email, phone: form.phone, username,
    });
    if (result.error) {
      showToast(result.error, "error");
      return { error: result.error };
    }
    bridgeInvestorProfile({
      id: result.userId, full_name: form.fullName, email: form.email, phone: form.phone, username,
    });
    showToast(form.fullName + " added as a new investor. Temporary password: " + result.tempPassword, "success");
    closeModal();
    return { success: true, tempPassword: result.tempPassword };
  }

  /* ---------------- PROFILE / SETTINGS ---------------- */
  function updateInvestorProfile(id, fields) {
    setInvestors((list) => list.map((i) => i.id === id ? Object.assign({}, i, fields) : i));
    addAudit(getInvestor(id).fullName, "Profile Updated", "—", "Contact / Next of Kin details updated");
    showToast("Profile updated.", "success");
  }
  function changeInvestorPassword(id, newPw) {
    setInvestors((list) => list.map((i) => i.id === id ? Object.assign({}, i, { password: newPw }) : i));
    addAudit(getInvestor(id).fullName, "Password Changed", "—", "Password updated by investor");
  }
  function changeAdminPassword(newPw) {
    setSuperAdmin((a) => Object.assign({}, a, { password: newPw }));
    addAudit(superAdmin.name, "Password Changed", "—", "Password updated by Super Administrator");
  }
  function toggleNotifPref(id, key) {
    setInvestors((list) => list.map((i) => i.id === id ? Object.assign({}, i, { notifPrefs: Object.assign({}, i.notifPrefs, { [key]: !i.notifPrefs[key] }) }) : i));
  }
  function toggleDarkMode(id) {
    setInvestors((list) => list.map((i) => i.id === id ? Object.assign({}, i, { darkMode: !i.darkMode }) : i));
  }
  function markNotificationRead(id) {
    setNotifications((list) => list.map((n) => n.id === id ? Object.assign({}, n, { read: true }) : n));
  }

  function currentStaffName() {
    if (!session) return "System";
    if (session.role === "super_admin") return superAdmin.name;
    if (session.role === "finance_officer") return (financeOfficers.find((f) => f.id === session.id) || {}).name || "Finance Officer";
    return "System";
  }

  const ctx = {
    forcedPwSession, toast,
    session, view, goTo, isMobile, sidebarOpen, setSidebarOpen,
    investors, investments, withdrawals, financeOfficers, superAdmin, org, auditLog, notifications,
    packages, packagesError, loadPackages, depositSubmissions,
    getInvestor, getInvestorInvestments, getInvestorWithdrawals,
    quickLoginAdmin, quickLoginFO, switchToFO, switchToInvestor, completeForcedPasswordChange, loginInvestor, registerInvestor, logout,
    submitInvestment, approveDeposit, rejectDeposit, requestClarification, requestWithdrawal, rejectWithdrawal, markWithdrawalPaid, chooseMaturityOption,
    createFinanceOfficer, addInvestorByStaff, updateInvestorProfile, changeInvestorPassword, changeAdminPassword, toggleNotifPref, toggleDarkMode, markNotificationRead,
    showToast, openModal, closeModal, activeModal,
    selectedInvestorId, setSelectedInvestorId,
    currentUserName: session ? (session.role === "investor" ? getInvestor(session.id).fullName : session.role === "super_admin" ? superAdmin.name : (financeOfficers.find((f) => f.id === session.id) || {}).name) : "",
    currentInvestor: session && session.role === "investor" ? getInvestor(session.id) : null,
  };

  return ctx;
}
