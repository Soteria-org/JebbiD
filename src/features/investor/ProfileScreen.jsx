import React, { useState } from "react";
import { ChevronDown, Edit2, Lock, LogOut, Mail, Phone } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Avatar, Btn, Card, Field, TextInput, Toggle } from "@/components/ui/primitives";
import { TODAY } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { C } from "@/lib/theme";
import { KYCUploadPanel } from "@/features/kyc/KYCUploadPanel";

export function ProfileScreen({ ctx }) {
  const [tab, setTab] = useState("profile");
  const inv = ctx.currentInvestor;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: inv.phone, address: inv.address, occupation: inv.occupation,
    nokName: inv.nextOfKin.name, nokRelationship: inv.nextOfKin.relationship, nokPhone: inv.nextOfKin.phone, nokAddress: inv.nextOfKin.address });
  function set(k, v) { setForm((f) => Object.assign({}, f, { [k]: v })); }
  function save() {
    ctx.updateInvestorProfile(inv.id, {
      phone: form.phone, address: form.address, occupation: form.occupation,
      nextOfKin: { name: form.nokName, relationship: form.nokRelationship, phone: form.nokPhone, address: form.nokAddress },
    });
    setEditing(false);
  }

  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [confPw, setConfPw] = useState(""); const [pwErr, setPwErr] = useState("");
  function changePw() {
    if (curPw !== inv.password) { setPwErr("Current password is incorrect."); return; }
    if (newPw.length < 6) { setPwErr("New password must be at least 6 characters."); return; }
    if (newPw !== confPw) { setPwErr("Passwords do not match."); return; }
    ctx.changeInvestorPassword(inv.id, newPw);
    setCurPw(""); setNewPw(""); setConfPw(""); setPwErr("");
    ctx.showToast("Password updated.", "success");
  }

  const [faqOpen, setFaqOpen] = useState(null);
  const faqs = [
    ["How is my return calculated?", "Standard package positions earn 30% annually; Corporate package positions (UGX 1,000,000 and above) earn 40% annually, over a 12-month period."],
    ["What happens if I withdraw early?", "Withdrawals made before the 12-month maturity date incur a 15% penalty on the withdrawn amount. Withdrawals at or after maturity have no penalty."],
    ["Can I add to an existing investment?", "No — every deposit creates its own separate investment position with its own start and maturity date, so returns are calculated fairly for each contribution."],
    ["Who can see my Next of Kin details?", "Only Finance Officers and the Super Administrator can view your Next of Kin information, for accountability purposes."],
  ];

  return (
    <PageShell ctx={ctx} title="Profile & Settings">
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {[["profile", "My Profile"], ["kyc", "Identity Verification"], ["settings", "Settings"], ["security", "Security"]].map((t) => (
          <div key={t[0]} onClick={() => setTab(t[0])} style={{
            padding: "9px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            background: tab === t[0] ? C.brand : C.cardBg, color: tab === t[0] ? C.white : C.inkSoft,
          }}>{t[1]}</div>
        ))}
      </div>

      {tab === "profile" && (
        <Card style={{ maxWidth: 620 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={inv.fullName} size={48} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>{inv.fullName}</div>
                <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>{inv.memberId}</div>
              </div>
            </div>
            {!editing ? <Btn size="sm" variant="outline" icon={Edit2} onClick={() => setEditing(true)}>Edit</Btn> : null}
          </div>

          {/* Login identifiers — shown as a distinct card so the investor understands how they can sign in */}
          <div style={{ background: C.cardBg, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.inkFaint, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
              Your Login Identifiers
            </div>
            {[
              ["Member ID", inv.memberId],
              ["Username", inv.username || "—"],
              ["Email", inv.email],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
                <span style={{ color: C.inkSoft }}>{label}</span>
                <strong style={{ color: C.ink, fontFamily: label !== "Email" ? "monospace" : "inherit", fontSize: label !== "Email" ? 13 : 13.5 }}>{value}</strong>
              </div>
            ))}
            <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>You can sign in using any of the above together with your password.</div>
          </div>

          {[["Full Name", inv.fullName, false], ["National ID", inv.nationalId, false]].map((r) => (
            <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
              <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
            </div>
          ))}

          {editing ? (
            <>
              <Field label="Phone Number"><TextInput value={form.phone} onChange={(v) => set("phone", v)} /></Field>
              <Field label="Address"><TextInput value={form.address} onChange={(v) => set("address", v)} /></Field>
              <Field label="Occupation"><TextInput value={form.occupation} onChange={(v) => set("occupation", v)} /></Field>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, margin: "16px 0 10px" }}>Next of Kin</div>
              <Field label="Name"><TextInput value={form.nokName} onChange={(v) => set("nokName", v)} /></Field>
              <Field label="Relationship"><TextInput value={form.nokRelationship} onChange={(v) => set("nokRelationship", v)} /></Field>
              <Field label="Phone"><TextInput value={form.nokPhone} onChange={(v) => set("nokPhone", v)} /></Field>
              <Field label="Address"><TextInput value={form.nokAddress} onChange={(v) => set("nokAddress", v)} /></Field>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
                <Btn full onClick={save}>Save Changes</Btn>
              </div>
            </>
          ) : (
            <>
              {[["Phone", inv.phone], ["Address", inv.address], ["Occupation", inv.occupation]].map((r) => (
                <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
                  <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
                </div>
              ))}
              <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, margin: "16px 0 6px" }}>Next of Kin</div>
              {[["Name", inv.nextOfKin.name], ["Relationship", inv.nextOfKin.relationship], ["Phone", inv.nextOfKin.phone]].map((r) => (
                <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid " + C.line, fontSize: 13.5 }}>
                  <span style={{ color: C.inkSoft }}>{r[0]}</span><strong style={{ color: C.ink }}>{r[1]}</strong>
                </div>
              ))}
            </>
          )}
        </Card>
      )}

      {tab === "kyc" && (
        <Card style={{ maxWidth: 620 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 4 }}>Identity Verification</div>
          <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 16 }}>
            Upload your selfie and National ID photos. A Finance Officer will review and verify your identity within 1-2 business days.
          </div>
          <KYCUploadPanel investorProfileId={inv.id} staffMode={false} />
        </Card>
      )}

      {tab === "settings" && (
        <Card style={{ maxWidth: 620 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 14 }}>Notifications</div>
          {[["email", "Email Notifications"], ["sms", "SMS Notifications"]].map((r) => (
            <div key={r[0]} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid " + C.line }}>
              <span style={{ fontSize: 13.5, color: C.ink }}>{r[1]}</span>
              <Toggle on={inv.notifPrefs[r[0]]} onChange={() => ctx.toggleNotifPref(inv.id, r[0])} />
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", marginBottom: 18 }}>
            <span style={{ fontSize: 13.5, color: C.ink }}>Dark Mode</span>
            <Toggle on={inv.darkMode} onChange={() => ctx.toggleDarkMode(inv.id)} />
          </div>

          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 10 }}>Help &amp; Support</div>
          <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 18, lineHeight: 1.7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Phone size={14} /> {ctx.org.phone}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Mail size={14} /> {ctx.org.email}</div>
          </div>

          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 10 }}>Frequently Asked Questions</div>
          {faqs.map((f, i) => (
            <div key={i} style={{ borderBottom: "1px solid " + C.line }}>
              <div onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: C.ink }}>
                {f[0]} <ChevronDown size={15} style={{ transform: faqOpen === i ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </div>
              {faqOpen === i ? <div style={{ fontSize: 13, color: C.inkSoft, paddingBottom: 14, lineHeight: 1.6 }}>{f[1]}</div> : null}
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <Btn variant="outline" icon={LogOut} onClick={ctx.logout}>Sign Out</Btn>
          </div>
        </Card>
      )}

      {tab === "security" && (
        <Card style={{ maxWidth: 480 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 14 }}>Change Password</div>
          <Field label="Current Password"><TextInput value={curPw} onChange={setCurPw} type="password" /></Field>
          <Field label="New Password"><TextInput value={newPw} onChange={setNewPw} type="password" /></Field>
          <Field label="Confirm New Password"><TextInput value={confPw} onChange={setConfPw} type="password" /></Field>
          {pwErr ? <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{pwErr}</div> : null}
          <Btn onClick={changePw}>Update Password</Btn>

          <div style={{ marginTop: 26, paddingTop: 20, borderTop: "1px solid " + C.line }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink, marginBottom: 12 }}>Active Session</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.inkSoft }}>
              <Lock size={15} color={C.success} /> This device · Signed in {fmtDate(TODAY)}
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
