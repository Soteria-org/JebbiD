import React, { useState } from "react";
import { Phone, Search, UserPlus } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Avatar, Btn, TableWrap, Td, Th, inputStyle } from "@/components/ui/primitives";
import { fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";

export function InvestorsTable({ ctx }) {
  const [q, setQ] = useState("");
  const filtered = ctx.investors.filter((i) => (i.fullName + i.memberId + i.email).toLowerCase().includes(q.toLowerCase()));
  return (
    <PageShell ctx={ctx} title="Investors">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", maxWidth: 320, flex: 1 }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: C.inkFaint }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search investors..." style={Object.assign({}, inputStyle, { paddingLeft: 36 })} />
        </div>
        <Btn icon={UserPlus} onClick={() => ctx.openModal("addInvestor", {})}>Add Investor</Btn>
      </div>
      <TableWrap>
        <thead><tr><Th>Investor</Th><Th>Member ID</Th><Th>Phone</Th><Th>Positions</Th><Th>Total Invested</Th><Th></Th></tr></thead>
        <tbody>
          {filtered.map((i) => {
            const pos = ctx.getInvestorInvestments(i.id);
            const total = pos.filter((p) => p.status === "active").reduce((s, p) => s + p.amount, 0);
            return (
              <tr key={i.id}>
                <Td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><Avatar name={i.fullName} size={28} /> {i.fullName}</div></Td>
                <Td>{i.memberId}</Td>
                <Td>{i.phone}</Td>
                <Td>{pos.length}</Td>
                <Td>{fmtUGX(total)}</Td>
                <Td><Btn size="sm" variant="ghost" onClick={() => { ctx.setSelectedInvestorId(i.id); ctx.goTo("investorDetail"); }}>View</Btn></Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </PageShell>
  );
}
