import React, { useEffect, useState } from "react";
import { Bell, Menu, RefreshCw } from "@/components/icons/index";
import { Badge } from "@/components/ui/primitives";
import { fmtDate } from "@/lib/format";
import { C, FONT_DISPLAY } from "@/lib/theme";

function SyncIndicator({ ctx }) {
  const [syncing, setSyncing] = useState(false);
  const [, forceTick] = useState(0);
  // Re-render once a second purely so "Synced Xs ago" counts up live, instead of
  // being frozen at whatever it said when this component last happened to render.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  async function doSync() {
    setSyncing(true);
    await ctx.refreshAll();
    setSyncing(false);
  }
  const secsAgo = ctx.lastSyncedAt ? Math.max(0, Math.round((Date.now() - new Date(ctx.lastSyncedAt).getTime()) / 1000)) : null;
  const label = secsAgo === null ? "Not synced yet" : secsAgo < 5 ? "Synced just now" : "Synced " + secsAgo + "s ago";
  return (
    <div onClick={doSync} title="Reload deposits, investments, withdrawals, notifications and (for staff) rosters and audit log right now"
      style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: C.inkFaint, fontSize: 11.5 }}>
      <RefreshCw size={14} style={syncing ? { animation: "spin 0.8s linear infinite" } : undefined} />
      <span>{syncing ? "Syncing…" : label}</span>
      <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}

export function Header({ ctx, title }) {
  // Previously hardcoded to investors only, and against a frozen June 30 2026
  // constant. ctx.notifications now loads real rows for whichever role is signed
  // in (see useJBDocsStore's reloadMyNotifications), so the bell works for staff
  // too — this is part of what makes a Finance Officer actually see "deposit
  // awaiting review" alerts instead of only finding them by checking the queue.
  const unread = ctx.notifications.filter((n) => n.investorId === ctx.session.id && !n.read).length;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 24px", borderBottom: "1px solid " + C.line, background: C.white, position: "sticky", top: 0, zIndex: 100 }}>
      {ctx.isMobile ? (
        <div onClick={() => ctx.setSidebarOpen(!ctx.sidebarOpen)} style={{ cursor: "pointer", color: C.ink, padding: 4 }}>
          <Menu size={22} />
        </div>
      ) : null}
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: C.ink }}>{title}</div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
        <SyncIndicator ctx={ctx} />
        <div onClick={() => ctx.goTo("notifications")} style={{ position: "relative", cursor: "pointer", color: C.inkSoft }}>
          <Bell size={19} />
          {unread > 0 ? <div style={{ position: "absolute", top: -4, right: -4, background: C.brand, color: C.white, fontSize: 10,
            width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{unread}</div> : null}
        </div>
        <Badge tone="neutral">{fmtDate(new Date())}</Badge>
      </div>
    </div>
  );
}
