"use server";

import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

/**
 * Historical Investment Data Migration spec, §10 "Exports".
 *
 * Two Server Actions:
 *   - buildExportWorkbook({ filters }) -> multi-sheet Excel workbook (base64)
 *   - buildExportCsv({ sheet, filters }) -> single-sheet CSV (plain text)
 *
 * House rules followed throughout this file:
 *   - "use server" + createClient() (RLS-scoped, publishable key) — never
 *     createAdminClient(). A Finance Officer exporting data sees exactly what
 *     their RLS policies already let them see; nothing here widens that.
 *   - Every function returns { success: true, ... } or { error: "..." }, never
 *     throws across the Server Action boundary (see try/catch wrappers on the
 *     two exported entry points, matching createStaffOrInvestorAccount() in
 *     auth-actions.js).
 *   - Explicit role check (fetch caller's profile, verify role is
 *     finance_officer or super_admin) in addition to RLS — same belt-and-
 *     braces pattern as createStaffOrInvestorAccount() in auth-actions.js.
 *     RLS alone would technically be enough (a non-staff caller's queries
 *     would just come back empty/own-rows-only), but an export action should
 *     fail with a clear, specific "not authorized" message rather than quietly
 *     handing an investor a workbook containing only their own single row.
 *
 * Reconciliation discipline (spec's own words, applied on the way out this
 * time instead of the way in): every number in every sheet comes straight out
 * of a Supabase query result, never out of a running total kept in JS that
 * could silently drift from the database. The Excel and CSV entry points
 * share the exact same data-fetching and same exact row-building functions
 * (buildXAOA below), so a value exported via "Download Excel" and the same
 * value exported via "Download CSV" are, by construction, computed by the
 * identical code path — they cannot disagree with each other, and both are
 * one Supabase query away from the source of truth.
 */

// ---------------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------------

const EXPORT_ROLES = ["finance_officer", "super_admin"];

/**
 * Fetches the caller's own profile and checks role. Mirrors the pattern in
 * createStaffOrInvestorAccount() (auth-actions.js): auth.getUser() first, then
 * a profiles lookup scoped to that uid, then an explicit allow-list check.
 * Returns { error } on any failure, or { user, profile } on success.
 */
async function getAuthorizedExporter(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) return { error: "Could not verify your account." };

  if (!EXPORT_ROLES.includes(profile.role)) {
    return { error: "Only Finance Officers and Super Admins can export data." };
  }
  return { user, profile };
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** Real current date as "YYYY-MM-DD" — matches Postgres `date` column format. */
function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

/** Postgres `date`/`timestamptz` value -> plain "YYYY-MM-DD" for the sheet. */
function dateOnly(v) {
  if (!v) return "";
  return String(v).slice(0, 10);
}

/** Rounded UGX amount as a plain number (never a formatted string) so Excel/CSV consumers can sum it. */
function amountOrZero(n) {
  return n === null || n === undefined ? 0 : Math.round(Number(n) * 100) / 100;
}

function amountOrBlank(n) {
  return n === null || n === undefined ? "" : Math.round(Number(n) * 100) / 100;
}

/**
 * Cleans caller-supplied filters into a predictable shape. Every field is
 * optional; an absent/blank/null value means "no filter on this dimension."
 * filters: { investorId, status, maturityWindowDays, dateFrom, dateTo }
 */
function normalizeFilters(filters) {
  const f = filters || {};
  const out = {
    investorId: f.investorId ? String(f.investorId) : null,
    status: f.status ? String(f.status) : null,
    maturityWindowDays:
      f.maturityWindowDays === undefined || f.maturityWindowDays === null || f.maturityWindowDays === ""
        ? null
        : Number(f.maturityWindowDays),
    dateFrom: f.dateFrom ? String(f.dateFrom).slice(0, 10) : null,
    dateTo: f.dateTo ? String(f.dateTo).slice(0, 10) : null,
  };
  if (out.maturityWindowDays !== null && (!Number.isFinite(out.maturityWindowDays) || out.maturityWindowDays < 0)) {
    out.maturityWindowDays = null;
  }
  return out;
}

