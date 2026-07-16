"use client";
import { useEffect, useRef, useState } from "react";
import { buildSeed } from "@/lib/seedData";
import { fmtUGX, pad } from "@/lib/format";
import {
  login as loginAction,
  logout as logoutAction,
  registerInvestor as registerInvestorAction,
  createStaffOrInvestorAccount as createStaffOrInvestorAccountAction,
  completeForcedPasswordChange as completeForcedPasswordChangeAction,
  changeMyPassword as changeMyPasswordAction,
  updateMyInvestorDetails as updateMyInvestorDetailsAction,
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
import {
  loadAllInvestors as loadAllInvestorsAction,
  loadAllFinanceOfficers as loadAllFinanceOfficersAction,
  loadAuditLog as loadAuditLogAction,
  loadMyNotifications as loadMyNotificationsAction,
  markNotificationReadAction as markNotificationReadServerAction,
} from "@/lib/actions/admin-actions";

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

  // NOTE: investors / financeOfficers / auditLog / notifications used to initialize
  // from seed.* (mock demo data, including fake investors with known passwords) and
  // were NEVER reloaded from Supabase after that — see the useEffect block below for
  // the real loaders that now replace them. Starting empty here (rather than from
  // seed) means real data is the only thing that ever populates these arrays.
  const [investors, setInvestors] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [financeOfficers, setFinanceOfficers] = useState([]);
  const [superAdmin, setSuperAdmin] = useState(seed.superAdmin);
  const [auditLog, setAuditLog] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const org = seed.org;

  const [session, setSession] = useState(null); // {role, id}
  const [forcedPwSession, setForcedPwSession] = useState(null);
  const [view, setView] = useState("dashboard");
  const [selectedInvestorId, setSelectedInvestorId] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
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

  // Load deposits queue for staff. Exposed as a named function (not just inline in
  // the effect) so it can also be called immediately after a staff action that
  // changes a deposit's status (approve/reject/clarify), and by the poll below.
  async function reloadDepositsQueue() {
    if (!session || session.role === "investor") return;
    const result = await loadDepositsQueueAction();
    if (!result.error) setDepositSubmissions(result.deposits);
  }

  // Load investments: investor sees their own merged pending+active list; staff see
  // every investor's positions, with each investor bridged into mock state so
  // ctx.getInvestor(id) resolves even for investors who haven't logged in this
  // session (AllInvestments/WithdrawalsQueue depend on that lookup).
  //
  // THIS WAS THE BUG: this used to only run once, when session.role/session.id
  // first changed (i.e. on login). Submitting a new deposit, or anyone approving
  // one, never re-ran it — so a brand-new deposit was correctly written to
  // Supabase but never appeared on ANY screen (investor's own, or staff's) until
  // that person logged out and back in. Now it's a named function, called again
  // right after the actions that change it, and by the poll below for changes
  // made by someone else's session.
  async function reloadInvestments() {
    if (!session) return;
    if (session.role === "investor") {
      const result = await loadMyInvestmentsViewAction();
      if (!result.error) setInvestments(result.items);
    } else {
      const result = await loadAllInvestmentsViewAction();
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
    }
  }

  // Load withdrawals the same way — own list for investors, full queue + bridging for staff.
  async function reloadWithdrawals() {
    if (!session) return;
    if (session.role === "investor") {
      const result = await loadMyWithdrawalsAction();
      if (!result.error) setWithdrawals(normalizeWithdrawals(result.withdrawals));
    } else {
      const result = await loadWithdrawalsQueueAction();
      if (result.error) return;
      result.withdrawals.forEach((w) => { if (w.investor) bridgeInvestorProfile(w.investor); });
      setWithdrawals(normalizeWithdrawals(result.withdrawals));
    }
  }

  // Load the real staff-wide investor & finance officer rosters, plus the audit
  // trail — the fix for "a new account doesn't show up on someone else's screen".
  // Re-runs whenever session role changes (i.e. on login) so a fresh session always
  // sees the current state of the world, not whatever was bridged in locally before.
  async function reloadStaffLists() {
    if (!session || session.role === "investor") return;
    const [invRes, foRes, auditRes] = await Promise.all([
      loadAllInvestorsAction(),
      loadAllFinanceOfficersAction(),
      loadAuditLogAction(),
    ]);
    if (!invRes.error) setInvestors(invRes.items);
    if (!foRes.error) setFinanceOfficers(foRes.items);
    if (!auditRes.error) setAuditLog(auditRes.items);
  }

  // Load the signed-in user's own notifications. Works for every role — the
  // Finance Officer "deposit awaiting review" alert the DB trigger already writes
  // correctly was never being loaded into the UI before this.
  async function reloadMyNotifications() {
    if (!session) return;
    const result = await loadMyNotificationsAction();
    if (!result.error) setNotifications(result.items);
  }

  // Safety-net poll: everything above reloads immediately after the CURRENT
  // session's own actions (see submitInvestment, approveDeposit, etc. below), which
  // covers "I just did something, do I see it." It does NOT cover "someone ELSE
  // just did something while I already have this screen open" — an investor
  // submitting a deposit doesn't push anything to an FO who logged in ten minutes
  // ago. True push (Supabase Realtime channels) is the correct long-term fix and
  // isn't set up yet; this poll is the pragmatic stand-in so cross-account changes
  // still show up within ~20 seconds instead of requiring a manual logout/login.
  // Single entry point that reloads everything relevant to the current role, and
  // stamps lastSyncedAt — used by both the background poll and the manual "Sync now"
  // control in the header, so the person never has to wonder "is this actually
  // current, or am I looking at something stale."
  async function refreshAll() {
    if (!session) return;
    await Promise.all([
      reloadDepositsQueue(),
      reloadInvestments(),
      reloadWithdrawals(),
      reloadMyNotifications(),
      session.role !== "investor" ? reloadStaffLists() : Promise.resolve(),
    ]);
    setLastSyncedAt(new Date());
  }

  useEffect(() => {
    if (!session) return;
    refreshAll();
    const interval = setInterval(refreshAll, 20000);
    return () => clearInterval(interval);
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
    setAuditLog((l) => [...l, { id, user, action, previousValue: prev, newValue: next, timestamp: new Date() }]);
  }
  function addNotification(investorId, type, message) {
    const id = "NTF-" + pad(counters.current.notif++, 4);
    setNotifications((n) => [...n, { id, investorId, type, message, timestamp: new Date(), read: false }]);
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
    // investor_details may arrive embedded (login()'s join, or the staff-wide
    // roster's join) as either an object or a single-item array depending on the
    // query shape — normalize both. When it's absent entirely (e.g. a bare profile
    // row bridged in from an investments/withdrawals row that only carries
    // id/full_name/email), every detail field below just falls back to whatever
    // was already known about this investor, rather than blanking it out.
    const raw = profile.investor_details;
    const d = Array.isArray(raw) ? raw[0] : raw;
    setInvestors((list) => {
      const existingIdx = list.findIndex((i) => i.id === profile.id);
      const prev = existingIdx >= 0 ? list[existingIdx] : null;
      const merged = {
        id: profile.id,
        memberId: profile.member_id ?? prev?.memberId ?? null,
        fullName: profile.full_name ?? prev?.fullName,
        email: profile.email ?? prev?.email,
        phone: profile.phone || prev?.phone || "",
        nationalId: d?.national_id_number || prev?.nationalId || "",
        address: d?.address || prev?.address || "",
        occupation: d?.occupation || prev?.occupation || "",
        goal: d?.financial_goal || prev?.goal || "",
        kycStatus: d?.kyc_status || prev?.kycStatus || "not_started",
        username: profile.username || profile.email || prev?.username,
        password: null,
        nextOfKin: {
          name: d?.next_of_kin_name || prev?.nextOfKin?.name || "",
          relationship: d?.next_of_kin_relationship || prev?.nextOfKin?.relationship || "",
          phone: d?.next_of_kin_phone || prev?.nextOfKin?.phone || "",
          address: prev?.nextOfKin?.address || "",
        },
        dateRegistered: profile.created_at || prev?.dateRegistered || new Date(),
        notifPrefs: prev?.notifPrefs || { email: true, sms: true },
        darkMode: prev?.darkMode || false,
      };
      if (existingIdx >= 0) {
        const copy = list.slice();
        copy[existingIdx] = merged;
        return copy;
      }
      return [...list, merged];
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
        password: null, mustChangePassword: profile.must_change_password, createdAt: profile.created_at || new Date(), createdBy: "System",
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
    // BUG FIX: this used to optimistically push result.deposit into
    // depositSubmissions — but the investor's own "My Investments" screen reads
    // from `investments` (the merged pending+active view from
    // loadMyInvestmentsView), not depositSubmissions, which isn't even loaded for
    // an investor session at all. The new deposit was correctly written to
    // Supabase but never reached the screen that actually displays it. Reloading
    // the real merged view is what actually fixes that, and also gives the
    // investor the real record (id, goal, package code) instead of a client-side
    // guess at the shape.
    await reloadInvestments();
    showToast("Investment submitted for verification.", "success");
    setView("investments");
    return { ok: true };
  }

  async function approveDeposit(depositId) {
    const result = await approveDepositAction(depositId);
    if (result.error) { showToast(result.error, "error"); return; }
    // Reload both: the deposit's status changed (queue), AND approval creates a
    // real investment_positions row via the DB trigger, which the staff-wide
    // investments view needs to pick up too — an optimistic local patch of just
    // the deposit's status wouldn't have shown the new position anywhere.
    await Promise.all([reloadDepositsQueue(), reloadInvestments()]);
    showToast("Deposit approved. Investment position created.", "success");
  }

  async function rejectDeposit(depositId, reason) {
    const result = await rejectDepositAction(depositId, reason);
    if (result.error) { showToast(result.error, "error"); return; }
    await reloadDepositsQueue();
    showToast("Deposit rejected.", "info");
  }

  async function requestClarification(depositId, note) {
    const result = await requestClarificationAction(depositId, note);
    if (result.error) { showToast(result.error, "error"); return; }
    await reloadDepositsQueue();
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
    // Reload rather than hand-build the local object — the manual version here used
    // to omit investmentId (present in the real shape from normalizeWithdrawals),
    // which would have broken anything that looks up the related position for a
    // withdrawal that hasn't been refreshed from Supabase yet.
    await reloadWithdrawals();
    showToast("Withdrawal request submitted.", "success");
    closeModal();
    setView("withdrawals");
  }

  async function rejectWithdrawal(wdId, reason) {
    const result = await rejectWithdrawalAction(wdId, reason);
    if (result.error) { showToast(result.error, "error"); return; }
    await reloadWithdrawals();
    showToast("Withdrawal rejected.", "info");
  }

  async function markWithdrawalPaid(wdId, ref, payDate, notes) {
    const result = await markWithdrawalPaidAction({ withdrawalId: wdId, transactionId: ref, payoutDate: payDate, notes });
    if (result.error) { showToast(result.error, "error"); return; }
    // Trigger closes the investment_positions row too — reload both, not just
    // hand-patch withdrawals, so the now-closed position is reflected as well.
    await Promise.all([reloadWithdrawals(), reloadInvestments()]);
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
    await Promise.all([reloadInvestments(), reloadWithdrawals()]);
  }

  /* ---------------- FINANCE OFFICER MANAGEMENT ---------------- */
  async function createFinanceOfficer(name, email) {
    const result = await createStaffOrInvestorAccountAction({ role: "finance_officer", fullName: name, email });
    if (result.error) {
      showToast(result.error, "error");
      return { error: result.error };
    }
    // Reload from Supabase rather than hand-patching local state — this is what
    // actually fixes the new officer not showing up (previously bridgeStaffProfile
    // only ever updated THIS browser tab's memory, never persisted view for anyone
    // else, and never survived a refresh).
    await reloadStaffLists();
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
      nationalId: form.nationalId, address: form.address, occupation: form.occupation, goal: form.goal,
      nokName: form.nokName, nokRelationship: form.nokRelationship, nokPhone: form.nokPhone,
    });
    if (result.error) {
      showToast(result.error, "error");
      return { error: result.error };
    }
    // Reload from Supabase (gets the real Member ID too — the local bridge object
    // never had one, which is why it used to render blank/UUID instead) rather than
    // hand-patching local state.
    await reloadStaffLists();
    showToast(form.fullName + " added as a new investor.", "success");
    // NOTE: closeModal() intentionally NOT called here — AddInvestorModal needs to
    // stay open to show the one-time temporary password screen. It used to close
    // itself immediately on success, which meant the admin never actually saw the
    // password (only a toast that vanishes after ~3 seconds) — closing is now the
    // modal's own responsibility, via its "Done" button.
    return { success: true, tempPassword: result.tempPassword };
  }

  /* ---------------- PROFILE / SETTINGS ---------------- */
  /**
   * Persists to Supabase first (audit_logs entry included, via
   * updateMyInvestorDetails), then updates local state from what was actually
   * saved rather than trusting the form input blindly — this is the fix for
   * edits that looked successful but vanished on refresh and were invisible to
   * staff (see updateMyInvestorDetails in auth-actions.js).
   */
  async function updateInvestorProfile(id, fields) {
    const result = await updateMyInvestorDetailsAction(fields);
    if (result.error) { showToast(result.error, "error"); return; }
    setInvestors((list) => list.map((i) => i.id === id ? Object.assign({}, i, fields) : i));
    showToast("Profile updated.", "success");
  }
  /**
   * Real password change for any role, via Supabase Auth — replaces the two old
   * functions (changeInvestorPassword/changeAdminPassword) that only ever
   * compared against a mock seed password and patched local state, meaning
   * "Current password is incorrect" was unavoidable for a real account and the
   * "new" password was never actually set on the real auth.users row. One
   * function now, since Auth password changes aren't role-specific.
   */
  async function changeMyPassword(currentPassword, newPassword) {
    const result = await changeMyPasswordAction(currentPassword, newPassword);
    if (result.error) return { ok: false, error: result.error };
    showToast("Password updated.", "success");
    return { ok: true };
  }
  function toggleNotifPref(id, key) {
    setInvestors((list) => list.map((i) => i.id === id ? Object.assign({}, i, { notifPrefs: Object.assign({}, i.notifPrefs, { [key]: !i.notifPrefs[key] }) }) : i));
  }
  function toggleDarkMode(id) {
    setInvestors((list) => list.map((i) => i.id === id ? Object.assign({}, i, { darkMode: !i.darkMode }) : i));
  }
  function markNotificationRead(id) {
    // Optimistic local update, then persist — previously this never reached
    // Supabase at all, so a notification "read" locally would still show unread
    // after a refresh or on another device.
    setNotifications((list) => list.map((n) => n.id === id ? Object.assign({}, n, { read: true }) : n));
    markNotificationReadServerAction(id);
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
    createFinanceOfficer, addInvestorByStaff, updateInvestorProfile, changeMyPassword, toggleNotifPref, toggleDarkMode, markNotificationRead,
    lastSyncedAt, refreshAll,
    showToast, openModal, closeModal, activeModal,
    selectedInvestorId, setSelectedInvestorId,
    currentUserName: session ? (session.role === "investor" ? (getInvestor(session.id) || {}).fullName || session.fullName || "" : session.role === "super_admin" ? superAdmin.name : (financeOfficers.find((f) => f.id === session.id) || {}).name) : "",
    currentInvestor: session && session.role === "investor" ? getInvestor(session.id) : null,
  };

  return ctx;
}
