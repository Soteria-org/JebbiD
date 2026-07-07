import React, { useState } from "react";
import { ArrowRightLeft, ArrowUpRight, Award, Banknote, Repeat, TrendingUp, Wallet } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Btn, Card, EmptyState, Modal, StatCard } from "@/components/ui/primitives";
import { fmtDate, fmtUGX, todayISO } from "@/lib/format";
import { C } from "@/lib/theme";

export function MaturityCentre({ ctx }) {
  const positions = ctx.getInvestorInvestments(ctx.session.id);
  const today = todayISO();
  const maturable = positions.filter((p) => p.status === "active" && p.maturityDate && p.maturityDate <= today && !p.maturityChoice);
  const [choosing, setChoosing] = useState(null);
  const [confirming, setConfirming] = useState(false);

  async function confirmChoice() {
    setConfirming(true);
    await ctx.chooseMaturityOption(choosing.positionId, choosing.choice);
    setConfirming(false);
    setChoosing(null);
  }

  return (
    <PageShell ctx={ctx} title="Maturity Centre">
      {maturable.length === 0 ? (
        <Card><EmptyState icon={Award} title="No investments at maturity" body="When a position reaches its 12-month maturity date, your options will appear here." /></Card>
      ) : maturable.map((p) => (
        <Card key={p.id} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: C.successBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.success }}><Award size={20} /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>Congratulations — {p.id} has matured</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>Matured {fmtDate(p.maturityDate)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
            <StatCard label="Principal" value={fmtUGX(p.amount)} icon={Wallet} />
            <StatCard label="Returns" value={fmtUGX(p.expectedReturn)} icon={TrendingUp} tone="success" />
            <StatCard label="Total Value" value={fmtUGX(p.maturityValue)} icon={Award} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 10 }}>Choose what happens next</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { key: "reinvest", icon: Repeat, label: "Reinvest Everything", desc: "Roll the full " + fmtUGX(p.maturityValue) + " into a new position" },
              { key: "withdraw_profit", icon: ArrowUpRight, label: "Withdraw Profit Only", desc: "Take out " + fmtUGX(p.expectedReturn) + ", reinvest the principal" },
              { key: "switch_package", icon: ArrowRightLeft, label: "Switch Package", desc: "Move proceeds into the other package" },
              { key: "withdraw_all", icon: Banknote, label: "Withdraw Everything", desc: "Request the full " + fmtUGX(p.maturityValue) },
            ].map((o) => (
              <div key={o.key} onClick={() => setChoosing({ positionId: p.id, choice: o.key })} style={{
                border: "1px solid " + C.line, borderRadius: 11, padding: 14, cursor: "pointer", display: "flex", gap: 10,
              }}>
                <o.icon size={18} color={C.brand} style={{ flexShrink: 0, marginTop: 1 }} />
                <div><div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{o.label}</div><div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>{o.desc}</div></div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {choosing ? (
        <Modal title="Confirm Your Choice" onClose={() => setChoosing(null)}>
          <div style={{ fontSize: 14, color: C.ink, marginBottom: 18, lineHeight: 1.55 }}>
            {choosing.choice === "reinvest" && "This will close the matured position and open a new 12-month investment with the full maturity value as principal."}
            {choosing.choice === "withdraw_profit" && "Your profit will be submitted as a withdrawal request. Your principal will be reinvested into a new 12-month position."}
            {choosing.choice === "switch_package" && "This will close the matured position and open a new 12-month investment in the other package, using the full maturity value as principal."}
            {choosing.choice === "withdraw_all" && "The full maturity value will be submitted as a withdrawal request. No further investment will remain active for this position."}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setChoosing(null)} disabled={confirming}>Cancel</Btn>
            <Btn full onClick={confirmChoice} disabled={confirming}>{confirming ? "Processing…" : "Confirm"}</Btn>
          </div>
        </Modal>
      ) : null}
    </PageShell>
  );
}
