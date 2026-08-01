import { fmtDate, fmtDateTime, fmtUGX } from "@/lib/format";

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/**
 * A single deposit or withdrawal, rendered like a bank-issued paper receipt.
 */
export function buildReceiptHtml({ org, investor, kind, transaction }) {
  const isDeposit = kind === "deposit";
  const amount = isDeposit ? transaction.amount : (transaction.netAmount ?? transaction.amount);
  const date = isDeposit ? transaction.createdAt : (transaction.paidAt || transaction.requestedAt);
  // The bank-issued reference number (e.g. "WD-00042") is the only identifier
  // this document ever prints — never the raw database id, which is an
  // internal implementation detail, not something a member should see on a
  // document they can hand to someone else.
  const ref = transaction.referenceNumber || "PENDING";

  return `
    <div class="mono" style="font-size:10.5px; letter-spacing:1.5px; color:var(--ink-faint);">
      ${esc(org.name).toUpperCase()} &middot; ${isDeposit ? "DEPOSIT" : "WITHDRAWAL"} RECEIPT
    </div>
    <div class="display" style="font-size:22px; font-weight:600; margin:14px 0 28px;">
      ${esc(investor.fullName)}
    </div>
    <table>
      <tr><td style="border:none; color:var(--ink-soft);">Receipt No.</td><td class="num" style="border:none;">RCP-${esc(ref)}</td></tr>
      <tr><td style="border:none; color:var(--ink-soft);">Member ID</td><td class="num" style="border:none;">${esc(investor.memberId || "—")}</td></tr>
      <tr><td style="border:none; color:var(--ink-soft);">Amount</td><td class="num" style="border:none; font-weight:700;">${fmtUGX(amount)}</td></tr>
      <tr><td style="border:none; color:var(--ink-soft);">Reference</td><td class="num" style="border:none;">${esc(ref)}</td></tr>
      <tr><td style="border:none; color:var(--ink-soft);">Date</td><td class="num" style="border:none;">${fmtDate(date)}</td></tr>
      <tr><td style="border:none; color:var(--ink-soft);">Status</td><td class="num" style="border:none; text-transform:capitalize;">${esc((transaction.status || "").replace(/_/g, " "))}</td></tr>
    </table>
    <div style="margin-top:36px; padding-top:16px; border-top:1px dashed var(--line); display:flex; justify-content:space-between; font-size:11px; color:var(--ink-faint);">
      <span>Generated ${fmtDateTime(new Date())}</span>
      <span>${esc(org.name)} &middot; ${esc(org.address)}</span>
    </div>
  `;
}

/**
 * A full account statement — every deposit, investment activation, and
 * withdrawal event for this investor, in date order, with a running balance
 * (deposits/activations credit the ledger, withdrawal payouts debit it).
 */
export function buildStatementHtml({ org, investor, events, periodLabel }) {
  let running = 0;
  const rows = events.map((e) => {
    const signed = e.direction === "debit" ? -e.amount : e.amount;
    running += signed;
    return `
      <tr>
        <td>${fmtDate(e.date)}</td>
        <td>${esc(e.label)}</td>
        <td class="num">${e.direction === "debit" ? fmtUGX(e.amount) : "—"}</td>
        <td class="num">${e.direction === "debit" ? "—" : fmtUGX(e.amount)}</td>
        <td class="num" style="font-weight:600;">${fmtUGX(running)}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px;">
      <div>
        <div class="display" style="font-size:20px; font-weight:600;">${esc(org.name)}</div>
        <div style="font-size:11.5px; color:var(--ink-faint); margin-top:4px;">${esc(org.address)} &middot; ${esc(org.email)}</div>
      </div>
      <div style="text-align:right;">
        <div class="mono" style="font-size:10.5px; letter-spacing:1.5px; color:var(--ink-faint);">ACCOUNT STATEMENT</div>
        <div style="font-size:12.5px; margin-top:4px;">${esc(periodLabel)}</div>
      </div>
    </div>
    <div style="display:flex; gap:32px; margin-bottom:24px; font-size:12.5px;">
      <div><span style="color:var(--ink-faint);">Member</span><br/><strong>${esc(investor.fullName)}</strong></div>
      <div><span style="color:var(--ink-faint);">Member ID</span><br/><strong class="mono">${esc(investor.memberId || "—")}</strong></div>
    </div>
    <table>
      <thead><tr><th>Date</th><th>Description</th><th style="text-align:right;">Debit</th><th style="text-align:right;">Credit</th><th style="text-align:right;">Balance</th></tr></thead>
      <tbody>
        ${rows || `<tr><td colspan="5" style="text-align:center; color:var(--ink-faint);">No activity in this period.</td></tr>`}
      </tbody>
    </table>
    <div style="margin-top:36px; padding-top:16px; border-top:1px dashed var(--line); display:flex; justify-content:space-between; font-size:11px; color:var(--ink-faint);">
      <span>Generated ${fmtDateTime(new Date())} &middot; Ref STMT-${esc(investor.memberId || "MEMBER")}-${Date.now().toString().slice(-5)}</span>
      <span>Closing balance: ${fmtUGX(running)}</span>
    </div>
  `;
}
