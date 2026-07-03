import React, { useState } from "react";
import { ArrowUpRight, Briefcase, ChevronLeft, Plus } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState, GuidanceBanner, TableWrap, Td, Th, statusBadge } from "@/components/ui/primitives";
import { RATES } from "@/lib/constants";
import { expectedReturn, fmtDate, fmtUGX, maturityValue } from "@/lib/format";
import { C, FONT_DISPLAY } from "@/lib/theme";

export function MyInvestments({ ctx }) {
  const [detail, setDetail] = useState(null);
  const positions = ctx.getInvestorInvestments(ctx.session.id);
  if (detail) {
    const p = positions.find((x) => x.id === detail);
    return (
      <PageShell ctx={ctx} title="Investment Detail">
        <div onClick={() => setDetail(null)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: C.inkFaint, fontSize: 13, marginBottom: 16 }}>
          <ChevronLeft size={15} /> Back to My Investments
        </div>
        <Card style={{ maxWidth: 640 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: C.ink }}>{p.id}</div>
              <div style={{ fontSize: 13, color: C.inkSoft, textTransform: "capitalize" }}>{p.package} Package · {p.goal}</div>
            </div>
            {statusBadge(p.status)}
          </div>
          {[["Amount Invested", fmtUGX(p.amount)], ["Annual Return Rate", (RATES[p.package] * 100) + "%"],
            ["Expected Return", fmtUGX(p.expectedReturn)], ["Estimated Maturity Value", fmtUGX(p.maturityValue)],
            ["Submitted", fmtDate(p.createdAt)], ["Start Date", p.startDate ? fmtDate(p.startDate) : "Pending approval"],
            ["Maturity Date", p.maturityDate ? fmtDate(p.maturityDate) : "—"]].map((r) => (
            <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
              <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
            </div>
          ))}
          {p.status === "rejected" && p.rejectionReason ? (
            <GuidanceBanner tone="warning">Rejected: {p.rejectionReason}</GuidanceBanner>
          ) : null}
          {p.status === "active" ? (
            <div style={{ marginTop: 18 }}>
              <Btn variant="outline" icon={ArrowUpRight} onClick={() => ctx.openModal("requestWithdrawal", { investmentId: p.id })}>Request Withdrawal</Btn>
            </div>
          ) : null}
        </Card>
      </PageShell>
    );
  }
  return (
    <PageShell ctx={ctx} title="My Investments">
      {positions.length === 0 ? (
        <Card><EmptyState icon={Briefcase} title="No investments yet" body="Start your first investment to see it listed here." action={<Btn icon={Plus} onClick={() => ctx.goTo("invest")}>Start Investing</Btn>} /></Card>
      ) : (
        <TableWrap>
          <thead><tr><Th>Position</Th><Th>Package</Th><Th>Amount</Th><Th>Goal</Th><Th>Maturity</Th><Th>Status</Th><Th></Th></tr></thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id}>
                <Td><strong>{p.id}</strong></Td>
                <Td style={{ textTransform: "capitalize" }}>{p.package}</Td>
                <Td>{fmtUGX(p.amount)}</Td>
                <Td>{p.goal}</Td>
                <Td>{p.maturityDate ? fmtDate(p.maturityDate) : "—"}</Td>
                <Td>{statusBadge(p.status)}</Td>
                <Td><Btn size="sm" variant="ghost" onClick={() => setDetail(p.id)}>View</Btn></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </PageShell>
  );
}
