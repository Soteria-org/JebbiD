"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ClipboardList, Mail, Upload } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Badge, Btn, Card, EmptyState, GuidanceBanner, Select, TableWrap, Td, Th } from "@/components/ui/primitives";
import { fmtDateTime, fmtUGX } from "@/lib/format";
import { C, FONT_DISPLAY, FONT_MONO } from "@/lib/theme";
import { readWorkbook, suggestFlatMapping, buildWideMonthlyMembers, buildFlatEntries } from "@/lib/migration/parseXlsx";
import {
  uploadImportBatch, getDryRunReport, confirmImportBatch, listImportBatches,
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
          <Btn variant="outline" onClick={handleExportAll} disabled={exporting} testId="migration-export-all">{exporting ? "Preparing…" : "Export Full Workbook"}</Btn>
          <Btn icon={Upload} onClick={() => setMode("wizard")} testId="migration-new-import">New Import</Btn>
        </div>
      </div>

      {loadingBatches ? (
        <Card>Loading…</Card>
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
                <Td><Btn size="sm" variant="ghost" onClick={() => openDetail(b.id)} testId="migration-batch-inspect">Inspect</Btn></Td>
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
    if (res.error) { setError(res.error); if (res.tempPassword) setTempPassword(res.tempPassword); return; }
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
          <Btn size="sm" icon={Mail} disabled={busy || (investor.needsRealEmail && !email.includes("@"))} onClick={handleInvite} testId="migration-invite-submit">
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

  async function load() {
    const [detailRes, investorsRes] = await Promise.all([getDryRunReport(batchId), getBatchInvestors(batchId)]);
    if (detailRes.error) { setError(detailRes.error); return; }
    setDetail(detailRes);
    if (!investorsRes.error) setInvestors(investorsRes.investors);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the batch being viewed changes
  React.useEffect(() => { load(); }, [batchId]);

  if (error) {
    return (
      <PageShell ctx={ctx} title="Import Batch">
        <GuidanceBanner tone="warning" icon={AlertTriangle}>{error}</GuidanceBanner>
        <Btn variant="ghost" icon={ChevronLeft} onClick={onBack}>Back to Batch History</Btn>
      </PageShell>
    );
  }
  if (!detail) {
    return <PageShell ctx={ctx} title="Import Batch"><Card>Loading…</Card></PageShell>;
  }

  const { batch, rows } = detail;
  const errorRows = (rows || []).filter((r) => r.validation_status === "error" && r.resolution !== "imported");
  const pendingRows = (rows || []).filter((r) => r.resolution === "pending");
  const skippedRows = (rows || []).filter((r) => r.resolution === "skipped");

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

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>Investors &amp; Invitations</div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 12 }}>
          Each investor&rsquo;s account and historical investment(s) already exist — inviting them sends their login details so they can sign in and see it.
        </div>
        <InvestorInviteList investors={investors} onChanged={load} />
      </Card>

      {pendingRows.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10, color: C.warningText }}>Still needs a decision ({pendingRows.length} rows)</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
            These rows were held for a human decision (possible duplicate, ambiguous identity, or a validation error) and were not imported. Start a new import of the same file to resolve them, or fix the source data and re-upload.
          </div>
          {pendingRows.slice(0, 20).map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid " + C.line }}>
              <strong>{r.source_data?.sourceRef || r.mapped_data?.investorNameRaw || "row " + r.source_row_number}:</strong> {(r.validation_errors || []).join(" ") || (r.validation_warnings || []).join(" ")}
            </div>
          ))}
        </Card>
      )}

      {errorRows.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10, color: C.danger }}>Failed / not imported ({errorRows.length} rows)</div>
          {errorRows.slice(0, 20).map((r) => (
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
  const [batchDetail, setBatchDetail] = useState(null);
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
            ? buildWideMonthlyMembers(s.headerRow, s.dataRows)
            : buildFlatEntries(s.headerRow, s.dataRows, s.flatMapping),
        })),
    };
    const res = await uploadImportBatch(payload);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setUploadResult(res);
    const detail = await getDryRunReport(res.batchId);
    if (!detail.error) setBatchDetail(detail);
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
              <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
                {sheets.length} sheet{sheets.length === 1 ? "" : "s"} found. Confirm each sheet&rsquo;s shape below — nothing is assumed silently.
              </div>
              {sheets.map((s, i) => (
                <div key={s.sheetName} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid " + C.line, flexWrap: "wrap" }}>
                  <div style={{ minWidth: 180, fontWeight: 600, fontSize: 13.5 }}>{s.sheetName}</div>
                  <Select
                    value={s.format}
                    onChange={(v) => setSheets((list) => list.map((x, xi) => (xi === i ? { ...x, format: v } : x)))}
                    options={[
                      { value: "skip", label: "Skip — not investor data" },
                      { value: "wide-monthly", label: "Wide Monthly Contributions (one row per member, one column per month)" },
                      { value: "flat", label: "Flat Transaction List (one row per contribution)" },
                    ]}
                  />
                  {s.format === "flat" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {["nameCol", "amountCol", "dateCol"].map((field) => (
                        <div key={field}>
                          <div style={{ fontSize: 10.5, color: C.inkFaint, textTransform: "uppercase", marginBottom: 3 }}>{field.replace("Col", "")}</div>
                          <Select
                            value={s.flatMapping[field] ?? ""}
                            onChange={(v) => setSheets((list) => list.map((x, xi) => (xi === i ? { ...x, flatMapping: { ...x.flatMapping, [field]: v === "" ? null : parseInt(v, 10) } } : x)))}
                            options={s.headerRow.map((h, idx) => ({ value: String(idx), label: h || `Column ${idx + 1}` }))}
                            placeholder="Not mapped"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <Btn onClick={submitUpload} disabled={busy} testId="migration-upload-submit">{busy ? "Validating…" : "Continue to Review"}</Btn>
                <Btn variant="ghost" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {step === "review" && uploadResult && (
        <ReviewStep
          uploadResult={uploadResult}
          batchDetail={batchDetail}
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

function ReviewStep({ uploadResult, batchDetail, groupDecisions, setGroupDecisions, onConfirm, busy, onCancel }) {
  const { reconciliation, investorAnalyses, flagSummary } = uploadResult;
  const errorRows = (batchDetail?.rows || []).filter((r) => r.validation_status === "error");
  const warningRows = (batchDetail?.rows || []).filter((r) => r.validation_status === "warning");
  const heldGroups = investorAnalyses.filter((a) => a.resolution !== "new");

  function setDecision(key, action) {
    setGroupDecisions((d) => ({ ...d, [key]: { action } }));
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
                <Btn size="sm" variant={groupDecisions[g.key]?.action === "import_as_new" ? "primary" : "outline"} onClick={() => setDecision(g.key, "import_as_new")}>Import as new investor</Btn>
                <Btn size="sm" variant={groupDecisions[g.key]?.action === "skip" ? "primary" : "outline"} onClick={() => setDecision(g.key, "skip")}>Skip for now</Btn>
              </div>
            </div>
          ))}
        </Card>
      )}

      <details style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13.5, color: C.inkSoft, padding: "4px 0" }}>
          All {investorAnalyses.length} investor{investorAnalyses.length === 1 ? "" : "s"} found in this file
        </summary>
        <TableWrap>
          <thead><tr><Th>Name</Th><Th>Rows</Th><Th>Amount</Th><Th>Resolution</Th></tr></thead>
          <tbody>
            {investorAnalyses.map((a) => (
              <tr key={a.key} data-testid="migration-investor-row">
                <Td>{a.displayName}</Td>
                <Td>{a.totalRows}</Td>
                <Td>{fmtUGX(a.sumValidAmount)}</Td>
                <Td><Badge tone={a.resolution === "new" ? "success" : "warning"}>{a.resolution.replace(/_/g, " ")}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </details>

      {errorRows.length > 0 && (
        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13.5, color: C.danger, padding: "4px 0" }}>
            {errorRows.length} row{errorRows.length === 1 ? "" : "s"} failed validation — not imported until fixed
          </summary>
          {errorRows.map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid " + C.line }}>
              <strong>{r.source_data?.sourceRef || "row " + r.source_row_number}:</strong> {(r.validation_errors || []).join(" ")}
            </div>
          ))}
        </details>
      )}

      {warningRows.length > 0 && (
        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13.5, color: C.warningText, padding: "4px 0" }}>
            {warningRows.length} row{warningRows.length === 1 ? "" : "s"} with warnings — importable, worth a look
          </summary>
          {warningRows.slice(0, 30).map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid " + C.line }}>
              <strong>{r.source_data?.sourceRef || "row " + r.source_row_number}:</strong> {(r.validation_warnings || []).join(" ")}
            </div>
          ))}
          {warningRows.length > 30 && <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 6 }}>+{warningRows.length - 30} more.</div>}
        </details>
      )}

      {heldGroups.length > 0 && !allDecided && (
        <div style={{ fontSize: 12.5, color: C.warningText, marginBottom: 10 }}>
          Choose an action for every investor above before confirming.
        </div>
      )}
      <Btn onClick={onConfirm} disabled={busy || (heldGroups.length > 0 && !allDecided)} testId="migration-confirm-submit">
        {busy ? "Importing…" : "Confirm & Import"}
      </Btn>
      <Btn variant="ghost" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</Btn>
    </>
  );
}