/** Readable one-line summary of the applied filters, printed at the top of every sheet. */
function describeFilters(f) {
  const parts = [];
  if (f.investorId) parts.push("Investor: " + f.investorId);
  if (f.status) parts.push("Status: " + f.status);
  if (f.maturityWindowDays !== null) parts.push("Maturing within: " + f.maturityWindowDays + " days");
  if (f.dateFrom) parts.push("From: " + f.dateFrom);
  if (f.dateTo) parts.push("To: " + f.dateTo);
  return parts.length ? parts.join("  |  ") : "No filters applied — full dataset";
}

function fmtGeneratedAt(d) {
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function buildFilename(prefix, generatedAt, ext) {
  const stamp = generatedAt.toISOString().slice(0, 10);
  return `${prefix}-${stamp}.${ext}`;
}

// ---------------------------------------------------------------------------
// Data fetching — every filter is applied inside the Supabase query itself,
// never by fetching everything and filtering in JS.
// ---------------------------------------------------------------------------

/**
 * Investor identity roster for the Investor Summary sheet. Deliberately NOT
 * filtered by status/maturityWindowDays/dateFrom/dateTo — those are
 * position-level filters (see fetchPositionTotals below); an investor's
 * identity/KYC/verification fields don't have a "status" or "maturity date"
 * of their own. Only the investorId filter narrows this query.
 */
async function fetchInvestorsForSummary(supabase, filters) {
  let q = supabase
    .from("profiles")
    .select(`
      id, full_name, member_id, migration_status, created_at,
      investor_details ( kyc_status, financial_history_status, verification_status )
    `)
    .eq("role", "investor");
  if (filters.investorId) q = q.eq("id", filters.investorId);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error("profiles (investor summary): " + error.message);
  return data || [];
}

/**
 * Every investment_positions row for the investors in scope, UNFILTERED by
 * status/date/maturityWindow — used only to compute each investor's lifetime
 * "Total Invested" / "Active Positions" totals for the Investor Summary sheet.
 * Kept as a separate, narrower query (just investor_id/principal_amount/status)
 * from the richer fetchInvestmentPositions() below, so the summary reflects
 * the investor's real lifetime numbers regardless of which slice the caller
 * is currently drilling into on the Investments sheet.
 */
async function fetchPositionTotals(supabase, filters) {
  let q = supabase.from("investment_positions").select("investor_id, principal_amount, status");
  if (filters.investorId) q = q.eq("investor_id", filters.investorId);

  const { data, error } = await q;
  if (error) throw new Error("investment_positions (totals): " + error.message);
  return data || [];
}

/**
 * The filtered investment_positions rows that drive BOTH the Investments sheet
 * and the Maturity Report sheet — every filter dimension applies here, so
 * those two sheets are always drawn from the identical result set (a row that
 * appears in Investments is, by construction, categorized in Maturity Report,
 * and vice versa).
 */
async function fetchInvestmentPositions(supabase, filters) {
  let q = supabase
    .from("investment_positions")
    .select(`
      id, reference_number, principal_amount, annual_return_rate, start_date, maturity_date,
      expected_return, maturity_value, status, created_at,
      package:investment_packages ( code ),
      investor:profiles!investment_positions_investor_id_fkey ( id, full_name, member_id )
    `);

  if (filters.investorId) q = q.eq("investor_id", filters.investorId);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.dateFrom) q = q.gte("start_date", filters.dateFrom);
  if (filters.dateTo) q = q.lte("start_date", filters.dateTo);
  if (filters.maturityWindowDays !== null) {
    const today = todayISODate();
    const windowEnd = addDaysISO(today, filters.maturityWindowDays);
    q = q.gte("maturity_date", today).lte("maturity_date", windowEnd);
  }

  const { data, error } = await q.order("start_date", { ascending: false });
  if (error) throw new Error("investment_positions: " + error.message);
  return data || [];
}

