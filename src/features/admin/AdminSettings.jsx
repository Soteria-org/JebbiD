import React, { useState } from "react";
import { UserPlus } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Badge, Btn, Card, Field, GuidanceBanner, TableWrap, Td, TextInput, Th } from "@/components/ui/primitives";
import { CORPORATE_THRESHOLD } from "@/lib/constants";
import { fmtDate, fmtUGX } from "@/lib/format";
import { C, FONT_DISPLAY } from "@/lib/theme";

export function AdminSettings({ ctx }) {
  const [tab, setTab] = useState("organisation");
  const [createdFO, setCreatedFO] = useState(null);

  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confPw, setConfPw] = useState(""); const [pwErr, setPwErr] = useState(""); const [pwSaving, setPwSaving] = useState(false);
  async function changePw() {
    if (!curPw) { setPwErr("Enter your current password."); return; }
    if (newPw.length < 6) { setPwErr("New password must be at least 6 characters."); return; }
    if (newPw !== confPw) { setPwErr("Passwords do not match."); return; }
    setPwErr(""); setPwSaving(true);
    const result = await ctx.changeMyPassword(curPw, newPw);
    setPwSaving(false);
    if (!result.ok) { setPwErr(result.error); return; }
    setCurPw(""); setNewPw(""); setConfPw("");
  }

  return (
    <PageShell ctx={ctx} title="Settings">
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[["organisation", "Organisation"], ["packages", "Packages & Rates"], ["officers", "Finance Officers"], ["security", "Security"]].map((t) => (
          <div key={t[0]} onClick={() => setTab(t[0])} style={{ padding: "9px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer", background: tab === t[0] ? C.brand : C.cardBg, color: tab === t[0] ? C.white : C.inkSoft }}>{t[1]}</div>
        ))}
      </div>

      {tab === "organisation" && (
        <Card style={{ maxWidth: 540 }}>
          {[["Company Name", ctx.org.name], ["Address", ctx.org.address], ["Contact Phone", ctx.org.phone], ["Contact Email", ctx.org.email]].map((r) => (
            <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
              <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
            </div>
          ))}
          <GuidanceBanner tone="info">Organisation details are read-only in this prototype.</GuidanceBanner>
        </Card>
      )}

      {tab === "packages" && (
        <>
          <GuidanceBanner tone="warning">Package and rate changes apply only to new investments going forward — never to positions already active.</GuidanceBanner>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 560 }}>
            {[{ name: "Standard Package", rate: "30%", thresh: "Below " + fmtUGX(CORPORATE_THRESHOLD) }, { name: "Corporate Package", rate: "40%", thresh: fmtUGX(CORPORATE_THRESHOLD) + " and above" }].map((p) => (
              <Card key={p.name} style={{ background: C.cardBg, border: "1px solid " + C.cardBorder }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 8 }}>{p.name}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 600, color: C.brand, marginBottom: 6 }}>{p.rate}</div>
                <div style={{ fontSize: 12.5, color: C.inkSoft }}>{p.thresh}</div>
                <div style={{ fontSize: 12.5, color: C.inkSoft, marginTop: 4 }}>12-month period · 15% early withdrawal penalty</div>
              </Card>
            ))}
          </div>
        </>
      )}

      {tab === "officers" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <Btn icon={UserPlus} onClick={() => ctx.openModal("createFO", {})}>Create Finance Officer</Btn>
          </div>
          <TableWrap>
            <thead><tr><Th>Name</Th><Th>Email</Th><Th>Created</Th><Th>Password Status</Th></tr></thead>
            <tbody>{ctx.financeOfficers.map((fo) => (
              <tr key={fo.id}>
                <Td><strong>{fo.name}</strong></Td><Td>{fo.email}</Td><Td>{fmtDate(fo.createdAt)}</Td>
                <Td>{fo.mustChangePassword ? <Badge tone="warning">Temporary — change required</Badge> : <Badge tone="success">Set</Badge>}</Td>
              </tr>
            ))}</tbody>
          </TableWrap>
        </>
      )}

      {tab === "security" && (
        <Card style={{ maxWidth: 480 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 14 }}>Change Your Password</div>
          <Field label="Current Password"><TextInput value={curPw} onChange={setCurPw} type="password" /></Field>
          <Field label="New Password"><TextInput value={newPw} onChange={setNewPw} type="password" /></Field>
          <Field label="Confirm New Password"><TextInput value={confPw} onChange={setConfPw} type="password" /></Field>
          {pwErr ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{pwErr}</div> : null}
          <Btn onClick={changePw} disabled={pwSaving}>{pwSaving ? "Updating…" : "Update Password"}</Btn>
        </Card>
      )}
    </PageShell>
  );
}
