import React, { useRef, useState } from "react";
import { AlertTriangle, Upload } from "@/components/icons/index";
import { Btn, Field, GuidanceBanner, Modal, TextArea, TextInput } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { C } from "@/lib/theme";

export function ResubmitDepositModal({ ctx, payload }) {
  const deposit = ctx.investments.find((p) => p.id === payload.depositId);
  const fileInputRef = useRef(null);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [transactionRef, setTransactionRef] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  if (!deposit) {
    return (
      <Modal title="Respond to Clarification Request" onClose={ctx.closeModal}>
        <div style={{ fontSize: 13.5, color: C.inkSoft }}>
          This deposit could not be found — it may have already been reviewed. Check My Investments for its current status.
        </div>
        <Btn full onClick={ctx.closeModal} style={{ marginTop: 16 }}>Close</Btn>
      </Modal>
    );
  }

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
    if (!proofFile) { setErr("Please upload a new proof of payment before resubmitting."); return; }
    setErr(""); setSubmitting(true);
    try {
      const supabase = createClient();
      const ext = proofFile.name.split(".").pop() || "jpg";
      const path = `${ctx.session.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile, { contentType: proofFile.type, upsert: true });
      if (uploadErr) { setErr("Upload failed: " + uploadErr.message); setSubmitting(false); return; }

      const result = await ctx.resubmitDepositProof({
        depositId: deposit.id,
        proofStoragePath: path,
        transactionRef: transactionRef || null,
        responseNote: note || null,
      });
      if (!result.ok) { setErr(result.error || "Resubmission failed."); setSubmitting(false); return; }
      ctx.closeModal();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Respond to Clarification Request" onClose={ctx.closeModal}>
      <GuidanceBanner tone="warning" icon={AlertTriangle}>
        {deposit.clarificationNote || "The Finance Officer needs more information about this deposit before it can be approved."}
      </GuidanceBanner>

      <div style={{ fontSize: 12.5, color: C.inkSoft, margin: "16px 0 4px" }}>
        Deposit {deposit.referenceNumber || ""} — {deposit.package} · {deposit.amount ? deposit.amount.toLocaleString() : ""} UGX
      </div>

      <Field label="Updated Transaction Reference" hint="Optional — only if it changed">
        <TextInput value={transactionRef} onChange={setTransactionRef} placeholder="e.g. MTN or Airtel reference" />
      </Field>

      <Field label="New Proof of Payment">
        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={onFileSelected} data-testid="resubmit-proof-file" />
        <div onClick={() => fileInputRef.current?.click()} style={{
          border: "1.5px dashed " + C.line, borderRadius: 10, padding: 20, textAlign: "center", cursor: "pointer", color: C.inkSoft,
        }}>
          {proofPreview ? (
            <img src={proofPreview} alt="New proof preview" style={{ maxHeight: 140, borderRadius: 6 }} />
          ) : (
            <>
              <Upload size={20} />
              <div style={{ fontSize: 12.5, marginTop: 6 }}>{proofFile ? proofFile.name : "Tap to upload a new screenshot or PDF"}</div>
            </>
          )}
        </div>
      </Field>

      <Field label="Message to the reviewer" hint="Optional — explain what changed">
        <TextArea value={note} onChange={setNote} rows={2} placeholder="e.g. Corrected the amount, updated screenshot attached." />
      </Field>

      {err ? <div data-testid="resubmit-error" style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}

      <Btn full onClick={submit} disabled={submitting} testId="resubmit-submit">
        {submitting ? "Resubmitting…" : "Resubmit for Review"}
      </Btn>
    </Modal>
  );
}
