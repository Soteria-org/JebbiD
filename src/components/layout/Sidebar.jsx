import React from "react";
import { LogOut, TrendingUp, X } from "@/components/icons/index";
import { RoleSwitcher, navItemPickerStyle } from "@/components/layout/RoleSwitcher";
import { Avatar } from "@/components/ui/primitives";
import { NAV, ROLE_LABEL } from "@/lib/constants";
import { C, FONT_DISPLAY } from "@/lib/theme";

export function Sidebar({ ctx }) {
  const items = NAV[ctx.session.role];
  const showOverlay = ctx.isMobile && ctx.sidebarOpen;
  const sidebarStyle = ctx.isMobile
    ? { position: "fixed", top: 0, left: 0, height: "100vh", width: 264, zIndex: 400,
        transform: ctx.sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.2s" }
    : { position: "relative", width: 248, height: "100vh", flexShrink: 0 };

  return (
    <>
      {showOverlay ? <div onClick={() => ctx.setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 390 }} /> : null}
      <div style={Object.assign({ background: C.sidebarBg, color: C.sidebarText, display: "flex", flexDirection: "column",
        padding: "20px 14px", boxSizing: "border-box" }, sidebarStyle)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 22px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={17} color={C.white} />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: C.white }}>Jebbidox</div>
          {ctx.isMobile ? <div onClick={() => ctx.setSidebarOpen(false)} style={{ marginLeft: "auto", cursor: "pointer", color: C.sidebarText }}><X size={20} /></div> : null}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {items.map((it) => {
            const active = ctx.view === it.key;
            return (
              <div key={it.key} onClick={() => { ctx.goTo(it.key); if (ctx.isMobile) ctx.setSidebarOpen(false); }} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9, cursor: "pointer",
                marginBottom: 3, background: active ? C.sidebarActive : "transparent", color: active ? C.white : C.sidebarText,
                fontSize: 13.5, fontWeight: 600, transition: "background 0.12s",
              }}>
                <it.icon size={16} /> {it.label}
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: "1px solid " + C.sidebarHover, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 4px" }}>
            <Avatar name={ctx.currentUserName} size={32} />
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ctx.currentUserName}</div>
              <div style={{ fontSize: 11.5, color: C.sidebarTextDim }}>{ROLE_LABEL[ctx.session.role]}</div>
            </div>
          </div>
          {process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCHER === "true" && <RoleSwitcher ctx={ctx} />}
          <div onClick={ctx.logout} style={Object.assign({}, navItemPickerStyle, { color: C.sidebarText, background: "transparent" })}>
            <LogOut size={15} /> Sign Out
          </div>
        </div>
      </div>
    </>
  );
}
