"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ClipboardList, Mail, Upload } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Badge, Btn, Card, EmptyState, GuidanceBanner, LoadingState, Select, TableWrap, Td, Th } from "@/components/ui/primitives";
import { fmtDateTime, fmtUGX } from "@/lib/format";
import { C, FONT_DISPLAY, FONT_MONO } from "@/lib/theme";
import { readWorkbook, suggestFlatMapping, buildWideMonthlyMembers, buildFlatEntries } from "@/lib/migration/parseXlsx";
import {
  uploadImportBatch, getDryRunReport, confirmImportBatch, listImportBatches, deleteImportBatch,
  getBatchInvestors, createMigratedInvestorAccount, resendMigrationInvitation,
} from "@/lib/actions/migration-actions";
import { buildExportWorkbook } from "@/lib/actions/export-actions";

/** Decodes the base64 workbook Server Actions hand back and triggers a normal browser download — Server Actions can't return a Blob directly. */
function downloadBase64(base64, filename) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Super Admin Historical Migration dashboard — spec §8. The actual flow a
 * club admin experiences:
 *
 *   Upload a spreadsheet → we tell you what we found and what would happen →
 *   you confirm → we create each investor's account and their historical
 *   investment(s) → you invite each new investor (one click, right here) →
 *   they sign in and land on a dashboard that already has their history on it.
 *
 * Three screens, not five: Upload, Review (what will happen), and
 * Result/Detail (what happened + who still needs inviting). "Inspect" on a
 * past batch opens the same Result/Detail view read-only — it does NOT
 * restart the upload wizard.
 */
export function HistoricalMigration({ ctx }) {
  const [mode, setMode] = useState("history"); // 'history' | 'wizard' | 'detail'
  const [detailBatchId, setDetailBatchId] = useState(null);
  const [batches, setBatches] = useState(null);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadHistory() {
    setLoadingBatches(true);
    const res = await listImportBatches();
    setLoadingBatches(false);
    if (res.error) { ctx.showToast?.(res.error, "error"); return; }
    setBatches(res.batches);
  }

  async function handleExportAll() {
    setExporting(true);
    const res = await buildExportWorkbook({});
    setExporting(false);
    if (res.error) { ctx.showToast?.(res.error, "error"); return; }
    downloadBase64(res.base64, res.filename);
  }

  function openDetail(batchId) {
    setDetailBatchId(batchId);
    setMode("detail");
  }

  async function handleDelete(batchId) {
    setDeleting(true);
    const res = await deleteImportBatch(batchId);
    setDeleting(false);
    setConfirmDeleteId(null);
    if (res.error) { ctx.showToast?.(res.error, "error"); return; }
    ctx.showToast?.("Batch deleted.", "success");
    loadHistory();
  }

  function backToHistory() {
    setMode("history");
    setDetailBatchId(null);
    loadHistory();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only, matching the rest of this app's data-load effects
  React.useEffect(() => { loadHistory(); }, []);

  if (mode === "wizard") {
    return <MigrationWizard ctx={ctx} onDone={(batchId) => openDetail(batchId)} onCancel={backToHistory} />;
  }

  if (mode === "detail" && detailBatchId) {
    return <BatchDetailView ctx={ctx} batchId={detailBatchId} onBack={backToHistory} />;
  }

  return (
    <PageShell ctx={ctx} title="Historical Migration">
      <GuidanceBanner tone="info">
        Bring a club&rsquo;s old savings records into Jebbidox as real investment positions. The flow is: upload the
        spreadsheet, review what will happen, confirm — each investor&rsquo;s account and historical investment(s) are
        created automatically — then invite each investor from this screen. Nothing is written to the database
        until you explicitly confirm on the review screen.
      </GuidanceBanner>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600, color: C.ink }}>Import Batch History</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="outline" onClick={handleExportAll} loading={exporting} testId="migration-export-all">{exporting ? "Preparing…" : "Export Full Workbook"}</Btn>
          <Btn icon={Upload} onClick={() => setMode("wizard")} testId="migration-new-import">New Import</Btn>
        </div>
      </div>

      {loadingBatches ? (
        <Card><LoadingState label="Loading import batches…" /></Card>
      ) : !batches || batches.length === 0 ? (
        <Card><EmptyState icon={ClipboardList} title="No import batches yet" body="Upload a historical spreadsheet to begin." /></Card>
      ) : (
        <TableWrap>
          <thead><tr><Th>File</Th><Th>Uploaded</Th><Th>Status</Th><Th>Rows</Th><Th>Imported</Th><Th>Amount</Th><Th></Th></tr></thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} data-testid="migration-batch-history-row">
                <Td><strong>{b.source_filename}</strong></Td>
                <Td>{fmtDateTime(b.uploaded_at)} · {b.uploader?.full_name || "—"}</Td>
                <Td><Badge tone={b.status === "completed" ? "success" : b.status === "failed" ? "danger" : "warning"}>{b.status}</Badge></Td>
                <Td>{b.total_rows}</Td>
                <Td>{b.imported_rows} / {b.valid_rows + b.warning_rows}</Td>
                <Td>{fmtUGX(b.imported_total_amount || b.source_total_amount || 0)}</Td>
                <Td>
                  {confirmDeleteId === b.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: C.danger }}>Delete this batch?</span>
                      <Btn size="sm" variant="danger" onClick={() => handleDelete(b.id)} loading={deleting} testId="migration-batch-delete-confirm">{deleting ? "Deleting…" : "Yes"}</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</Btn>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn size="sm" variant="ghost" onClick={() => openDetail(b.id)} testId="migration-batch-inspect">Inspect</Btn>
                      {b.status !== "completed" && (
                        <Btn size="sm" variant="ghost" onClick={() => setConfirmDeleteId(b.id)} style={{ color: C.danger }} testId="migration-batch-delete">Delete</Btn>
                      )}
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </PageShell>
  );
}

