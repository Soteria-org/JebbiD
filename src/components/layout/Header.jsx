import React from "react";
import { Bell, Menu } from "@/components/icons/index";
import { Badge } from "@/components/ui/primitives";
import { fmtDate } from "@/lib/format";
import { C, FONT_DISPLAY } from "@/lib/theme";

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
