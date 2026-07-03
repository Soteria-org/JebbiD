import React from "react";
import { ArrowUpRight, Plus } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState, TableWrap, Td, Th, statusBadge } from "@/components/ui/primitives";
import { fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";

export function WithdrawalsScreen({ ctx }) {
  const withdrawals = ctx.getInvestorWithdrawals(ctx.session.id);
  const eligible = ctx.getInvestorInvestments(ctx.session.id).filter((p) => p.status === "active");
  return (
    <PageShell ctx={ctx} title="Withdrawals">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13.5, color: C.inkSoft }}>Request a withdrawal from any active investment position.</div>
        <Btn icon={Plus} disabled={eligible.length === 0} onClick={() => ctx.openModal("requestWithdrawal", {})}>Request Withdrawal</Btn>
      </div>
      <Card>
        {withdrawals.length === 0 ? (
          <EmptyState icon={ArrowUpRight} title="No withdrawal requests" body="When you request a withdrawal, it will appear here with its current status." />
        ) : (
          <TableWrap>
            <thead><tr><Th>Reference</Th><Th>Position</Th><Th>Amount</Th><Th>Penalty</Th><Th>Net Payable</Th><Th>Method</Th><Th>Status</Th></tr></thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <Td><strong>{w.id}</strong></Td>
                  <Td>{w.investmentId}</Td>
                  <Td>{fmtUGX(w.amount)}</Td>
                  <Td>{w.penalty > 0 ? fmtUGX(w.penalty) : "None"}</Td>
                  <Td><strong>{fmtUGX(w.netAmount)}</strong></Td>
                  <Td style={{ textTransform: "capitalize" }}>{w.paymentMethod}</Td>
                  <Td>{statusBadge(w.status)}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </PageShell>
  );
}
