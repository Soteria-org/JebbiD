import React, { useState } from "react";
import { Check, XCircle } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Field, Modal, TableWrap, Td, TextArea, Th, statusBadge } from "@/components/ui/primitives";
import { fmtDate, fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";

export function DepositsQueue({ ctx }) {
  const all = [...ctx.investments].sort((a, b) => b.createdAt - a.createdAt);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  return (
    <PageShell ctx={ctx} title="Deposits">
      <TableWrap>
        <thead><tr><Th>Investor</Th><Th>Position</Th><Th>Package</Th><Th>Amount</Th><Th>Submitted</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
        <tbody>
          {all.map((p) => {
            const investor = ctx.getInvestor(p.investorId);
            return (
              <tr key={p.id}>
                <Td>{investor.fullName}</Td>
                <Td>{p.id}</Td>
                <Td style={{ textTransform: "capitalize" }}>{p.package}</Td>
                <Td>{fmtUGX(p.amount)}</Td>
                <Td>{fmtDate(p.createdAt)}</Td>
                <Td>{statusBadge(p.depositStatus)}</Td>
                <Td>
                  {p.depositStatus === "pending" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn size="sm" variant="success" icon={Check} onClick={() => ctx.approveDeposit(p.id)}>Approve</Btn>
                      <Btn size="sm" variant="danger" icon={XCircle} onClick={() => setRejecting(p.id)}>Reject</Btn>
                    </div>
                  ) : <span style={{ fontSize: 12, color: C.inkFaint }}>Resolved</span>}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
      {rejecting ? (
        <Modal title="Reject Deposit" onClose={() => setRejecting(null)}>
          <Field label="Reason for rejection"><TextArea value={reason} onChange={setReason} rows={3} /></Field>
          <Btn full variant="danger" disabled={!reason} onClick={() => { ctx.rejectDeposit(rejecting, reason); setRejecting(null); setReason(""); }}>Confirm Rejection</Btn>
        </Modal>
      ) : null}
    </PageShell>
  );
}
