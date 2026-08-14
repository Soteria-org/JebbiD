import React, { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { TableWrap, Td, Th, statusBadge } from "@/components/ui/primitives";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { currentValue, fmtDate, fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";
import { isVerifiedInvestor } from "@/lib/verification";

export function AllInvestments({ ctx }) {
  const [filter, setFilter] = useState("all");
  let list = [...ctx.investments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (filter !== "all") list = list.filter((p) => p.status === filter);
  return (
    <PageShell ctx={ctx} title="All Investments">
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {["all", "active", "pending_verification", "matured", "rejected", "withdrawn"].map((f) => (
          <div key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: filter === f ? C.brand : C.cardBg, color: filter === f ? C.white : C.inkSoft, textTransform: "capitalize",
          }}>{f.replace("_", " ")}</div>
        ))}
      </div>
      <TableWrap>
        <thead><tr><Th>Position</Th><Th>Investor</Th><Th>Package</Th><Th>Amount</Th><Th>Current Value</Th><Th>Maturity</Th><Th>Status</Th></tr></thead>
        <tbody>{list.map((p) => {
          const investor = ctx.getInvestor(p.investorId);
          return (
            <tr key={p.id}>
              <Td><strong>{p.referenceNumber || "—"}</strong></Td>
              <Td>
                <span onClick={() => { ctx.setSelectedInvestorId(investor.id); ctx.goTo("investorDetail"); }} style={{ cursor: "pointer", color: C.brand, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {investor.fullName}
                  {isVerifiedInvestor(investor) ? <VerifiedBadge size={14} /> : null}
                </span>
              </Td>
              <Td style={{ textTransform: "capitalize" }}>{p.package}</Td>
              <Td>{fmtUGX(p.amount)}</Td>
              <Td>{p.status === "active" ? fmtUGX(currentValue(p.amount, p.package, p.startDate, p.maturityDate)) : "—"}</Td>
              <Td>{p.maturityDate ? fmtDate(p.maturityDate) : "—"}</Td>
              <Td>{statusBadge(p.status)}</Td>
            </tr>
          );
        })}</tbody>
      </TableWrap>
    </PageShell>
  );
}
