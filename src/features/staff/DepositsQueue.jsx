"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Check, Clock, XCircle } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Field, Modal, TableWrap, Td, TextArea, Th, statusBadge } from "@/components/ui/primitives";
import { fmtDate, fmtUGX } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { C } from "@/lib/theme";

function statusLabel(status) {
  const map = { pending: "Pending", approved: "Approved", rejected: "Rejected", clarification_requested: "Clarification" };
  return map[status] || status;
}

/**
 * ProofImage — loads a signed URL from the private payment-proofs bucket.
 * Client-side only (uses browser Supabase client). Falls back gracefully if no
 * proof was attached or the URL generation fails.
 */
function ProofImage({ storagePath }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!storagePath) return;
    const supabase = createClient();
    supabase.storage.from("payment-proofs").createSignedUrl(storagePath, 3600)
      .then(({ data, error }) => {
        if (error || !data?.signedUrl) { setErr(true); return; }
        setUrl(data.signedUrl);
      });
  }, [storagePath]);

  if (!storagePath) return <div style={{ color: C.inkFaint, fontSize: 13 }}>No proof attached</div>;
  if (err) return <div style={{ color: C.danger, fontSize: 13 }}>Could not load proof image</div>;
  if (!url) return <div style={{ color: C.inkFaint, fontSize: 13 }}>Loading…</div>;

  if (storagePath.endsWith(".pdf")) {
    return <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: C.brand }}>Open PDF Receipt</a>;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt="Payment proof" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 10, border: "1px solid " + C.line, display: "block" }} />
      <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 4 }}>Click to open full size</div>
    </a>
  );
}

