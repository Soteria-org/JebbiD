"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, CheckCircle2, IdCard, RefreshCw, Upload, User, XCircle } from "@/components/icons/index";
import { Btn, GuidanceBanner } from "@/components/ui/primitives";
import { createClient } from "@/lib/supabase/client";
import { getKycDocumentStatus, recordDocumentUpload, updateKycVerification } from "@/lib/actions/kyc-actions";
import { C } from "@/lib/theme";

const DOC_TYPES = [
  { key: "selfie",           label: "Selfie Photo",      hint: "Face clearly visible, good lighting, no glasses",       icon: User,    capture: "user"        },
  { key: "national_id_front", label: "National ID — Front", hint: "Full card visible, all text readable",              icon: IdCard,  capture: "environment" },
  { key: "national_id_back",  label: "National ID — Back",  hint: "Full card visible, signature strip readable",       icon: IdCard,  capture: "environment" },
];

const STATUS_COLORS = {
  not_started: C.inkFaint,
  pending:     "#D97706",
  approved:    "#16A34A",
  rejected:    C.danger,
};
const STATUS_LABELS = {
  not_started: "Not started",
  pending:     "Awaiting staff review",
  approved:    "Verified",
  rejected:    "Rejected — please re-upload",
};

/**
 * KYCUploadPanel
 *
 * Can be embedded in investor's own Profile page (investorProfileId = their own id)
 * or in the InvestorDetailScreen for a Finance Officer uploading on behalf of a
 * walk-in investor (investorProfileId = the investor's profile id, staffMode = true).
 *
 * On mobile, "Take Photo" opens the device camera directly via an <input capture>
 * element, without needing getUserMedia (which is finicky on mobile Safari). On
 * desktop it opens the camera via getUserMedia, with a file picker fallback.
 */
