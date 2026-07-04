"use client";
import { useEffect, useRef, useState } from "react";
import { buildSeed } from "@/lib/seedData";
import { PERIOD_MONTHS, TODAY } from "@/lib/constants";
import { addMonths, expectedReturn, fmtUGX, maturityValue, pad } from "@/lib/format";
import {
  login as loginAction,
  logout as logoutAction,
  registerInvestor as registerInvestorAction,
  createStaffOrInvestorAccount as createStaffOrInvestorAccountAction,
  completeForcedPasswordChange as completeForcedPasswordChangeAction,
} from "@/lib/actions/auth-actions";

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
  function getInvestorInvestments(id) { return investments.filter((p) => p.investorId === id).sort((a, b) => b.createdAt - a.createdAt); }
  function getInvestorWithdrawals(id) { return withdrawals.filter((w) => w.investorId === id).sort((a, b) => b.requestedAt - a.requestedAt); }

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
  function submitInvestment(data) {
    const id = "POS-" + pad(counters.current.pos++, 4);
    const investor = getInvestor(session.id);
    const newPos = {
      id, investorId: session.id, package: data.package, amount: data.amount, goal: data.goal,
      depositStatus: "pending", status: "pending_verification", startDate: null, maturityDate: null,
      expectedReturn: expectedReturn(data.amount, data.package), maturityValue: maturityValue(data.amount, data.package),
      createdAt: TODAY, proofFile: "payment_proof_" + id.toLowerCase() + ".jpg", rejectionReason: null, maturityChoice: null,
    };
    setInvestments((list) => [...list, newPos]);
    addAudit(investor.fullName, "Deposit Submitted", "—", fmtUGX(data.amount) + " — " + id);
    addNotification(session.id, "deposit_submitted", "Your deposit of " + fmtUGX(data.amount) + " has been submitted and is awaiting verification.");
    showToast("Investment submitted for verification.", "success");
    setView("investments");
  }

  function approveDeposit(posId) {
    const staffName = currentStaffName();
    setInvestments((list) => list.map((p) => {
      if (p.id !== posId) return p;
      const start = TODAY;
      const maturity = addMonths(start, PERIOD_MONTHS);
      return Object.assign({}, p, { depositStatus: "approved", status: "active", startDate: start, maturityDate: maturity });
    }));
    const pos = investments.find((p) => p.id === posId);
    addAudit(staffName, "Deposit Approved", "Pending — " + posId, "Active — " + posId);
    addNotification(pos.investorId, "deposit_approved", "Your investment of " + fmtUGX(pos.amount) + " has been approved and is now active.");
    showToast("Deposit approved.", "success");
  }
  function rejectDeposit(posId, reason) {
    const staffName = currentStaffName();
    setInvestments((list) => list.map((p) => p.id === posId ? Object.assign({}, p, { depositStatus: "rejected", status: "rejected", rejectionReason: reason }) : p));
    const pos = investments.find((p) => p.id === posId);
    addAudit(staffName, "Deposit Rejected", "Pending — " + posId, "Rejected — " + posId + " (" + reason + ")");
    addNotification(pos.investorId, "deposit_rejected", "Your deposit of " + fmtUGX(pos.amount) + " was rejected. Reason: " + reason);
    showToast("Deposit rejected.", "info");
  }

  /* ---------------- WITHDRAWALS ---------------- */
  function requestWithdrawal(data) {
    const id = "WD-" + pad(counters.current.wd++, 4);
    const w = {
      id, investmentId: data.investmentId, investorId: session.id, amount: data.amount, reason: data.reason,
      paymentMethod: data.paymentMethod, details: data.details, comments: data.comments, penalty: data.penalty,
      netAmount: data.netAmount, status: "pending", requestedAt: TODAY, transactionRef: null, paidAt: null,
    };
    setWithdrawals((list) => [...list, w]);
    const investor = getInvestor(session.id);
    addAudit(investor.fullName, "Withdrawal Requested", "—", fmtUGX(data.amount) + " — " + id);
    addNotification(session.id, "withdrawal_submitted", "Your withdrawal request of " + fmtUGX(data.amount) + " has been submitted and is pending review.");
    showToast("Withdrawal request submitted.", "success");
    closeModal();
    setView("withdrawals");
  }
  function rejectWithdrawal(wdId, reason) {
    const staffName = currentStaffName();
    setWithdrawals((list) => list.map((w) => w.id === wdId ? Object.assign({}, w, { status: "rejected", rejectionReason: reason }) : w));
    const w = withdrawals.find((x) => x.id === wdId);
    addAudit(staffName, "Withdrawal Rejected", "Pending — " + wdId, "Rejected — " + wdId);
    addNotification(w.investorId, "withdrawal_rejected", "Your withdrawal request " + wdId + " was rejected. Reason: " + reason);
    showToast("Withdrawal rejected.", "info");
  }
  function markWithdrawalPaid(wdId, ref, payDate, notes) {
    const staffName = currentStaffName();
    const w = withdrawals.find((x) => x.id === wdId);
    setWithdrawals((list) => list.map((x) => x.id === wdId ? Object.assign({}, x, { status: "paid", transactionRef: ref, paidAt: TODAY, payDateNote: payDate, notes }) : x));
    setInvestments((list) => list.map((p) => p.id === w.investmentId ? Object.assign({}, p, { status: "withdrawn" }) : p));
    addAudit(staffName, "Withdrawal Paid", "Pending — " + wdId, "Paid — " + wdId + " (Ref: " + ref + ")");
    addNotification(w.investorId, "withdrawal_paid", "Your withdrawal of " + fmtUGX(w.netAmount) + " has been paid. Reference: " + ref + ".");
    showToast("Withdrawal marked as paid.", "success");
  }

  /* ---------------- MATURITY ---------------- */
  function chooseMaturityOption(posId, choice) {
    const p = investments.find((x) => x.id === posId);
    const newId = "POS-" + pad(counters.current.pos++, 4);
    if (choice === "reinvest" || choice === "switch_package") {
      const newPkg = choice === "switch_package" ? (p.package === "standard" ? "corporate" : "standard") : p.package;
      const amt = p.maturityValue;
      const start = TODAY;
      const newPos = { id: newId, investorId: p.investorId, package: newPkg, amount: amt, goal: p.goal, depositStatus: "approved",
        status: "active", startDate: start, maturityDate: addMonths(start, PERIOD_MONTHS), expectedReturn: expectedReturn(amt, newPkg),
        maturityValue: maturityValue(amt, newPkg), createdAt: TODAY, proofFile: null, rejectionReason: null, maturityChoice: null };
      setInvestments((list) => [...list.map((x) => x.id === posId ? Object.assign({}, x, { status: "matured", maturityChoice: choice }) : x), newPos]);
      addAudit("System", choice === "reinvest" ? "Investment Reinvested" : "Package Switched", posId + " matured", newId + " opened (" + fmtUGX(amt) + ")");
      addNotification(p.investorId, "maturity", "Position " + posId + " matured and was rolled into new position " + newId + ".");
    } else if (choice === "withdraw_profit") {
      const principal = p.amount;
      const start = TODAY;
      const newPos = { id: newId, investorId: p.investorId, package: p.package, amount: principal, goal: p.goal, depositStatus: "approved",
        status: "active", startDate: start, maturityDate: addMonths(start, PERIOD_MONTHS), expectedReturn: expectedReturn(principal, p.package),
        maturityValue: maturityValue(principal, p.package), createdAt: TODAY, proofFile: null, rejectionReason: null, maturityChoice: null };
      const wdId = "WD-" + pad(counters.current.wd++, 4);
      const w = { id: wdId, investmentId: posId, investorId: p.investorId, amount: p.expectedReturn, reason: "Maturity profit withdrawal",
        paymentMethod: "mobile_money", details: {}, comments: "Profit withdrawal at maturity; principal reinvested as " + newId, penalty: 0,
        netAmount: p.expectedReturn, status: "pending", requestedAt: TODAY, transactionRef: null, paidAt: null };
      setInvestments((list) => [...list.map((x) => x.id === posId ? Object.assign({}, x, { status: "matured", maturityChoice: choice }) : x), newPos]);
      setWithdrawals((list) => [...list, w]);
      addAudit("System", "Profit Withdrawal Requested", posId + " matured", wdId + " — " + fmtUGX(p.expectedReturn));
      addNotification(p.investorId, "maturity", "Profit of " + fmtUGX(p.expectedReturn) + " submitted for withdrawal. Principal reinvested as " + newId + ".");
    } else if (choice === "withdraw_all") {
      const wdId = "WD-" + pad(counters.current.wd++, 4);
      const w = { id: wdId, investmentId: posId, investorId: p.investorId, amount: p.maturityValue, reason: "Full maturity withdrawal",
        paymentMethod: "mobile_money", details: {}, comments: "Full withdrawal at maturity", penalty: 0, netAmount: p.maturityValue,
        status: "pending", requestedAt: TODAY, transactionRef: null, paidAt: null };
      setInvestments((list) => list.map((x) => x.id === posId ? Object.assign({}, x, { status: "matured", maturityChoice: choice }) : x));
      setWithdrawals((list) => [...list, w]);
      addAudit("System", "Full Withdrawal Requested", posId + " matured", wdId + " — " + fmtUGX(p.maturityValue));
      addNotification(p.investorId, "maturity", "Full maturity value of " + fmtUGX(p.maturityValue) + " submitted for withdrawal.");
    }
    showToast("Maturity option confirmed.", "success");
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
    getInvestor, getInvestorInvestments, getInvestorWithdrawals,
    quickLoginAdmin, quickLoginFO, switchToFO, switchToInvestor, completeForcedPasswordChange, loginInvestor, registerInvestor, logout,
    submitInvestment, approveDeposit, rejectDeposit, requestWithdrawal, rejectWithdrawal, markWithdrawalPaid, chooseMaturityOption,
    createFinanceOfficer, addInvestorByStaff, updateInvestorProfile, changeInvestorPassword, changeAdminPassword, toggleNotifPref, toggleDarkMode, markNotificationRead,
    showToast, openModal, closeModal, activeModal,
    selectedInvestorId, setSelectedInvestorId,
    currentUserName: session ? (session.role === "investor" ? getInvestor(session.id).fullName : session.role === "super_admin" ? superAdmin.name : (financeOfficers.find((f) => f.id === session.id) || {}).name) : "",
    currentInvestor: session && session.role === "investor" ? getInvestor(session.id) : null,
  };

  return ctx;
}
