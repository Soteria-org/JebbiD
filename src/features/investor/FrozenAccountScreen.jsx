import React, { useRef, useState } from "react";
import { AlertTriangle, LogOut, RefreshCw, Upload } from "@/components/icons/index";
import { Btn, Card, Field, GuidanceBanner, TextArea } from "@/components/ui/primitives";
import { Logo } from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { C, FONT_BODY, FONT_DISPLAY } from "@/lib/theme";

/**
 * Shown instead of the normal investor dashboard whenever account_status is
 * 'suspended' — JBDocsApp routes here regardless of `view`. Deliberately its
 * own standalone screen (no sidebar/header, like ForcedPasswordChange) rather
 * than a banner bolted onto the dashboard: the whole point of freezing is that
 * the member should NOT see their current positions/value while paused, and a
 * banner-on-top-of-the-real-dashboard would still render all of that
 * underneath. Lets the member upload whatever resolves the pause and notifies
 * every super_admin (only they can unfreeze) — see respondToAccountFreeze in
 * useJBDocsStore / admin-actions.js.
 */
export function FrozenAccountScreen({ ctx }) {
  const inv = ctx.currentInvestor;
  const fileInputRef = useRef(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [err, setErr] = useState("");

  const notif = (ctx.notifications || []).find((n) => n.type === "account_status_alert" && !n.read);

  function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function submit() {
    if (!proofFile) { setErr("Please attach a document or screenshot before sending."); return; }
    setErr(""); setSubmitting(true);
    try {
      const supabase = createClient();
      const ext = proofFile.name.split(".").pop() || "jpg";
      const path = `${ctx.session.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile, { contentType: proofFile.type, upsert: true });
      if (uploadErr) { setErr("Upload failed: " + uploadErr.message); setSubmitting(false); return; }

      const result = await ctx.respondToAccountFreeze(ctx.session.id, path, note || null);
      if (!result.ok) { setErr(result.error || "Something went wrong sending this."); setSubmitting(false); return; }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.pageBg, fontFamily: FONT_BODY, padding: 20 }}>
      <Card style={{ maxWidth: 460, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Logo size={30} />
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600, color: C.ink }}>Jebbidox</div>
        </div>

        <div style={{ width: 46, height: 46, borderRadius: 10, background: C.warningBg, display: "flex", alignItems: "center", justifyContent: "center", color: C.warningText, marginBottom: 16 }}>
          <AlertTriangle size={22} />
        </div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, marginBottom: 6, color: C.ink }}>
          {notif?.title || "Your account is paused"}
        </div>
        <div style={{ fontSize: 13.5, color: C.inkSoft, marginBottom: 20, lineHeight: 1.55 }}>
          {notif?.message || "Your account has been paused because an outstanding requirement wasn't completed in time."} While
          paused, your investment balances aren&rsquo;t shown here, and new deposits or withdrawals can&rsquo;t be submitted.
          Upload whatever resolves this below and our team will review it.
        </div>

        {submitted ? (
          <>
            <GuidanceBanner tone="success">
              Sent. A super admin has been notified and will review your account. You&rsquo;ll get a notification the
              moment it&rsquo;s restored.
            </GuidanceBanner>
            <Btn full variant="outline" icon={RefreshCw} onClick={() => window.location.reload()}>Check Again</Btn>
          </>
        ) : (
          <>
            <Field label="Supporting document or screenshot">
              <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={onFileSelected} data-testid="freeze-response-file" />
              <div onClick={() => fileInputRef.current?.click()} style={{
                border: "1.5px dashed " + C.line, borderRadius: 8, padding: 20, textAlign: "center", cursor: "pointer", color: C.inkSoft,
              }}>
                {proofPreview ? (
                  <img src={proofPreview} alt="Selected file preview" style={{ maxHeight: 140, borderRadius: 6 }} />
                ) : (
                  <>
                    <Upload size={20} />
                    <div style={{ fontSize: 12.5, marginTop: 6 }}>{proofFile ? proofFile.name : "Tap to upload"}</div>
                  </>
                )}
              </div>
            </Field>

            <Field label="Message to the admin" hint="Optional — explain what this resolves">
              <TextArea value={note} onChange={setNote} rows={2} placeholder="e.g. Updated KYC document attached." />
            </Field>

            {err ? <div data-testid="freeze-response-error" style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}

            <Btn full onClick={submit} disabled={submitting} testId="freeze-response-submit">
              {submitting ? "Sending…" : "Send to Admin"}
            </Btn>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid " + C.line }}>
          <span style={{ fontSize: 12.5, color: C.inkFaint }}>{inv?.fullName}</span>
          <div onClick={ctx.logout} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: C.inkFaint, fontSize: 12.5 }}>
            <LogOut size={14} /> Sign Out
          </div>
        </div>
      </Card>
    </div>
  );
}
