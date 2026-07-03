import React, { useState } from "react";
import { Check, XCircle } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Field, Modal, TableWrap, Td, TextArea, TextInput, Th, statusBadge } from "@/components/ui/primitives";
import { fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";

export function WithdrawalsQueue({ ctx }) {
  const all = [...ctx.withdrawals].sort((a, b) => b.requestedAt - a.requestedAt);
  const [paying, setPaying] = useState(null);
  const [ref, setRef] = useState("");
  const [payDate, setPayDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  return (
    <PageShell ctx={ctx} title="Withdrawals">
      <TableWrap>
        <thead><tr><Th>Reference</Th><Th>Investor</Th><Th>Amount</Th><Th>Penalty</Th><Th>Net Payable</Th><Th>Method</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {all.length === 0 ? <tr><Td style={{ color: C.inkFaint }}>No withdrawal requests yet.</Td></tr> : all.map((w) => {
            const investor = ctx.getInvestor(w.investorId);
            return (
              <tr key={w.id}>
                <Td><strong>{w.id}</strong></Td>
                <Td>{investor.fullName}</Td>
                <Td>{fmtUGX(w.amount)}</Td>
                <Td>{w.penalty > 0 ? fmtUGX(w.penalty) : "None"}</Td>
                <Td><strong>{fmtUGX(w.netAmount)}</strong></Td>
                <Td style={{ textTransform: "capitalize" }}>{w.paymentMethod.replace("_", " ")}</Td>
                <Td>{statusBadge(w.status)}</Td>
                <Td>
                  {w.status === "pending" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn size="sm" variant="success" icon={Check} onClick={() => setPaying(w.id)}>Mark Paid</Btn>
                      <Btn size="sm" variant="danger" icon={XCircle} onClick={() => setRejecting(w.id)}>Reject</Btn>
                    </div>
                  ) : <span style={{ fontSize: 12, color: C.inkFaint }}>{w.transactionRef || "—"}</span>}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>

      {paying ? (
        <Modal title="Mark Withdrawal as Paid" onClose={() => setPaying(null)}>
          <Field label="Transaction Reference"><TextInput value={ref} onChange={setRef} placeholder="e.g. MTN Reference, Bank Reference" /></Field>
          <Field label="Payment Date"><TextInput value={payDate} onChange={setPayDate} placeholder="e.g. 30 Jun 2026" /></Field>
          <Field label="Notes" hint="Optional"><TextArea value={notes} onChange={setNotes} rows={2} /></Field>
          <Btn full variant="success" disabled={!ref} onClick={() => { ctx.markWithdrawalPaid(paying, ref, payDate, notes); setPaying(null); setRef(""); setPayDate(""); setNotes(""); }}>Confirm Payment</Btn>
        </Modal>
      ) : null}
      {rejecting ? (
        <Modal title="Reject Withdrawal" onClose={() => setRejecting(null)}>
          <Field label="Reason"><TextArea value={reason} onChange={setReason} rows={3} /></Field>
          <Btn full variant="danger" disabled={!reason} onClick={() => { ctx.rejectWithdrawal(rejecting, reason); setRejecting(null); setReason(""); }}>Confirm Rejection</Btn>
        </Modal>
      ) : null}
    </PageShell>
  );
}