export function KYCUploadPanel({ investorProfileId, staffMode = false, onStatusChange }) {
  const [status, setStatus] = useState("not_started");
  const [uploaded, setUploaded] = useState({});
  const [activeDoc, setActiveDoc] = useState(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [verifyAction, setVerifyAction] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!investorProfileId) return;
    getKycDocumentStatus(investorProfileId).then((res) => {
      if (res.error) { setErr(res.error); return; }
      const map = {};
      res.documents.forEach((d) => { map[d.document_type] = d; });
      setUploaded(map);
      setStatus(res.kycStatus);
    });
  }, [investorProfileId]);

  const openCamera = useCallback(async (docType) => {
    setActiveDoc(docType);
    setPreview(null);
    setErr("");
    if (!navigator.mediaDevices?.getUserMedia) {
      // getUserMedia not available (older browser or non-HTTPS) — fall back to file picker
      setCameraOpen(false);
      fileInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: docType.capture === "user" ? "user" : "environment" } });
      streamRef.current = stream;
      setCameraOpen(true);
      // Attach stream after state update so the video element exists
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 50);
    } catch {
      // Camera permission denied or unavailable — fall back to file picker silently
      setCameraOpen(false);
      fileInputRef.current?.click();
    }
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    setPreview(canvas.toDataURL("image/jpeg", 0.88));
    stopCamera();
  }

  function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function confirmUpload() {
    if (!preview || !activeDoc) return;
    setUploading(true);
    setErr("");
    try {
      const supabase = createClient();
      const blob = await (await fetch(preview)).blob();
      const ext = blob.type === "image/jpeg" ? "jpg" : "png";
      const path = `${investorProfileId}/${activeDoc.key}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("kyc-documents")
        .upload(path, blob, { contentType: blob.type, upsert: true });
      if (uploadErr) { setErr(uploadErr.message); setUploading(false); return; }

      const result = await recordDocumentUpload({
        investorProfileId,
        documentType: activeDoc.key,
        storagePath: path,
      });
      if (result.error) { setErr(result.error); setUploading(false); return; }

      setUploaded((u) => Object.assign({}, u, { [activeDoc.key]: { document_type: activeDoc.key, storage_path: path } }));
      if (result.allDocumentsUploaded) {
        setStatus("pending");
        onStatusChange?.("pending");
      }
      setPreview(null);
      setActiveDoc(null);
    } catch (e) {
      setErr("Upload failed. Please check your connection and try again.");
    }
    setUploading(false);
  }

  async function handleVerify(action) {
    setVerifyAction(action);
    const result = await updateKycVerification({ investorProfileId, action });
    setVerifyAction("");
    if (result.error) { setErr(result.error); return; }
    setStatus(result.newStatus);
    onStatusChange?.(result.newStatus);
  }

  const allUploaded = DOC_TYPES.every((d) => uploaded[d.key]);

  // Camera capture view
  if (cameraOpen) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <video ref={videoRef} autoPlay playsInline style={{ width: "100%", borderRadius: 12, background: "#000" }} />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="outline" onClick={() => { stopCamera(); setActiveDoc(null); }}>Cancel</Btn>
        <Btn full icon={Camera} onClick={capturePhoto}>Capture Photo</Btn>
      </div>
    </div>
  );

  // Preview / confirm view
  if (preview) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
        Preview — {activeDoc?.label}
      </div>
      <img src={preview} alt="Preview" style={{ width: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 12, border: "1.5px solid " + C.line }} />
      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="outline" icon={RefreshCw} onClick={() => { setPreview(null); openCamera(activeDoc); }}>Retake</Btn>
        <Btn full icon={Check} onClick={confirmUpload} disabled={uploading}>{uploading ? "Uploading…" : "Confirm & Upload"}</Btn>
      </div>
      {err && <div style={{ color: C.danger, fontSize: 13 }}>{err}</div>}
    </div>
  );

  // Main panel
  return (
    <div>
      {/* Hidden file input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture={activeDoc?.capture}
        style={{ display: "none" }}
        onChange={onFileSelected}
      />

      {/* Overall KYC status badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLORS[status] }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
      </div>

      {status === "approved" && (
        <GuidanceBanner tone="success">Identity verification is complete. No further action required.</GuidanceBanner>
      )}
      {status === "rejected" && (
        <GuidanceBanner tone="error">One or more documents were rejected. Please re-upload clear, legible photos and resubmit.</GuidanceBanner>
      )}
      {!staffMode && status === "not_started" && (
        <GuidanceBanner tone="info">Upload three clear photos to verify your identity. A Finance Officer will review them within 1-2 business days.</GuidanceBanner>
      )}

      {/* Document upload slots */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "16px 0" }}>
        {DOC_TYPES.map((doc) => {
          const done = !!uploaded[doc.key];
          const Icon = doc.icon;
          return (
            <div key={doc.key} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
              borderRadius: 12, border: "1.5px solid " + (done ? "#16A34A" : C.line),
              background: done ? "#F0FDF4" : C.white,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                background: done ? "#DCFCE7" : C.cardBg,
              }}>
                {done
                  ? <CheckCircle2 size={22} color="#16A34A" />
                  : <Icon size={20} color={C.inkFaint} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{doc.label}</div>
                <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 2 }}>{done ? "Uploaded" : doc.hint}</div>
              </div>
              {status !== "approved" && (
                <div style={{ display: "flex", gap: 6 }}>
                  {/* Mobile-native camera (opens device camera directly via input[capture]) */}
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px",
                    borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    border: "1.5px solid " + C.brand, color: C.brand, background: "transparent",
                    whiteSpace: "nowrap",
                  }}>
                    <Camera size={13} />
                    {done ? "Retake" : "Take Photo"}
                    <input
                      type="file" accept="image/*" capture={doc.capture} style={{ display: "none" }}
                      onChange={(e) => { setActiveDoc(doc); onFileSelected(e); }}
                    />
                  </label>
                  {/* File picker */}
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px",
                    borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    border: "1.5px solid " + C.line, color: C.inkSoft, background: "transparent",
                    whiteSpace: "nowrap",
                  }}>
                    <Upload size={13} />
                    {done ? "Replace" : "Upload"}
                    <input
                      type="file" accept="image/*,application/pdf" style={{ display: "none" }}
                      onChange={(e) => { setActiveDoc(doc); onFileSelected(e); }}
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Staff verification controls */}
      {staffMode && allUploaded && status === "pending" && (
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Btn variant="outline" icon={XCircle}
            onClick={() => handleVerify("reject")}
            disabled={!!verifyAction}
            style={{ color: C.danger, borderColor: C.danger }}>
            {verifyAction === "reject" ? "Rejecting…" : "Reject KYC"}
          </Btn>
          <Btn full icon={CheckCircle2}
            onClick={() => handleVerify("approve")}
            disabled={!!verifyAction}>
            {verifyAction === "approve" ? "Approving…" : "Approve KYC"}
          </Btn>
        </div>
      )}

      {err && <div style={{ color: C.danger, fontSize: 13, marginTop: 8 }}>{err}</div>}
    </div>
  );
}
