import React, { useEffect, useState } from "react";
import { Card, TableWrap, Td, Th } from "@/components/ui/primitives";
import { fmtDate, fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";
import { getInvestorHistoricalWithdrawals } from "@/lib/actions/withdrawal-history-actions";

const PAYMENT_METHOD_LABELS = { mobile_money: "Mobile Money", bank_transfer: "Bank Transfer" };

/**
 * Read-only record of withdrawals the club paid out before this investor
 * existed on the platform. Renders nothing (not even an empty state) when
 * there's nothing to show, so it never clutters a page for the majority of
 * investors who have no historical withdrawals -- unlike live withdrawals,
 * which always show their own page/section even when empty.
 */
export function HistoricalWithdrawalsPanel({ investorId }) {
  const [withdrawals, setWithdrawals] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getInvestorHistoricalWithdrawals(investorId).then((res) => {
      if (!cancelled) setWithdrawals(res.success ? res.withdrawals : []);
    });
    return () => {
      cancelled = true;
    };
  }, [investorId]);

  if (!withdrawals || withdrawals.length === 0) return null;

  return (
    <Card style={{ marginBottom: 18 }} data-testid="historical-withdrawals-panel">
      <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Previous Withdrawals</div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 12 }}>
        Withdrawals paid out by the club before this account existed on the platform, carried over from their records.
      </div>
      <TableWrap>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Amount</Th>
            <Th>Method</Th>
            <Th>Month Covered</Th>
          </tr>
        </thead>
        <tbody>
          {withdrawals.map((w) => (
            <tr key={w.id}>
              <Td>{fmtDate(w.withdrawal_date)}</Td>
              <Td>{fmtUGX(w.amount)}</Td>
              <Td>{PAYMENT_METHOD_LABELS[w.payment_method] || w.payment_method}</Td>
              <Td>{w.month_covered || "—"}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </Card>
  );
}
