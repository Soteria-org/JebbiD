import React from "react";
import { PERIOD_MONTHS } from "@/lib/constants";
import { addMonths, expectedReturn, maturityValue, pad } from "@/lib/format";

export function buildSeed() {
  const investors = [
    { id: "INV001", memberId: "JBD-2026-000101", fullName: "Jacqueline Nantongo", email: "jacqueline.n@example.com", phone: "+256 700 112233", nationalId: "CM90021345ABCDE", address: "Kireka, Kampala", occupation: "Software Developer", goal: "Build a Home", username: "jacqueline.n", password: "password123",
      nextOfKin: { name: "Robert Nantongo", relationship: "Father", phone: "+256 701 998877", address: "Kireka, Kampala" }, dateRegistered: new Date(2026, 0, 10), notifPrefs: { email: true, sms: true }, darkMode: false },
    { id: "INV002", memberId: "JBD-2026-000102", fullName: "Brian Okello", email: "brian.okello@example.com", phone: "+256 702 334455", nationalId: "CM88012233XYZAB", address: "Ntinda, Kampala", occupation: "Entrepreneur", goal: "Business Growth", username: "brian.okello", password: "password123",
      nextOfKin: { name: "Susan Okello", relationship: "Sister", phone: "+256 703 556677", address: "Ntinda, Kampala" }, dateRegistered: new Date(2025, 10, 2), notifPrefs: { email: true, sms: false }, darkMode: false },
    { id: "INV003", memberId: "JBD-2026-000103", fullName: "Patricia Achieng", email: "patricia.a@example.com", phone: "+256 704 778899", nationalId: "CM92034455QRSTU", address: "Bweyogerere, Kampala", occupation: "Teacher", goal: "Education", username: "patricia.a", password: "password123",
      nextOfKin: { name: "James Achieng", relationship: "Husband", phone: "+256 705 112200", address: "Bweyogerere, Kampala" }, dateRegistered: new Date(2025, 8, 15), notifPrefs: { email: true, sms: true }, darkMode: false },
    { id: "INV004", memberId: "JBD-2026-000104", fullName: "David Mukasa", email: "david.mukasa@example.com", phone: "+256 706 445566", nationalId: "CM85067788LMNOP", address: "Kireka, Kampala", occupation: "Civil Engineer", goal: "Retirement", username: "david.mukasa", password: "password123",
      nextOfKin: { name: "Esther Mukasa", relationship: "Wife", phone: "+256 707 332211", address: "Kireka, Kampala" }, dateRegistered: new Date(2025, 5, 20), notifPrefs: { email: true, sms: true }, darkMode: false },
    { id: "INV005", memberId: "JBD-2026-000105", fullName: "Grace Atim", email: "grace.atim@example.com", phone: "+256 708 667788", nationalId: "CM95098877FGHIJ", address: "Kyaliwajjala, Kampala", occupation: "Nurse", goal: "Emergency Fund", username: "grace.atim", password: "password123",
      nextOfKin: { name: "Peter Atim", relationship: "Brother", phone: "+256 709 443322", address: "Kyaliwajjala, Kampala" }, dateRegistered: new Date(2026, 1, 1), notifPrefs: { email: true, sms: false }, darkMode: false },
  ];

  function mkPos(id, investorId, pkg, amount, startDate, depositStatus, status, createdAt) {
    const start = startDate ? new Date(startDate) : null;
    const maturity = start ? addMonths(start, PERIOD_MONTHS) : null;
    return {
      id, investorId, package: pkg, amount, goal: investors.find((i) => i.id === investorId).goal,
      depositStatus, status, startDate: start, maturityDate: maturity,
      expectedReturn: expectedReturn(amount, pkg), maturityValue: maturityValue(amount, pkg),
      createdAt: new Date(createdAt), proofFile: "payment_proof_" + id.toLowerCase() + ".jpg",
      rejectionReason: null, maturityChoice: null, clarificationNote: null,
    };
  }

  const investments = [
    mkPos("POS-0001", "INV001", "corporate", 1200000, new Date(2026, 0, 15), "approved", "active", new Date(2026, 0, 14)),
    mkPos("POS-0002", "INV001", "standard", 300000, new Date(2026, 3, 1), "approved", "active", new Date(2026, 2, 30)),
    mkPos("POS-0003", "INV002", "corporate", 2000000, new Date(2025, 5, 15), "approved", "active", new Date(2025, 5, 14)),
    mkPos("POS-0004", "INV003", "standard", 500000, new Date(2025, 8, 20), "approved", "active", new Date(2025, 8, 19)),
    mkPos("POS-0005", "INV004", "standard", 800000, new Date(2025, 5, 25), "approved", "active", new Date(2025, 5, 24)),
    mkPos("POS-0006", "INV005", "standard", 150000, null, "pending", "pending_verification", new Date(2026, 5, 20)),
    mkPos("POS-0007", "INV002", "corporate", 1500000, null, "pending", "pending_verification", new Date(2026, 5, 25)),
  ];

  const withdrawals = [];

  const financeOfficers = [
    { id: "FO001", name: "Allan Ssemwogerere", email: "allan.fo@jebbidox.org", username: "allan.fo", password: "finance123", mustChangePassword: false, createdAt: new Date(2025, 4, 1), createdBy: "Super Administrator" },
  ];

  const superAdmin = { id: "SA001", name: "Patrick Owino", email: "admin@jebbidox.org", username: "admin", password: "admin123" };

  const org = {
    name: "Jebbidox Youth Investment Club",
    address: "Kireka, Uganda",
    phone: "+256 787 905165 / +256 757 180024",
    email: "zeal247invest@gmail.com",
    // ASSUMPTION FLAGGED: mapped by Uganda telecom prefix convention (078/077 = MTN,
    // 075/070 = Airtel) from the two numbers already in the org's own contact info.
    // Not yet confirmed with Soteria which number is actually registered on which
    // network's Mobile Money service — verify before this goes live for real deposits.
    mtnMomoLine: "+256 787 905165 (MTN Mobile Money — Jebbidox Youth Investment Club)",
    airtelMoneyLine: "+256 757 180024 (Airtel Money — Jebbidox Youth Investment Club)",
    bankLine: "Stanbic Bank Uganda — Acc. Name: Jebbidox Youth Investment Club — Acc. No: 9030012345678",
  };

  let auditSeq = 1;
  function mkAudit(user, action, prev, next, ts) {
    return { id: "AUD-" + pad(auditSeq++, 4), user, action, previousValue: prev, newValue: next, timestamp: ts };
  }
  const auditLog = [
    mkAudit("System", "Investor Registered", "—", "Jacqueline Nantongo (JBD-2026-000101)", new Date(2026, 0, 10, 9, 12)),
    mkAudit("Allan Ssemwogerere", "Deposit Approved", "Pending — POS-0001", "Active — POS-0001", new Date(2026, 0, 16, 11, 4)),
    mkAudit("Allan Ssemwogerere", "Deposit Approved", "Pending — POS-0002", "Active — POS-0002", new Date(2026, 3, 2, 10, 20)),
    mkAudit("Patrick Owino", "Finance Officer Created", "—", "Allan Ssemwogerere (FO001)", new Date(2025, 4, 1, 8, 0)),
    mkAudit("Allan Ssemwogerere", "Deposit Approved", "Pending — POS-0004", "Active — POS-0004", new Date(2025, 8, 21, 14, 36)),
    mkAudit("Allan Ssemwogerere", "Deposit Approved", "Pending — POS-0005", "Active — POS-0005", new Date(2025, 5, 26, 9, 50)),
  ];

  let notifSeq = 1;
  function mkNotif(investorId, type, message, ts, read) {
    return { id: "NTF-" + pad(notifSeq++, 4), investorId, type, message, timestamp: ts, read: !!read };
  }
  const notifications = [
    mkNotif("INV001", "registration", "Welcome to Jebbidox. Your account has been created.", new Date(2026, 0, 10, 9, 12), true),
    mkNotif("INV001", "deposit_approved", "Your investment of UGX 1,200,000 has been approved and is now active.", new Date(2026, 0, 16, 11, 4), true),
    mkNotif("INV001", "deposit_approved", "Your investment of UGX 300,000 has been approved and is now active.", new Date(2026, 3, 2, 10, 20), true),
    mkNotif("INV002", "deposit_submitted", "Your deposit of UGX 1,500,000 has been submitted and is awaiting verification.", new Date(2026, 5, 25, 16, 2), false),
    mkNotif("INV003", "deposit_approved", "Your investment of UGX 500,000 has been approved and is now active.", new Date(2025, 8, 21, 14, 36), true),
    mkNotif("INV004", "deposit_approved", "Your investment of UGX 800,000 has been approved and is now active.", new Date(2025, 5, 26, 9, 50), true),
    mkNotif("INV005", "deposit_submitted", "Your deposit of UGX 150,000 has been submitted and is awaiting verification.", new Date(2026, 5, 20, 12, 30), false),
  ];

  return { investors, investments, withdrawals, financeOfficers, superAdmin, org, auditLog, notifications };
}