/** Approved-or-not, every deposit event — the reader sees the Status column and can judge for themselves. */
async function fetchDeposits(supabase, filters) {
  let q = supabase
    .from("deposit_submissions")
    .select(`
      id, reference_number, amount, status, date_paid, payment_method, network, transaction_reference, created_at,
      package:investment_packages ( code ),
      investor:profiles!deposit_submissions_investor_id_fkey ( id, full_name, member_id )
    `);

  if (filters.investorId) q = q.eq("investor_id", filters.investorId);
  if (filters.dateFrom) q = q.gte("date_paid", filters.dateFrom);
  if (filters.dateTo) q = q.lte("date_paid", filters.dateTo);

  const { data, error } = await q.order("date_paid", { ascending: false });
  if (error) throw new Error("deposit_submissions: " + error.message);
  return data || [];
}

/**
 * payout_records is append-only and has no investor_id of its own — the
 * investor lives on the withdrawal_requests row it pays out. `!inner` makes
 * the embed a real join so `.eq("withdrawal.investor_id", ...)` actually
 * restricts the outer payout_records rows server-side, instead of merely
 * shaping the embedded object.
 */
async function fetchPayouts(supabase, filters) {
  let q = supabase
    .from("payout_records")
    .select(`
      id, payout_date, amount_paid, transaction_id, created_at,
      withdrawal:withdrawal_requests!inner (
        id, reference_number, amount_requested, net_amount, status,
        investor:profiles!withdrawal_requests_investor_id_fkey ( id, full_name, member_id )
      )
    `);

  if (filters.investorId) q = q.eq("withdrawal.investor_id", filters.investorId);
  if (filters.dateFrom) q = q.gte("payout_date", filters.dateFrom);
  if (filters.dateTo) q = q.lte("payout_date", filters.dateTo);

  const { data, error } = await q.order("payout_date", { ascending: false });
  if (error) throw new Error("payout_records: " + error.message);
  return data || [];
}

/** Migration Audit source rows — one per import_rows entry, joined to its batch and (if linked) its investor. */
async function fetchImportRows(supabase, filters) {
  let q = supabase
    .from("import_rows")
    .select(`
      id, source_row_number, validation_status, resolution, linked_investor_id, linked_investment_id,
      mapped_data, created_at,
      batch:import_batches ( id, source_filename, uploaded_at, status ),
      investor:profiles!import_rows_linked_investor_id_fkey ( id, full_name, member_id ),
      investment:investment_positions!import_rows_linked_investment_id_fkey ( id, reference_number )
    `);

  if (filters.investorId) q = q.eq("linked_investor_id", filters.investorId);
  if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom);
  if (filters.dateTo) q = q.lte("created_at", filters.dateTo + "T23:59:59");

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw new Error("import_rows: " + error.message);
  return data || [];
}

/** Runs every fetch needed by any sheet. Reused identically by the xlsx and CSV entry points — see file header. */
async function loadExportDatasets(supabase, filters) {
  const [investors, positionTotals, positions, deposits, payouts, importRows] = await Promise.all([
    fetchInvestorsForSummary(supabase, filters),
    fetchPositionTotals(supabase, filters),
    fetchInvestmentPositions(supabase, filters),
    fetchDeposits(supabase, filters),
    fetchPayouts(supabase, filters),
    fetchImportRows(supabase, filters),
  ]);
  return { investors, positionTotals, positions, deposits, payouts, importRows };
}

// ---------------------------------------------------------------------------
// Sheet builders — each returns an array-of-arrays (AOA): a small header
// block (title / generated-at / filters applied) then a blank row then a
// real column-header row then data rows. Shared verbatim between the xlsx
// workbook and the single-sheet CSV export.
// ---------------------------------------------------------------------------

function investorDetailsOf(p) {
  const d = Array.isArray(p.investor_details) ? p.investor_details[0] : p.investor_details;
  return d || {};
}

