import React, { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck, User, UserCog } from "@/components/icons/index";
import { Avatar } from "@/components/ui/primitives";
import { C } from "@/lib/theme";

export const navItemPickerStyle = { display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13.5, color: C.ink, fontWeight: 600 };

export function RoleSwitcher({ ctx }) {
  const [open, setOpen] = useState(false);
  const [pickInvestor, setPickInvestor] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <div onClick={() => { setOpen(!open); setPickInvestor(false); }} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: 9,
        border: "1px solid " + C.sidebarHover, cursor: "pointer", color: C.sidebarText, fontSize: 12.5, fontWeight: 600,
      }}>
        <RefreshCw size={14} /> Switch Demo Role <ChevronDown size={13} style={{ marginLeft: "auto" }} />
      </div>
      {open ? (
        <div style={{ position: "absolute", bottom: "110%", left: 0, width: 250, background: C.white, borderRadius: 12,
          boxShadow: "0 12px 36px rgba(0,0,0,0.3)", padding: 8, zIndex: 600, maxHeight: 320, overflowY: "auto" }}>
          {!pickInvestor ? (
            <>
              <div onClick={() => { ctx.quickLoginAdmin(); setOpen(false); }} style={navItemPickerStyle}>
                <ShieldCheck size={15} /> Super Administrator
              </div>
              {ctx.financeOfficers.map((fo) => (
                <div key={fo.id} onClick={() => { ctx.switchToFO(fo.id); setOpen(false); }} style={navItemPickerStyle}>
                  <UserCog size={15} /> {fo.name}
                </div>
              ))}
              <div onClick={() => setPickInvestor(true)} style={navItemPickerStyle}>
                <User size={15} /> Investor… <ChevronRight size={13} style={{ marginLeft: "auto" }} />
              </div>
            </>
          ) : (
            <>
              <div onClick={() => setPickInvestor(false)} style={Object.assign({}, navItemPickerStyle, { color: C.inkFaint })}>
                <ChevronLeft size={15} /> Back
              </div>
              {ctx.investors.map((inv) => (
                <div key={inv.id} onClick={() => { ctx.switchToInvestor(inv.id); setOpen(false); }} style={navItemPickerStyle}>
                  <Avatar name={inv.fullName} size={22} /> {inv.fullName}
                </div>
              ))}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