/**
 * Shared by the Result step (right after a fresh import) and by "Inspect" on
 * a past batch — same component, same behavior, because "just imported" and
 * "imported a while ago" should look and work identically. This is the piece
 * that closes the loop: create the account (already done automatically at
 * import time) → invite → they sign in to a dashboard with their history
 * already on it. Inviting happens right here, not on a different screen.
 */
function InvestorInviteList({ investors, onChanged }) {
  if (!investors || investors.length === 0) {
    return <div style={{ fontSize: 12.5, color: C.inkFaint }}>No investors were created by this batch yet.</div>;
  }
  const needInvite = investors.filter((i) => !i.invited);
  return (
    <div>
      {needInvite.length > 0 && (
        <div style={{ fontSize: 12.5, color: C.warningText, marginBottom: 10 }}>
          {needInvite.length} of {investors.length} investor{investors.length === 1 ? "" : "s"} still need{needInvite.length === 1 ? "s" : ""} an invitation before they can sign in.
        </div>
      )}
      {investors.map((inv) => (
        <InvestorInviteRow key={inv.id} investor={inv} onChanged={onChanged} />
      ))}
    </div>
  );
}

function InvestorInviteRow({ investor, onChanged }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  async function handleInvite() {
    setBusy(true);
    setError("");
    const res = investor.needsRealEmail
      ? await createMigratedInvestorAccount(investor.id, email.trim())
      : await resendMigrationInvitation(investor.id);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      if (res.tempPassword) setTempPassword(res.tempPassword);
      // A temp password on an error response means real, usable credentials
      // WERE issued — only the (best-effort) email delivery failed. Reload
      // so the "Invited" badge reflects that instead of silently going
      // stale and showing the still-unusable invite form again.
      if (res.tempPassword) onChanged?.();
      return;
    }
    if (res.tempPassword) setTempPassword(res.tempPassword);
    onChanged?.();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid " + C.line, flexWrap: "wrap" }} data-testid="migration-invite-row">
      <div style={{ minWidth: 160, flex: "0 0 auto" }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: C.ink }}>{investor.fullName}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkFaint }}>{investor.memberId || "—"}</div>
      </div>
      {investor.invited ? (
        <Badge tone="success">Invited</Badge>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {investor.needsRealEmail && (
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="investor@example.com" data-testid="migration-invite-email"
              style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid " + C.line, fontSize: 13, width: 200 }}
            />
          )}
          <Btn size="sm" icon={Mail} loading={busy} disabled={investor.needsRealEmail && !email.includes("@")} onClick={handleInvite} testId="migration-invite-submit">
            {busy ? "Sending…" : "Invite"}
          </Btn>
        </div>
      )}
      {error && <div style={{ color: C.danger, fontSize: 12, width: "100%" }}>{error}</div>}
      {tempPassword && (
        <div style={{ fontSize: 12, color: C.inkSoft, width: "100%" }}>
          Temp password (shown once — only needed if the invitation email didn&rsquo;t reach them): <span data-testid="migration-invite-temp-password" style={{ fontFamily: "monospace", fontWeight: 700 }}>{tempPassword}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Read-only view of one batch — what it contained, what happened, and who
 * still needs inviting. Reached from "Inspect" (past batches) and
 * automatically after a fresh import (so there's exactly one place this
 * information ever lives, not a separate "just finished" screen that
 * disappears).
 */
function BatchDetailView({ ctx, batchId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [investors, setInvestors] = useState(null);
  const [error, setError] = useState("");
  const [groupDecisions, setGroupDecisions] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");

  async function load() {
    const [detailRes, investorsRes] = await Promise.all([getDryRunReport(batchId), getBatchInvestors(batchId)]);
    if (detailRes.error) { setError(detailRes.error); return; }
    setDetail(detailRes);
    if (!investorsRes.error) setInvestors(investorsRes.investors);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the batch being viewed changes
  React.useEffect(() => { load(); }, [batchId]);

  function setDecision(key, action, linkProfileId) {
    setGroupDecisions((d) => ({ ...d, [key]: { action, linkProfileId } }));
  }

  async function handleConfirm() {
    setConfirming(true);
    setConfirmError("");
    const res = await confirmImportBatch(batchId, groupDecisions);
    setConfirming(false);
    if (res.error) { setConfirmError(res.error); return; }
    ctx.showToast?.("Batch imported.", "success");
    setGroupDecisions({});
    load();
  }

  if (error) {
    return (
      <PageShell ctx={ctx} title="Import Batch">
        <GuidanceBanner tone="warning" icon={AlertTriangle}>{error}</GuidanceBanner>
        <Btn variant="ghost" icon={ChevronLeft} onClick={onBack}>Back to Batch History</Btn>
      </PageShell>
    );
  }
  if (!detail) {
    return <PageShell ctx={ctx} title="Import Batch"><Card><LoadingState label="Loading batch details…" /></Card></PageShell>;
  }

  const { batch, rows, investorAnalyses, reconciliation } = detail;
  // Every row's resolution is mutually exclusive (pending vs failed vs skipped
  // vs imported) — bucket strictly by resolution so a row never appears in two
  // sections at once. "pending" already covers validation errors held for a
  // decision; "failed" is a distinct, later state — a row that was actually
  // attempted at confirm time and errored during the real write (RPC failure),
  // which can happen even to a row that validated cleanly.
  const failedRows = (rows || []).filter((r) => r.resolution === "failed");
  const pendingRows = (rows || []).filter((r) => r.resolution === "pending");
  const skippedRows = (rows || []).filter((r) => r.resolution === "skipped");
  const notYetConfirmed = batch.status !== "completed";
  const heldGroups = notYetConfirmed ? (investorAnalyses || []).filter((a) => a.resolution !== "new") : [];
  const allDecided = heldGroups.every((g) => groupDecisions[g.key]?.action);

  return (
    <PageShell ctx={ctx} title="Import Batch">
      <div onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: C.inkFaint, fontSize: 13, marginBottom: 14 }}>
        <ChevronLeft size={15} /> Back to Batch History
      </div>

      <Card style={{ marginBottom: 16 }} data-testid="migration-result-summary">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          {batch.status === "completed" && <CheckCircle2 size={20} color={C.success} />}
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600 }}>{batch.source_filename}</div>
          <Badge tone={batch.status === "completed" ? "success" : batch.status === "failed" ? "danger" : "warning"}>{batch.status}</Badge>
        </div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 14 }}>Uploaded {fmtDateTime(batch.uploaded_at)}</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <Stat label="Imported" value={batch.imported_rows} testId="migration-result-imported-count" />
          <Stat label="Failed" value={batch.failed_rows} tone={batch.failed_rows > 0 ? "danger" : undefined} testId="migration-result-failed-count" />
          <Stat label="Skipped" value={skippedRows.length} testId="migration-result-skipped-count" />
          <Stat label="Still needs a decision" value={pendingRows.length} tone={pendingRows.length > 0 ? "danger" : undefined} testId="migration-result-pending-count" />
          <Stat label="Total imported amount" value={fmtUGX(batch.imported_total_amount || 0)} />
        </div>
      </Card>

      {notYetConfirmed && (
        <Card style={{ marginBottom: 16 }} data-testid="migration-resume-confirm">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>This batch hasn&rsquo;t been imported yet</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 14 }}>
            {reconciliation
              ? `${reconciliation.readyToImportRowCount} contribution${reconciliation.readyToImportRowCount === 1 ? "" : "s"} totaling ${fmtUGX(reconciliation.readyToImportAmount)} are ready. `
              : ""}
            {heldGroups.length > 0
              ? `Choose an action for each investor below, then confirm to create their accounts and historical investment(s).`
              : `Nothing is held for a decision — confirm below to create each investor's account and historical investment(s).`}
          </div>

          {heldGroups.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              {heldGroups.map((g) => (
                <div key={g.key} style={{ padding: "12px 0", borderBottom: "1px solid " + C.line }} data-testid="migration-group-decision">
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{g.displayName} — {g.resolution.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 8 }}>
                    {g.existingProfileMatches?.length ? `Matches existing: ${g.existingProfileMatches.map((m) => `${m.full_name} (${m.member_id || "no member id"})`).join(", ")}. ` : ""}
                    {fmtUGX(g.sumValidAmount)} across {g.totalRows} row{g.totalRows === 1 ? "" : "s"}.
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(g.existingProfileMatches || []).map((m) => (
                      <Btn
                        key={m.id} size="sm"
                        variant={groupDecisions[g.key]?.action === "link_existing" && groupDecisions[g.key]?.linkProfileId === m.id ? "primary" : "outline"}
                        onClick={() => setDecision(g.key, "link_existing", m.id)}
                      >
                        Link to {m.full_name}
                      </Btn>
                    ))}
                    <Btn size="sm" variant={groupDecisions[g.key]?.action === "import_as_new" ? "primary" : "outline"} onClick={() => setDecision(g.key, "import_as_new")}>Import as new investor</Btn>
                    <Btn size="sm" variant={groupDecisions[g.key]?.action === "skip" ? "primary" : "outline"} onClick={() => setDecision(g.key, "skip")}>Skip for now</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}

          {confirmError && <GuidanceBanner tone="warning" icon={AlertTriangle}>{confirmError}</GuidanceBanner>}
          {heldGroups.length > 0 && !allDecided && (
            <div style={{ fontSize: 12.5, color: C.warningText, marginBottom: 10 }}>Choose an action for every investor above before confirming.</div>
          )}
          <Btn onClick={handleConfirm} loading={confirming} disabled={heldGroups.length > 0 && !allDecided} testId="migration-confirm-submit">
            {confirming ? "Importing…" : "Confirm & Import"}
          </Btn>
          {confirming && <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>Creating each investor&rsquo;s account and historical investment(s) — this can take a few seconds for a large batch. Don&rsquo;t close this tab.</div>}
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Investors &amp; Invitations</div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 12 }}>
          Each investor&rsquo;s account and historical investment(s) already exist — inviting them sends their login details so they can sign in and see it.
        </div>
        <InvestorInviteList investors={investors} onChanged={load} />
      </Card>

      {pendingRows.length > 0 && !notYetConfirmed && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10, color: C.warningText }}>Still needs a decision ({pendingRows.length} rows)</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
            This batch is already marked completed with these rows still held for a human decision. Start a new import of the same file to resolve them, or fix the source data and re-upload.
          </div>
          {pendingRows.slice(0, 20).map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid " + C.line }}>
              <strong>{r.source_data?.sourceRef || r.mapped_data?.investorNameRaw || "row " + r.source_row_number}:</strong> {(r.validation_errors || []).join(" ") || (r.validation_warnings || []).join(" ")}
            </div>
          ))}
        </Card>
      )}

      {failedRows.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10, color: C.danger }}>Failed / not imported ({failedRows.length} rows)</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
            These rows were attempted during confirmation and failed to write. Resolve the underlying issue and confirm again — rows already imported won&rsquo;t be repeated.
          </div>
          {failedRows.slice(0, 20).map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid " + C.line }}>
              <strong>{r.source_data?.sourceRef || r.mapped_data?.investorNameRaw || "row " + r.source_row_number}:</strong> {(r.validation_errors || []).join(" ")}
            </div>
          ))}
        </Card>
      )}
    </PageShell>
  );
}