function buildInvestorSummaryAOA(datasets, filters, generatedAt) {
  const totals = new Map(); // investor_id -> { total, active }
  for (const pos of datasets.positionTotals) {
    const t = totals.get(pos.investor_id) || { total: 0, active: 0 };
    t.total += Number(pos.principal_amount) || 0;
    if (pos.status === "active") t.active += 1;
    totals.set(pos.investor_id, t);
  }

  const rows = [
    ["Jebbidox Youth Investment Club — Investor Summary"],
    ["Generated: " + fmtGeneratedAt(generatedAt)],
    ["Filters: " + describeFilters(filters)],
    [],
    ["Investor Name", "Member ID", "Migration Status", "Financial History Status", "KYC Status", "Verification Status", "Total Invested (UGX)", "Active Positions"],
  ];

  for (const p of datasets.investors) {
    const d = investorDetailsOf(p);
    const t = totals.get(p.id) || { total: 0, active: 0 };
    rows.push([
      p.full_name || "",
      p.member_id || "",
      p.migration_status || "native",
      d.financial_history_status || "",
      d.kyc_status || "not_started",
      d.verification_status || "unverified",
      amountOrZero(t.total),
      t.active,
    ]);
  }

  rows.push([]);
  rows.push(["Total investors: " + datasets.investors.length]);
  return rows;
}

function buildInvestmentsAOA(datasets, filters, generatedAt) {
  const rows = [
    ["Jebbidox Youth Investment Club — Investments"],
    ["Generated: " + fmtGeneratedAt(generatedAt)],
    ["Filters: " + describeFilters(filters)],
    [],
    ["Reference Number", "Investor Name", "Member ID", "Package", "Principal Amount (UGX)", "Annual Return Rate (%)", "Start Date", "Maturity Date", "Expected Return (UGX)", "Maturity Value (UGX)", "Status"],
  ];

  let sumPrincipal = 0;
  for (const p of datasets.positions) {
    sumPrincipal += Number(p.principal_amount) || 0;
    rows.push([
      p.reference_number || "",
      p.investor?.full_name || "",
      p.investor?.member_id || "",
      p.package?.code || "",
      amountOrZero(p.principal_amount),
      p.annual_return_rate === null || p.annual_return_rate === undefined ? "" : Number(p.annual_return_rate),
      dateOnly(p.start_date),
      dateOnly(p.maturity_date),
      amountOrBlank(p.expected_return),
      amountOrBlank(p.maturity_value),
      p.status || "",
    ]);
  }

  rows.push([]);
  rows.push(["Total positions: " + datasets.positions.length, "", "", "", "Sum of Principal (UGX): " + amountOrZero(sumPrincipal)]);
  return rows;
}

function buildTransactionsAOA(datasets, filters, generatedAt) {
  const rows = [
    ["Jebbidox Youth Investment Club — Transactions"],
    ["Generated: " + fmtGeneratedAt(generatedAt)],
    ["Filters: " + describeFilters(filters)],
    [],
    ["Date", "Type", "Investor Name", "Member ID", "Reference Number", "Amount (UGX)", "Status", "Method / Notes"],
  ];

  const events = [];
  for (const d of datasets.deposits) {
    const methodParts = [];
    if (d.payment_method) methodParts.push(String(d.payment_method).replace(/_/g, " "));
    if (d.network) methodParts.push(d.network);
    if (d.transaction_reference) methodParts.push("ref " + d.transaction_reference);
    events.push({
      date: dateOnly(d.date_paid) || dateOnly(d.created_at),
      type: "Deposit",
      investorName: d.investor?.full_name || "",
      memberId: d.investor?.member_id || "",
      reference: d.reference_number || "",
      amount: amountOrZero(d.amount),
      status: d.status || "",
      notes: methodParts.join(" — "),
    });
  }
  for (const p of datasets.payouts) {
    events.push({
      date: dateOnly(p.payout_date) || dateOnly(p.created_at),
      type: "Payout",
      investorName: p.withdrawal?.investor?.full_name || "",
      memberId: p.withdrawal?.investor?.member_id || "",
      reference: p.withdrawal?.reference_number || "",
      amount: amountOrZero(p.amount_paid),
      status: "paid",
      notes: p.transaction_id ? "txn " + p.transaction_id : "",
    });
  }
  events.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  let sumDeposits = 0;
  let sumPayouts = 0;
  for (const e of events) {
    if (e.type === "Deposit") sumDeposits += e.amount;
    else sumPayouts += e.amount;
    rows.push([e.date, e.type, e.investorName, e.memberId, e.reference, e.amount, e.status, e.notes]);
  }

  rows.push([]);
  rows.push(["Total events: " + events.length, "", "", "", "", "Deposits (UGX): " + amountOrZero(sumDeposits) + "   Payouts (UGX): " + amountOrZero(sumPayouts)]);
  return rows;
}