export function DepositsQueue({ ctx }) {
  const deposits = ctx.depositSubmissions || [];
  const [filter, setFilter] = useState("all");
  const [reviewing, setReviewing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [clarifying, setClarifying] = useState(null);
  const [actionText, setActionText] = useState("");
  const [acting, setActing] = useState(false);

  const displayed = filter === "all" ? deposits : deposits.filter((d) => d.status === filter);

  async function doApprove(depositId) {
    setActing(true);
    await ctx.approveDeposit(depositId);
    setReviewing(null);
    setActing(false);
  }

  async function doReject() {
    if (!actionText || !rejecting) return;
    setActing(true);
    await ctx.rejectDeposit(rejecting.id, actionText);
    setRejecting(null);
    setActionText("");
    setActing(false);
  }

  async function doClarify() {
    if (!actionText || !clarifying) return;
    setActing(true);
    await ctx.requestClarification(clarifying.id, actionText);
    setClarifying(null);
    setActionText("");
    setActing(false);
  }

  return (
    <PageShell ctx={ctx} title="Deposits">
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["all", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["clarification_requested", "Awaiting Clarification"]].map(([key, label]) => {
          const count = key === "all" ? deposits.length : deposits.filter((d) => d.status === key).length;
          return (
            <div key={key} onClick={() => setFilter(key)} style={{
              padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: filter === key ? C.brand : C.cardBg,
              color: filter === key ? C.white : C.inkSoft,
            }}>{label}{count > 0 ? ` (${count})` : ""}</div>
          );
        })}
      </div>

      {displayed.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.inkFaint, fontSize: 13.5 }}>
          {filter === "pending" ? "No deposits awaiting review." : "No deposits found."}
        </div>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Investor</Th><Th>Member ID</Th><Th>Package</Th><Th>Amount</Th>
              <Th>Method</Th><Th>Submitted</Th><Th>Status</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((d) => (
              <tr key={d.id}>
                <Td>{d.investor?.full_name ?? "—"}</Td>
                <Td style={{ fontFamily: "monospace", fontSize: 12 }}>{d.investor?.member_id ?? "—"}</Td>
                <Td>{d.package?.name ?? "—"}</Td>
                <Td><strong>{fmtUGX(d.amount)}</strong></Td>
                <Td>{d.payment_method === "mobile_money" ? (d.network ? d.network + " Mobile Money" : "Mobile Money") : "Bank Transfer"}</Td>
                <Td>{fmtDate(d.created_at)}</Td>
                <Td>{statusBadge(d.status)}</Td>
                <Td>
                  {d.status === "pending" || d.status === "clarification_requested" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn size="sm" variant="outline" onClick={() => setReviewing(d)}>Review</Btn>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: C.inkFaint }}>Resolved</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}

      {/* Full review modal with proof image */}
      {reviewing && (
        <Modal title="Review Deposit" onClose={() => setReviewing(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              ["Investor", reviewing.investor?.full_name],
              ["Member ID", reviewing.investor?.member_id],
              ["Email", reviewing.investor?.email],
              ["Package", reviewing.package?.name],
              ["Amount", fmtUGX(reviewing.amount)],
              ["Payment Method", reviewing.payment_method === "mobile_money" ? (reviewing.network ? reviewing.network + " Mobile Money" : "Mobile Money") : "Bank Transfer"],
              ["Transaction Ref", reviewing.transaction_reference || "—"],
              ["Date Paid", fmtDate(reviewing.date_paid)],
              ["Submitted", fmtDate(reviewing.created_at)],
              ["Financial Goal", reviewing.financial_goal || "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
                <span style={{ color: C.inkSoft }}>{label}</span>
                <strong style={{ color: C.ink, textAlign: "right", maxWidth: "55%" }}>{value}</strong>
              </div>
            ))}
          </div>

          {reviewing.clarification_note && (
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: "12px 14px", margin: "12px 0" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>Previous Note</div>
              <div style={{ fontSize: 13.5, color: "#78350F" }}>{reviewing.clarification_note}</div>
            </div>
          )}

          <div style={{ margin: "16px 0 8px", fontWeight: 700, fontSize: 13.5, color: C.ink }}>Proof of Payment</div>
          <ProofImage storagePath={reviewing.proofStoragePath} />

          {reviewing.status === "pending" || reviewing.status === "clarification_requested" ? (
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <Btn variant="outline" icon={AlertTriangle}
                onClick={() => { setReviewing(null); setClarifying(reviewing); setActionText(""); }}
                style={{ flex: 1, fontSize: 12.5 }}>Ask Investor</Btn>
              <Btn variant="danger" icon={XCircle}
                onClick={() => { setReviewing(null); setRejecting(reviewing); setActionText(""); }}
                style={{ flex: 1, fontSize: 12.5 }}>Reject</Btn>
              <Btn icon={Check} onClick={() => doApprove(reviewing.id)} disabled={acting}
                style={{ flex: 1, fontSize: 12.5, background: C.success, color: C.white }}>
                {acting ? "Approving…" : "Approve"}
              </Btn>
            </div>
          ) : null}
        </Modal>
      )}

      {/* Reject modal */}
      {rejecting && (
        <Modal title="Reject Deposit" onClose={() => { setRejecting(null); setActionText(""); }}>
          <div style={{ fontSize: 13.5, color: C.ink, marginBottom: 12 }}>
            Rejecting deposit of <strong>{fmtUGX(rejecting.amount)}</strong> from <strong>{rejecting.investor?.full_name}</strong>.
            The investor will be notified with this reason.
          </div>
          <Field label="Reason for rejection (shown to investor)">
            <TextArea value={actionText} onChange={setActionText} rows={3} placeholder="e.g. Transaction reference not found, amount mismatch…" />
          </Field>
          <Btn full variant="danger" disabled={!actionText || acting} onClick={doReject}>
            {acting ? "Rejecting…" : "Confirm Rejection"}
          </Btn>
        </Modal>
      )}

      {/* Clarification modal */}
      {clarifying && (
        <Modal title="Request Clarification" onClose={() => { setClarifying(null); setActionText(""); }}>
          <div style={{ fontSize: 13.5, color: C.ink, marginBottom: 12 }}>
            The investor will see this note and can respond with updated information.
          </div>
          <Field label="What do you need from the investor?">
            <TextArea value={actionText} onChange={setActionText} rows={3} placeholder="e.g. Please re-upload a clearer receipt, or confirm the exact amount sent…" />
          </Field>
          <Btn full disabled={!actionText || acting} onClick={doClarify}>
            {acting ? "Sending…" : "Send Clarification Request"}
          </Btn>
        </Modal>
      )}
    </PageShell>
  );
}
