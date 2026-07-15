import React, { useState } from "react";
import { Search, ShieldCheck, User } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { GuidanceBanner, TableWrap, Td, Th, inputStyle } from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";
import { C } from "@/lib/theme";

export function AuditLogsScreen({ ctx }) {
  const [q, setQ] = useState("");
  const list = [...ctx.auditLog].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .filter((a) => (a.user + a.action + a.newValue).toLowerCase().includes(q.toLowerCase()));
  return (
    <PageShell ctx={ctx} title="Audit Logs">
      <GuidanceBanner tone="info" icon={ShieldCheck}>No financial record is ever deleted. Every action below is permanent and immutable.</GuidanceBanner>
      <div style={{ position: "relative", maxWidth: 320, marginBottom: 16 }}>
        <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: C.inkFaint }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search audit log..." style={Object.assign({}, inputStyle, { paddingLeft: 36 })} />
      </div>
      <TableWrap>
        <thead><tr><Th>User</Th><Th>Action</Th><Th>Previous Value</Th><Th>New Value</Th><Th>Timestamp</Th></tr></thead>
        <tbody>{list.map((a) => <tr key={a.id}><Td><strong>{a.user}</strong></Td><Td>{a.action}</Td><Td>{a.previousValue}</Td><Td>{a.newValue}</Td><Td>{fmtDateTime(a.timestamp)}</Td></tr>)}</tbody>
      </TableWrap>
    </PageShell>
  );
}