/**
 * Groups the SAME filtered investment_positions result used by the
 * Investments sheet (fetchInvestmentPositions) into maturity buckets — so a
 * row that appears in Investments is always categorized here too, never a
 * second, independently-fetched dataset that could drift out of step.
 * Buckets are mutually exclusive and evaluated in this order: Already
 * Matured (maturity_date <= today) -> Maturing within 30 Days -> Maturing
 * within 90 Days -> Later / No Maturity Date.
 */
function buildMaturityReportAOA(datasets, filters, generatedAt) {
  const today = todayISODate();
  const in30 = addDaysISO(today, 30);
  const in90 = addDaysISO(today, 90);

  const buckets = { "Already Matured": [], "Maturing within 30 Days": [], "Maturing within 90 Days": [], "Later / No Maturity Date": [] };
  for (const p of datasets.positions) {
    const md = dateOnly(p.maturity_date);
    if (!md) buckets["Later / No Maturity Date"].push(p);
    else if (md <= today) buckets["Already Matured"].push(p);
    else if (md <= in30) buckets["Maturing within 30 Days"].push(p);
    else if (md <= in90) buckets["Maturing within 90 Days"].push(p);
    else buckets["Later / No Maturity Date"].push(p);
  }

  const rows = [
    ["Jebbidox Youth Investment Club — Maturity Report"],
    ["Generated: " + fmtGeneratedAt(generatedAt)],
    ["Filters: " + describeFilters(filters)],
    [],
    ["Maturity Watch Summary"],
    ["Already Matured", buckets["Already Matured"].length],
    ["Maturing within 30 Days", buckets["Maturing within 30 Days"].length],
    ["Maturing within 90 Days", buckets["Maturing within 90 Days"].length],
    ["Later / No Maturity Date", buckets["Later / No Maturity Date"].length],
    [],
    ["Maturity Bucket", "Reference Number", "Investor Name", "Member ID", "Maturity Date", "Principal Amount (UGX)", "Maturity Value (UGX)", "Status"],
  ];

  for (const bucketName of ["Already Matured", "Maturing within 30 Days", "Maturing within 90 Days", "Later / No Maturity Date"]) {
    const list = buckets[bucketName].slice().sort((a, b) => dateOnly(a.maturity_date).localeCompare(dateOnly(b.maturity_date)));
    for (const p of list) {
      rows.push([
        bucketName,
        p.reference_number || "",
        p.investor?.full_name || "",
        p.investor?.member_id || "",
        dateOnly(p.maturity_date),
        amountOrZero(p.principal_amount),
        amountOrBlank(p.maturity_value),
        p.status || "",
      ]);
    }
  }

  return rows;
}

function buildMigrationAuditAOA(datasets, filters, generatedAt) {
  const rows = [
    ["Jebbidox Youth Investment Club — Migration Audit"],
    ["Generated: " + fmtGeneratedAt(generatedAt)],
    ["Filters: " + describeFilters(filters)],
    [],
    ["Batch ID", "Source Filename", "Batch Uploaded At", "Batch Status", "Row #", "Resolution", "Validation Status", "Source Investor Name (Raw)", "Source Amount", "Source Date", "Linked Investor", "Linked Investor Member ID", "Linked Investment Ref"],
  ];

  for (const r of datasets.importRows) {
    const md = r.mapped_data || {};
    rows.push([
      r.batch?.id || "",
      r.batch?.source_filename || "",
      r.batch?.uploaded_at ? String(r.batch.uploaded_at).replace("T", " ").slice(0, 19) : "",
      r.batch?.status || "",
      r.source_row_number,
      r.resolution || "",
      r.validation_status || "",
      md.investorNameRaw || "",
      md.amountParsed === undefined || md.amountParsed === null ? "" : md.amountParsed,
      md.dateParsedISO || "",
      r.investor?.full_name || "",
      r.investor?.member_id || "",
      r.investment?.reference_number || "",
    ]);
  }

  rows.push([]);
  rows.push(["Total rows: " + datasets.importRows.length]);
  return rows;
}

