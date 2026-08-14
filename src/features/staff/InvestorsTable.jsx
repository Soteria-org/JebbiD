import React, { useState } from "react";
import { Search, UserPlus } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Avatar, Badge, Btn, TableWrap, Td, Th, inputStyle } from "@/components/ui/primitives";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";
import { isVerifiedInvestor } from "@/lib/verification";

/**
 * Spec §2.3: three separate, honestly-labeled columns instead of one
 * overloaded status — "do we have their historical money, have they
 * completed current documentation, and can staff treat them as fully
 * verified" are three different questions and stay three different cells.
 */
function kycBadge(kycStatus) {
  if (kycStatus === "approved") return <Badge tone="success">Approved</Badge>;
  if (kycStatus === "pending") return <Badge tone="warning">Pending</Badge>;
  if (kycStatus === "rejected") return <Badge tone="danger">Rejected</Badge>;
  return <Badge tone="neutral">Incomplete</Badge>;
}

function investorStatusLabel(i) {
  if (i.kycStatus === "approved") return { label: "Verified", tone: "success", showBadge: true };
  if (i.kycStatus === "pending") return { label: "KYC Pending", tone: "warning" };
  return { label: "Profile Incomplete", tone: "neutral" };
}

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
        <Btn icon={UserPlus} onClick={() => ctx.openModal("addInvestor", {})} testId="open-add-investor">Add Investor</Btn>
      </div>
      <TableWrap>
        <thead><tr><Th>Investor</Th><Th>Member ID</Th><Th>Positions</Th><Th>Total Invested</Th><Th>Financial History</Th><Th>KYC</Th><Th>Status</Th><Th></Th></tr></thead>
        <tbody>
          {filtered.map((i) => {
            const pos = ctx.getInvestorInvestments(i.id);
            const total = pos.filter((p) => p.status === "active").reduce((s, p) => s + p.amount, 0);
            const statusInfo = investorStatusLabel(i);
            return (
              <tr key={i.id}>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <Avatar name={i.fullName} size={28} />
                      {isVerifiedInvestor(i) ? <VerifiedBadge size={13} style={{ position: "absolute", right: -2, bottom: -2 }} /> : null}
                    </div>
                    {i.fullName}
                  </div>
                </Td>
                <Td>{i.memberId}</Td>
                <Td>{pos.length}</Td>
                <Td>{fmtUGX(total)}</Td>
                <Td>{i.migrationStatus === "migrated" ? <Badge tone="info">Imported</Badge> : "—"}</Td>
                <Td>{kycBadge(i.kycStatus)}</Td>
                <Td><Badge tone={statusInfo.tone}>{statusInfo.label}</Badge></Td>
                <Td><Btn size="sm" variant="ghost" onClick={() => { ctx.setSelectedInvestorId(i.id); ctx.goTo("investorDetail"); }}>View</Btn></Td>
              </tr>
            );
          })}
        </tbody>
      </TableWrap>
    </PageShell>
  );
}