const STEP_LABELS = { upload: "1. Upload", review: "2. Review & Confirm", result: "3. Done" };

function MigrationWizard({ ctx, onDone, onCancel }) {
  const [step, setStep] = useState("upload");
  const [filename, setFilename] = useState("");
  const [sheets, setSheets] = useState([]); // [{sheetName, headerRow, dataRows, format, flatMapping}]
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [groupDecisions, setGroupDecisions] = useState({});

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFilename(file.name);
    try {
      const buf = await file.arrayBuffer();
      const parsed = readWorkbook(buf);
      setSheets(parsed.map((s) => ({
        ...s,
        format: s.suggestedFormat === "unknown" ? "flat" : s.suggestedFormat,
        flatMapping: suggestFlatMapping(s.headerRow),
      })));
    } catch (err) {
      setError("Could not read this file as a spreadsheet: " + (err?.message || String(err)));
    }
  }

  async function submitUpload() {
    setBusy(true);
    setError("");
    const payload = {
      sourceFilename: filename,
      sheets: sheets
        .filter((s) => s.format !== "skip")
        .map((s) => ({
          sheetName: s.sheetName,
          format: s.format,
          rows: s.format === "wide-monthly"
            ? buildWideMonthlyMembers(s.headerRow, s.dataRows, s.aboveHeaderRow)
            : buildFlatEntries(s.headerRow, s.dataRows, s.flatMapping),
        })),
    };
    const res = await uploadImportBatch(payload);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setUploadResult(res);
    setStep("review");
  }

  async function submitConfirm() {
    setBusy(true);
    setError("");
    const res = await confirmImportBatch(uploadResult.batchId, groupDecisions);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    onDone(uploadResult.batchId);
  }

  return (
    <PageShell ctx={ctx} title="New Historical Import">
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {Object.entries(STEP_LABELS).map(([key, label]) => (
          <div key={key} style={{
            padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700,
            background: step === key ? C.brand : C.cardBg, color: step === key ? C.white : C.inkFaint,
          }}>{label}</div>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 18 }}>
        {step === "upload" && "Choose the spreadsheet and confirm how to read each sheet — nothing is saved yet."}
        {step === "review" && "This is a preview. Nothing has been written to the database — review it, resolve anything held for a decision, then confirm to actually import."}
      </div>

      {error && <GuidanceBanner tone="warning" icon={AlertTriangle}>{error}</GuidanceBanner>}

      {step === "upload" && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>Upload spreadsheet (.xlsx)</div>
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} data-testid="migration-upload-input" />
          {sheets.length > 0 && (
            <div style={{ marginTop: 20 }}>
              {(() => {
                const toImport = sheets.filter((s) => s.format !== "skip");
                const skipped = sheets.filter((s) => s.format === "skip");
                const unmapped = toImport.filter((s) => s.format === "flat" && (s.flatMapping.nameCol == null || s.flatMapping.amountCol == null || s.flatMapping.dateCol == null));
                return (
                  <>
                    <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 14 }}>
                      {sheets.length} sheet{sheets.length === 1 ? "" : "s"} found.{" "}
                      {skipped.length > 0 && `${skipped.length} look${skipped.length === 1 ? "s" : ""} like internal bookkeeping and ${skipped.length === 1 ? "is" : "are"} skipped by default — `}
                      Only sheets below will be imported. Change any sheet&rsquo;s setting if this doesn&rsquo;t look right.
                    </div>

                    {toImport.length === 0 && (
                      <GuidanceBanner tone="warning" icon={AlertTriangle}>
                        No sheet looks like investor data yet. Change one of the sheets below from &ldquo;Skip&rdquo; to the shape that matches it.
                      </GuidanceBanner>
                    )}

                    {toImport.map((s) => {
                      const i = sheets.indexOf(s);
                      return (
                        <div key={s.sheetName} style={{ padding: "12px 0", borderBottom: "1px solid " + C.line }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                            <div style={{ minWidth: 180, fontWeight: 700, fontSize: 13.5 }}>{s.sheetName}</div>
                            {s.headerConfidence === "low" && <Badge tone="warning">Couldn&rsquo;t confidently find a header row — check the preview below</Badge>}
                            <Select
                              value={s.format}
                              onChange={(v) => setSheets((list) => list.map((x, xi) => (xi === i ? { ...x, format: v } : x)))}
                              options={[
                                { value: "skip", label: "Skip — not investor data" },
                                { value: "wide-monthly", label: "Wide Monthly Contributions (one row per member, one column per month)" },
                                { value: "flat", label: "Flat Transaction List (one row per contribution)" },
                              ]}
                            />
                          </div>
                          {s.format === "flat" && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                              {["nameCol", "amountCol", "dateCol"].map((field) => (
                                <div key={field}>
                                  <div style={{ fontSize: 10.5, color: C.inkFaint, textTransform: "uppercase", marginBottom: 3 }}>{field.replace("Col", "")}</div>
                                  <Select
                                    value={s.flatMapping[field] ?? ""}
                                    onChange={(v) => setSheets((list) => list.map((x, xi) => (xi === i ? { ...x, flatMapping: { ...x.flatMapping, [field]: v === "" ? null : parseInt(v, 10) } } : x)))}
                                    options={s.headerRow.map((h, idx) => ({ value: String(idx), label: h || `Column ${idx + 1} (blank header)` }))}
                                    placeholder="Not mapped"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {s.preview?.length > 0 && (
                            <div style={{ fontSize: 11, color: C.inkFaint, fontFamily: FONT_MONO, overflowX: "auto" }}>
                              First row read: {s.preview[0].slice(0, 6).map((v) => (v === null || v === undefined || v === "" ? "—" : String(v))).join(" · ")}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {unmapped.length > 0 && (
                      <GuidanceBanner tone="warning" icon={AlertTriangle}>
                        {unmapped.map((s) => s.sheetName).join(", ")} — Name, Amount, or Date isn&rsquo;t mapped. Pick the right column above, or this sheet won&rsquo;t import any rows.
                      </GuidanceBanner>
                    )}

                    {skipped.length > 0 && (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{ cursor: "pointer", fontSize: 12.5, color: C.inkFaint, padding: "6px 0" }}>
                          {skipped.length} sheet{skipped.length === 1 ? "" : "s"} skipped — {skipped.map((s) => s.sheetName).join(", ")}
                        </summary>
                        {skipped.map((s) => {
                          const i = sheets.indexOf(s);
                          return (
                            <div key={s.sheetName} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", flexWrap: "wrap" }}>
                              <div style={{ minWidth: 180, fontSize: 13 }}>{s.sheetName}</div>
                              <Select
                                value={s.format}
                                onChange={(v) => setSheets((list) => list.map((x, xi) => (xi === i ? { ...x, format: v } : x)))}
                                options={[
                                  { value: "skip", label: "Skip — not investor data" },
                                  { value: "wide-monthly", label: "Wide Monthly Contributions" },
                                  { value: "flat", label: "Flat Transaction List" },
                                ]}
                              />
                            </div>
                          );
                        })}
                      </details>
                    )}

                    <div style={{ marginTop: 16 }}>
                      <Btn onClick={submitUpload} loading={busy} disabled={toImport.length === 0} testId="migration-upload-submit">{busy ? "Validating…" : "Continue to Review"}</Btn>
                      <Btn variant="ghost" onClick={onCancel} disabled={busy} style={{ marginLeft: 8 }}>Cancel</Btn>
                      {busy && <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>Reading and validating every row — this can take a few seconds for a large file.</div>}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </Card>
      )}

      {step === "review" && uploadResult && (
        <ReviewStep
          uploadResult={uploadResult}
          groupDecisions={groupDecisions}
          setGroupDecisions={setGroupDecisions}
          onConfirm={submitConfirm}
          busy={busy}
          onCancel={onCancel}
        />
      )}
    </PageShell>
  );
}

function Stat({ label, value, tone, testId }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: C.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
      <div data-testid={testId} style={{ fontFamily: FONT_MONO, fontSize: 20, fontWeight: 600, color: tone === "danger" ? C.danger : C.ink }}>{value}</div>
    </div>
  );
}

/**
 * One row per investor, not one row per contribution — repeated appearances
 * across sheets (e.g. the same person on both the monthly report and the
 * individual investments sheet) are already merged into a.rows by
 * groupRowsByInvestor(). Expanding a row shows every one of their deposits
 * (sheet, date, amount, status) in one place instead of scattered separately.
 */
function InvestorAnalysisList({ investorAnalyses }) {
  const [expanded, setExpanded] = useState({});
  function toggle(key) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  }
  return (
    <div>
      {investorAnalyses.map((a) => {
        const isOpen = !!expanded[a.key];
        const rowErrorCount = a.rows.filter((r) => r.validation_status === "error").length;
        const rowWarningCount = a.rows.filter((r) => r.validation_status === "warning").length;
        return (
          <div key={a.key} style={{ borderBottom: "1px solid " + C.line }} data-testid="migration-investor-row">
            <div
              onClick={() => toggle(a.key)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", cursor: "pointer", flexWrap: "wrap" }}
            >
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.inkFaint, width: 14 }}>{isOpen ? "▾" : "▸"}</div>
              <div style={{ fontWeight: 600, fontSize: 13.5, minWidth: 160 }}>{a.displayName}</div>
              <div style={{ fontSize: 12, color: C.inkFaint }}>
                {a.totalRows} deposit{a.totalRows === 1 ? "" : "s"}
                {a.sourceSheets.length > 1 ? ` across ${a.sourceSheets.length} sheets` : ""}
              </div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600 }}>{fmtUGX(a.sumValidAmount)}</div>
              <Badge tone={a.resolution === "new" ? "success" : "warning"}>{a.resolution.replace(/_/g, " ")}</Badge>
              {rowErrorCount > 0 && <Badge tone="danger">{rowErrorCount} error{rowErrorCount === 1 ? "" : "s"}</Badge>}
              {rowWarningCount > 0 && <Badge tone="warning">{rowWarningCount} warning{rowWarningCount === 1 ? "" : "s"}</Badge>}
            </div>
            {isOpen && (
              <div style={{ padding: "0 4px 12px 24px" }}>
                <TableWrap>
                  <thead><tr><Th>Sheet</Th><Th>Date</Th><Th>Amount</Th><Th>Status</Th><Th>Note</Th></tr></thead>
                  <tbody>
                    {a.rows.map((r, i) => (
                      <tr key={i}>
                        <Td>{r.sourceSheet}</Td>
                        <Td>{r.dateParsedISO || "—"}</Td>
                        <Td>{r.amountParsed != null ? fmtUGX(r.amountParsed) : "—"}</Td>
                        <Td><Badge tone={r.validation_status === "error" ? "danger" : r.validation_status === "warning" ? "warning" : "success"}>{r.validation_status}</Badge></Td>
                        <Td style={{ fontSize: 11.5, color: C.inkSoft }}>{(r.validation_errors || []).concat(r.validation_warnings || []).join(" ") || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReviewStep({ uploadResult, groupDecisions, setGroupDecisions, onConfirm, busy, onCancel }) {
  const { reconciliation, investorAnalyses, flagSummary } = uploadResult;
  const heldGroups = investorAnalyses.filter((a) => a.resolution !== "new");
  const errorRowCount = investorAnalyses.reduce((acc, a) => acc + a.rows.filter((r) => r.validation_status === "error").length, 0);
  const warningRowCount = investorAnalyses.reduce((acc, a) => acc + a.rows.filter((r) => r.validation_status === "warning").length, 0);

  function setDecision(key, action, linkProfileId) {
    setGroupDecisions((d) => ({ ...d, [key]: { action, linkProfileId } }));
  }

  const allDecided = heldGroups.every((g) => groupDecisions[g.key]?.action);

  return (
    <>
      <Card style={{ marginBottom: 16 }} data-testid="migration-reconciliation-summary">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          {reconciliation.readyToImportRowCount} contribution{reconciliation.readyToImportRowCount === 1 ? "" : "s"} totaling {fmtUGX(reconciliation.readyToImportAmount)} will be imported.
        </div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 12 }}>
          Out of {reconciliation.totalSourceRows} rows in the file: {reconciliation.readyToImportRowCount} are clean and ready,
          {" "}{reconciliation.heldForDecisionRowCount} need a decision below, and {reconciliation.errorRowCount} failed validation and won&rsquo;t be imported.
        </div>
        <Badge tone={reconciliation.reconciles ? "success" : "danger"}>{reconciliation.reconciles ? "Reconciles to zero — every UGX accounted for" : "Does not reconcile"}</Badge>
      </Card>

      {(flagSummary.crossSheetOverlaps > 0 || flagSummary.possibleDuplicates > 0 || flagSummary.nonPersonEntries > 0 || flagSummary.jointIdentityEntries > 0 || flagSummary.noContributionMembers > 0) && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          {flagSummary.crossSheetOverlaps > 0 && <Badge tone="warning">Cross-sheet overlaps: {flagSummary.crossSheetOverlaps}</Badge>}
          {flagSummary.possibleDuplicates > 0 && <Badge tone="warning">Possible duplicates: {flagSummary.possibleDuplicates}</Badge>}
          {flagSummary.nonPersonEntries > 0 && <Badge tone="warning">Non-person entries: {flagSummary.nonPersonEntries}</Badge>}
          {flagSummary.jointIdentityEntries > 0 && <Badge tone="warning">Joint identity: {flagSummary.jointIdentityEntries}</Badge>}
          {flagSummary.noContributionMembers > 0 && <Badge tone="warning">No contributions: {flagSummary.noContributionMembers}</Badge>}
        </div>
      )}

      {heldGroups.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Needs a decision ({heldGroups.length})</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 12 }}>
            These investors weren&rsquo;t auto-approved (possible duplicate, ambiguous identity, or a row error) — choose what to do with each before you can confirm.
          </div>
          {heldGroups.map((g) => (
            <div key={g.key} style={{ padding: "12px 0", borderBottom: "1px solid " + C.line }} data-testid="migration-group-decision">
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{g.displayName} — {g.resolution.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 8 }}>
                {g.existingProfileMatches?.length ? `Matches existing: ${g.existingProfileMatches.map((m) => `${m.full_name} (${m.member_id || "no member id"})`).join(", ")}. ` : ""}
                {fmtUGX(g.sumValidAmount)} across {g.totalRows} row{g.totalRows === 1 ? "" : "s"}.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(g.existingProfileMatches || []).map((m) => (
                  <Btn
                    key={m.id} size="sm"
                    variant={groupDecisions[g.key]?.action === "link_existing" && groupDecisions[g.key]?.linkProfileId === m.id ? "primary" : "outline"}
                    onClick={() => setDecision(g.key, "link_existing", m.id)}
                  >
                    Link to {m.full_name}
                  </Btn>
                ))}
                <Btn size="sm" variant={groupDecisions[g.key]?.action === "import_as_new" ? "primary" : "outline"} onClick={() => setDecision(g.key, "import_as_new")}>Import as new investor</Btn>
                <Btn size="sm" variant={groupDecisions[g.key]?.action === "skip" ? "primary" : "outline"} onClick={() => setDecision(g.key, "skip")}>Skip for now</Btn>
              </div>
            </div>
          ))}
        </Card>
      )}

      <details style={{ marginBottom: 16 }} open>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13.5, color: C.inkSoft, padding: "4px 0" }}>
          All {investorAnalyses.length} investor{investorAnalyses.length === 1 ? "" : "s"} found in this file
          {(errorRowCount > 0 || warningRowCount > 0) && (
            <span style={{ fontWeight: 400 }}>
              {" — "}
              {errorRowCount > 0 && <span style={{ color: C.danger }}>{errorRowCount} row{errorRowCount === 1 ? "" : "s"} failed validation</span>}
              {errorRowCount > 0 && warningRowCount > 0 && ", "}
              {warningRowCount > 0 && <span style={{ color: C.warningText }}>{warningRowCount} row{warningRowCount === 1 ? "" : "s"} with warnings</span>}
            </span>
          )}
        </summary>
        <div style={{ fontSize: 12, color: C.inkFaint, margin: "6px 0 10px" }}>
          One entry per investor — every sheet this file mentions them on (monthly report, individual investments, etc.) is merged into their one row below. Expand an investor to see their individual deposits.
        </div>
        <InvestorAnalysisList investorAnalyses={investorAnalyses} />
      </details>

      {heldGroups.length > 0 && !allDecided && (
        <div style={{ fontSize: 12.5, color: C.warningText, marginBottom: 10 }}>
          Choose an action for every investor above before confirming.
        </div>
      )}
      <Btn onClick={onConfirm} loading={busy} disabled={heldGroups.length > 0 && !allDecided} testId="migration-confirm-submit">
        {busy ? "Importing…" : "Confirm & Import"}
      </Btn>
      <Btn variant="ghost" onClick={onCancel} disabled={busy} style={{ marginLeft: 8 }}>Cancel</Btn>
      {busy && <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 8 }}>Creating each investor&rsquo;s account and historical investment(s) — this can take a few seconds for a large batch. Don&rsquo;t close this tab.</div>}
    </>
  );
}