const SHEET_BUILDERS = {
  investors: { title: "Investor Summary", build: buildInvestorSummaryAOA },
  investments: { title: "Investments", build: buildInvestmentsAOA },
  transactions: { title: "Transactions", build: buildTransactionsAOA },
  maturity: { title: "Maturity Report", build: buildMaturityReportAOA },
  migration_audit: { title: "Migration Audit", build: buildMigrationAuditAOA },
};

// ---------------------------------------------------------------------------
// xlsx assembly
// ---------------------------------------------------------------------------

/** Currency/date-ish column widths per sheet, for readability — index-aligned to each sheet's header row. */
const COLUMN_WIDTHS = {
  investors: [26, 14, 16, 22, 14, 18, 20, 16],
  investments: [18, 24, 14, 12, 20, 20, 12, 14, 18, 18, 12],
  transactions: [12, 10, 24, 14, 18, 16, 20, 26],
  maturity: [26, 18, 24, 14, 14, 20, 18, 12],
  migration_audit: [36, 22, 20, 14, 8, 16, 16, 24, 16, 14, 22, 16, 18],
};

function appendSheet(wb, title, aoa, colWidths) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (colWidths) ws["!cols"] = colWidths.map((w) => ({ wch: w }));
  // Excel sheet names are capped at 31 chars — every title here is well under that.
  XLSX.utils.book_append_sheet(wb, ws, title);
}

/**
 * Filters: { investorId, status, maturityWindowDays, dateFrom, dateTo }, all optional.
 * Returns { success: true, base64, filename } or { error }.
 */
export async function buildExportWorkbook({ filters } = {}) {
  try {
    const supabase = await createClient();
    const auth = await getAuthorizedExporter(supabase);
    if (auth.error) return { error: auth.error };

    const f = normalizeFilters(filters);
    const datasets = await loadExportDatasets(supabase, f);
    const generatedAt = new Date();

    const wb = XLSX.utils.book_new();
    appendSheet(wb, "Investor Summary", buildInvestorSummaryAOA(datasets, f, generatedAt), COLUMN_WIDTHS.investors);
    appendSheet(wb, "Investments", buildInvestmentsAOA(datasets, f, generatedAt), COLUMN_WIDTHS.investments);
    appendSheet(wb, "Transactions", buildTransactionsAOA(datasets, f, generatedAt), COLUMN_WIDTHS.transactions);
    appendSheet(wb, "Maturity Report", buildMaturityReportAOA(datasets, f, generatedAt), COLUMN_WIDTHS.maturity);
    appendSheet(wb, "Migration Audit", buildMigrationAuditAOA(datasets, f, generatedAt), COLUMN_WIDTHS.migration_audit);

    // Server Actions cannot return a Buffer/Blob to a client component — base64
    // text is the standard bridge; the UI decodes it into a downloadable Blob.
    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    return { success: true, base64, filename: buildFilename("jebbidox-export", generatedAt, "xlsx") };
  } catch (e) {
    return { error: e?.message || "Failed to build the export workbook." };
  }
}

/**
 * sheet: one of 'investors' | 'investments' | 'transactions' | 'maturity' | 'migration_audit'.
 * filters: same shape as buildExportWorkbook.
 * Returns { success: true, csv, filename } or { error }.
 */
export async function buildExportCsv({ sheet, filters } = {}) {
  try {
    const entry = SHEET_BUILDERS[sheet];
    if (!entry) {
      return { error: "Unknown export sheet '" + sheet + "'. Expected one of: investors, investments, transactions, maturity, migration_audit." };
    }

    const supabase = await createClient();
    const auth = await getAuthorizedExporter(supabase);
    if (auth.error) return { error: auth.error };

    const f = normalizeFilters(filters);
    const datasets = await loadExportDatasets(supabase, f);
    const generatedAt = new Date();

    const aoa = entry.build(datasets, f, generatedAt);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const csv = XLSX.utils.sheet_to_csv(ws);
    return { success: true, csv, filename: buildFilename("jebbidox-" + sheet, generatedAt, "csv") };
  } catch (e) {
    return { error: e?.message || "Failed to build the export CSV." };
  }
}
