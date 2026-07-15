import React from "react";
import { ArrowUpRight, Award, Banknote, Bell, CheckCircle2, Clock, Sparkles, XCircle } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Card, EmptyState } from "@/components/ui/primitives";
import { fmtDateTime } from "@/lib/format";
import { C } from "@/lib/theme";

export function NotificationsScreen({ ctx }) {
  const list = ctx.notifications.filter((n) => n.investorId === ctx.session.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const iconFor = { registration: Sparkles, deposit_submitted: Clock, deposit_approved: CheckCircle2, deposit_rejected: XCircle,
    withdrawal_submitted: ArrowUpRight, withdrawal_paid: Banknote, maturity: Award };
  return (
    <PageShell ctx={ctx} title="Notifications">
      <Card padded={false}>
        {list.length === 0 ? <div style={{ padding: 24 }}><EmptyState icon={Bell} title="No notifications" body="You're all caught up." /></div> : list.map((n, i) => {
          const Ic = iconFor[n.type] || Bell;
          return (
            <div key={n.id} onClick={() => ctx.markNotificationRead(n.id)} style={{
              display: "flex", gap: 12, padding: "15px 20px", borderBottom: i === list.length - 1 ? "none" : "1px solid " + C.line,
              cursor: "pointer", background: n.read ? C.white : C.cardBg,
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: C.white, border: "1px solid " + C.line, display: "flex", alignItems: "center", justifyContent: "center", color: C.brand, flexShrink: 0 }}><Ic size={16} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, color: C.ink, fontWeight: n.read ? 500 : 700 }}>{n.message}</div>
                <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 3 }}>{fmtDateTime(n.timestamp)}</div>
              </div>
              {!n.read ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.brand, marginTop: 5, flexShrink: 0 }} /> : null}
            </div>
          );
        })}
      </Card>
    </PageShell>
  );
}
