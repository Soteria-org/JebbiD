import React, { useState } from "react";
import { ChevronLeft, IdCard } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Avatar, Card, GuidanceBanner, TableWrap, Td, Th, statusBadge } from "@/components/ui/primitives";
import { fmtDate, fmtUGX } from "@/lib/format";
import { C, FONT_DISPLAY } from "@/lib/theme";
import { KYCUploadPanel } from "@/features/kyc/KYCUploadPanel";

export function InvestorDetailScreen({ ctx }) {
  const [tab, setTab] = useState("overview");
  const inv = ctx.getInvestor(ctx.selectedInvestorId);
  const positions = ctx.getInvestorInvestments(inv.id);
  const deposits = positions;
  if (!inv) return null;
  return (
    <PageShell ctx={ctx} title="Investor Detail">
      <div onClick={() => ctx.goTo("investors")} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: C.inkFaint, fontSize: 13, marginBottom: 14 }}>
        <ChevronLeft size={15} /> Back to Investors
      </div>
      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={inv.fullName} size={52} />
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 19, fontWeight: 600, color: C.ink }}>{inv.fullName}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{inv.memberId} · {inv.email} · {inv.phone}</div>
          </div>
        </div>
      </Card>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["overview", "Overview"], ["investments", "Investments"], ["nextofkin", "Next of Kin"], ["deposits", "Deposit History"], ["kyc", "KYC Documents"]].map((t) => (
          <div key={t[0]} onClick={() => setTab(t[0])} style={{ padding: "9px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer", background: tab === t[0] ? C.brand : C.cardBg, color: tab === t[0] ? C.white : C.inkSoft }}>{t[1]}</div>
        ))}
      </div>

      {tab === "overview" && (
        <Card style={{ maxWidth: 560 }}>
          {[["Member ID", inv.memberId], ["National ID", inv.nationalId], ["Address", inv.address], ["Occupation", inv.occupation],
            ["Financial Goal", inv.goal], ["Registered", fmtDate(inv.dateRegistered)]].map((r) => (
            <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
              <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
            </div>
          ))}
        </Card>
      )}
      {tab === "investments" && (
        <TableWrap>
          <thead><tr><Th>Position</Th><Th>Package</Th><Th>Amount</Th><Th>Maturity</Th><Th>Status</Th></tr></thead>
          <tbody>{positions.map((p) => <tr key={p.id}><Td>{p.id}</Td><Td style={{ textTransform: "capitalize" }}>{p.package}</Td><Td>{fmtUGX(p.amount)}</Td><Td>{p.maturityDate ? fmtDate(p.maturityDate) : "—"}</Td><Td>{statusBadge(p.status)}</Td></tr>)}</tbody>
        </TableWrap>
      )}
      {tab === "nextofkin" && (
        <Card style={{ maxWidth: 480 }}>
          <GuidanceBanner tone="info" icon={IdCard}>Next of Kin information is visible to Finance Officers and Super Administrators only.</GuidanceBanner>
          {[["Full Name", inv.nextOfKin.name], ["Relationship", inv.nextOfKin.relationship], ["Phone", inv.nextOfKin.phone], ["Address", inv.nextOfKin.address]].map((r) => (
            <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
              <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
            </div>
          ))}
        </Card>
      )}
      {tab === "deposits" && (
        <TableWrap>
          <thead><tr><Th>Position</Th><Th>Amount</Th><Th>Submitted</Th><Th>Status</Th></tr></thead>
          <tbody>{deposits.map((p) => <tr key={p.id}><Td>{p.id}</Td><Td>{fmtUGX(p.amount)}</Td><Td>{fmtDate(p.createdAt)}</Td><Td>{statusBadge(p.depositStatus)}</Td></tr>)}</tbody>
        </TableWrap>
      )}
      {tab === "kyc" && (
        <Card style={{ maxWidth: 560 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>KYC Documents — {inv.fullName}</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
            Upload documents on behalf of this investor, or review and verify documents they have submitted.
          </div>
          <KYCUploadPanel investorProfileId={inv.id} staffMode={true} />
        </Card>
      )}
    </PageShell>
  );
}
