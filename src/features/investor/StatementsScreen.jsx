import React, { useState } from "react";
import { Download, FileText } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState, Modal, TableWrap, Td, Th, statusBadge } from "@/components/ui/primitives";
import { fmtUGX } from "@/lib/format";
import { C } from "@/lib/theme";

export function StatementsScreen({ ctx }) {
  const [viewing, setViewing] = useState(null);
  const inv = ctx.currentInvestor;
  const positions = inv ? (ctx.getInvestorInvestments?.(inv.id) || []) : [];
  const months = ["June 2026", "May 2026", "April 2026", "March 2026", "Year-to-Date 2026"];
  if (!inv) {
    return (
      <PageShell ctx={ctx} title="Statements">
        <Card><EmptyState icon={FileText} title="No investor session" body="Log in as an investor to view statement history." /></Card>
      </PageShell>
    );
  }
  return (
    <PageShell ctx={ctx} title="Statements">
      <Card padded={false}>
        {months.map((m, i) => (
          <div key={m} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderBottom: i === months.length - 1 ? "none" : "1px solid " + C.line }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <FileText size={18} color={C.brand} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>Statement — {m}</div>
                <div style={{ fontSize: 12, color: C.inkFaint }}>Generated for {inv.fullName}</div>
              </div>
            </div>
            <Btn size="sm" variant="ghost" icon={Download} onClick={() => setViewing(m)}>View</Btn>
          </div>
        ))}
      </Card>
      {viewing ? (
        <Modal title={"Statement — " + viewing} onClose={() => setViewing(null)} width={520}>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 4 }}>{ctx.org.name}</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>Member: {inv.fullName} ({inv.memberId})</div>
          <TableWrap>
            <thead><tr><Th>Position</Th><Th>Package</Th><Th>Principal</Th><Th>Status</Th></tr></thead>
            <tbody>
              {positions.map((p) => <tr key={p.id}><Td>{p.id}</Td><Td style={{ textTransform: "capitalize" }}>{p.package}</Td><Td>{fmtUGX(p.amount)}</Td><Td>{statusBadge(p.status)}</Td></tr>)}
            </tbody>
          </TableWrap>
          <div style={{ marginTop: 16 }}><Btn full variant="outline" icon={Download} onClick={() => ctx.showToast("Statement generated (demo only).", "info")}>Download PDF</Btn></div>
        </Modal>
      ) : null}
    </PageShell>
  );
}
