"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Upload } from "@/components/icons/index";
import { PageShell } from "@/components/layout/PageShell";
import { Badge, Btn, Card, EmptyState, GuidanceBanner, Select, TableWrap, Td, Th } from "@/components/ui/primitives";
import { fmtDateTime, fmtUGX } from "@/lib/format";
import { C, FONT_DISPLAY, FONT_MONO } from "@/lib/theme";
import { readWorkbook, suggestFlatMapping, buildWideMonthlyMembers, buildFlatEntries } from "@/lib/migration/parseXlsx";
import { uploadImportBatch, getDryRunReport, confirmImportBatch, listImportBatches } from "@/lib/actions/migration-actions";
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
 * Super Admin Historical Migration dashboard — spec §8. One screen covering
 * the full pipeline: Upload -> sheet format confirmation (spec §4.3's column
 * mapping, adapted to this club's two real sheet shapes) -> Validation issue
 * list -> Dry-run reconciliation -> Confirm Import -> Post-import
 * reconciliation -> Import batch history.
 */
export function HistoricalMigration({ ctx }) {
  const [mode, setMode] = useState("history"); // 'history' | 'wizard'
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

  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only, matching the rest of this app's data-load effects
  React.useEffect(() => { loadHistory(); }, []);

  if (mode === "wizard") {
    return <MigrationWizard ctx={ctx} onDone={() => { setMode("history"); loadHistory(); }} onCancel={() => setMode("history")} />;
  }

  return (
    <PageShell ctx={ctx} title="Historical Migration">
      <GuidanceBanner tone="info">
        Import a club&rsquo;s historical investment spreadsheet (savings register or transaction log) into Jebbidox as real, individually-tracked investment positions — each contribution becomes its own position, per the club&rsquo;s confirmed rule. Nothing is written until you explicitly confirm after reviewing the dry-run reconciliation.
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
                <Td><Btn size="sm" variant="ghost" onClick={() => { setMode("wizard"); }}>Inspect</Btn></Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </PageShell>
  );
}

const STEP_LABELS = { upload: "1. Upload", mapping: "2. Confirm Format", review: "3. Validation & Dry Run", confirm: "4. Confirm Import", result: "5. Result" };

function MigrationWizard({ ctx, onDone, onCancel }) {
  const [step, setStep] = useState("upload");
  const [filename, setFilename] = useState("");
  const [sheets, setSheets] = useState([]); // [{sheetName, headerRow, dataRows, format, flatMapping}]
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [batchDetail, setBatchDetail] = useState(null);
  const [groupDecisions, setGroupDecisions] = useState({});
  const [confirmResult, setConfirmResult] = useState(null);

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
    setConfirmResult(res);
    setStep("result");
  }

  return (
    <PageShell ctx={ctx} title="New Historical Import">
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {Object.entries(STEP_LABELS).map(([key, label]) => (
          <div key={key} style={{
            padding: "6px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700,
            background: step === key ? C.brand : C.cardBg, color: step === key ? C.white : C.inkFaint,
          }}>{label}</div>
        ))}
      </div>

      {error && <GuidanceBanner tone="warning" icon={AlertTriangle}>{error}</GuidanceBanner>}

      {step === "upload" && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>Upload spreadsheet (.xlsx)</div>
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} data-testid="migration-upload-input" />
          {sheets.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
                {sheets.length} sheet{sheets.length === 1 ? "" : "s"} found. Confirm each sheet&rsquo;s shape before anything is parsed — nothing here is assumed silently (spec §4.3).
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
                <Btn onClick={submitUpload} disabled={busy} testId="migration-upload-submit">{busy ? "Validating…" : "Validate & Preview"}</Btn>
                <Btn variant="ghost" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</Btn>
              </div>
            </div>
          )}
        </Card>
      )}

      {step === "review" && uploadResult && (
        <ReviewStep uploadResult={uploadResult} batchDetail={batchDetail} onNext={() => setStep("confirm")} onCancel={onCancel} />
      )}

      {step === "confirm" && uploadResult && (
        <ConfirmStep
          uploadResult={uploadResult}
          groupDecisions={groupDecisions}
          setGroupDecisions={setGroupDecisions}
          onSubmit={submitConfirm}
          busy={busy}
          onBack={() => setStep("review")}
        />
      )}

      {step === "result" && confirmResult && (
        <Card data-testid="migration-result-summary">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <CheckCircle2 size={22} color={C.success} />
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 600 }}>Import complete</div>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
            <Stat label="Imported" value={confirmResult.importedCount} testId="migration-result-imported-count" />
            <Stat label="Failed" value={confirmResult.failedCount} tone={confirmResult.failedCount > 0 ? "danger" : undefined} testId="migration-result-failed-count" />
            <Stat label="Skipped" value={confirmResult.skippedCount} testId="migration-result-skipped-count" />
            <Stat label="Total imported amount" value={fmtUGX(confirmResult.importedTotalAmount)} />
          </div>
          {confirmResult.rowErrors?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Row-level failures</div>
              {confirmResult.rowErrors.map((e, i) => (
                <div key={i} style={{ fontSize: 12.5, color: C.danger, padding: "4px 0" }}>{e.sourceRef}: {e.error}</div>
              ))}
            </div>
          )}
          <Btn onClick={onDone}>Back to Batch History</Btn>
        </Card>
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

function ReviewStep({ uploadResult, batchDetail, onNext, onCancel }) {
  const { reconciliation, investorAnalyses, flagSummary } = uploadResult;
  const errorRows = (batchDetail?.rows || []).filter((r) => r.validation_status === "error");
  const warningRows = (batchDetail?.rows || []).filter((r) => r.validation_status === "warning");

  return (
    <>
      <Card style={{ marginBottom: 16 }} data-testid="migration-reconciliation-summary">
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 12 }}>Reconciliation Preview</div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 12 }}>
          <Stat label="Source rows" value={reconciliation.totalSourceRows} />
          <Stat label="Source total" value={fmtUGX(reconciliation.totalSourceAmount)} />
          <Stat label="Ready to import" value={reconciliation.readyToImportRowCount + " (" + fmtUGX(reconciliation.readyToImportAmount) + ")"} />
          <Stat label="Held for decision" value={reconciliation.heldForDecisionRowCount + " (" + fmtUGX(reconciliation.heldForDecisionAmount) + ")"} />
          <Stat label="Failed validation" value={reconciliation.errorRowCount + " (" + fmtUGX(reconciliation.errorAmount) + ")"} tone={reconciliation.errorRowCount > 0 ? "danger" : undefined} />
        </div>
        <Badge tone={reconciliation.reconciles ? "success" : "danger"}>{reconciliation.reconciles ? "Reconciles to zero" : "Does not reconcile"}</Badge>
        <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 12.5, color: C.inkSoft }}>
          {reconciliation.explanation.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      </Card>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <Badge tone={flagSummary.crossSheetOverlaps ? "warning" : "neutral"}>Cross-sheet overlaps: {flagSummary.crossSheetOverlaps}</Badge>
        <Badge tone={flagSummary.possibleDuplicates ? "warning" : "neutral"}>Possible duplicates: {flagSummary.possibleDuplicates}</Badge>
        <Badge tone={flagSummary.nonPersonEntries ? "warning" : "neutral"}>Non-person entries: {flagSummary.nonPersonEntries}</Badge>
        <Badge tone={flagSummary.jointIdentityEntries ? "warning" : "neutral"}>Joint identity: {flagSummary.jointIdentityEntries}</Badge>
        <Badge tone={flagSummary.noContributionMembers ? "warning" : "neutral"}>No contributions: {flagSummary.noContributionMembers}</Badge>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>Investors found ({investorAnalyses.length})</div>
        <TableWrap>
          <thead><tr><Th>Name</Th><Th>Rows</Th><Th>Amount</Th><Th>Resolution</Th><Th>Notes</Th></tr></thead>
          <tbody>
            {investorAnalyses.map((a) => (
              <tr key={a.key} data-testid="migration-investor-row">
                <Td>{a.displayName}</Td>
                <Td>{a.totalRows}</Td>
                <Td>{fmtUGX(a.sumValidAmount)}</Td>
                <Td><Badge tone={a.resolution === "new" ? "success" : "warning"}>{a.resolution.replace(/_/g, " ")}</Badge></Td>
                <Td style={{ fontSize: 12 }}>
                  {a.crossSheetOverlap ? "Appears on multiple sheets. " : ""}
                  {a.existingProfileMatches?.length ? `Name matches existing investor(s): ${a.existingProfileMatches.map((m) => m.full_name).join(", ")}. ` : ""}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      </Card>

      {errorRows.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10, color: C.danger }}>Validation errors ({errorRows.length}) — not imported until fixed</div>
          {errorRows.map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid " + C.line }}>
              <strong>{r.source_data?.sourceRef || "row " + r.source_row_number}:</strong> {(r.validation_errors || []).join(" ")}
            </div>
          ))}
        </Card>
      )}

      {warningRows.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10, color: C.warningText }}>Warnings ({warningRows.length}) — importable, worth a look</div>
          {warningRows.slice(0, 30).map((r) => (
            <div key={r.id} style={{ fontSize: 12.5, padding: "6px 0", borderBottom: "1px solid " + C.line }}>
              <strong>{r.source_data?.sourceRef || "row " + r.source_row_number}:</strong> {(r.validation_warnings || []).join(" ")}
            </div>
          ))}
          {warningRows.length > 30 && <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 6 }}>+{warningRows.length - 30} more.</div>}
        </Card>
      )}

      <Btn onClick={onNext} testId="migration-review-next">Continue to Confirm</Btn>
      <Btn variant="ghost" onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</Btn>
    </>
  );
}

function ConfirmStep({ uploadResult, groupDecisions, setGroupDecisions, onSubmit, busy, onBack }) {
  const heldGroups = uploadResult.investorAnalyses.filter((a) => a.resolution !== "new");

  function setDecision(key, action) {
    setGroupDecisions((d) => ({ ...d, [key]: { action } }));
  }

  return (
    <Card>
      <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 10 }}>Confirm import</div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>
        Clean rows import automatically. Every held row below requires an explicit decision — none are imported silently (spec §4.5/§11).
      </div>
      {heldGroups.length === 0 ? (
        <GuidanceBanner tone="success">No held rows — every investor resolved cleanly.</GuidanceBanner>
      ) : (
        heldGroups.map((g) => (
          <div key={g.key} style={{ padding: "12px 0", borderBottom: "1px solid " + C.line }} data-testid="migration-group-decision">
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{g.displayName} — {g.resolution.replace(/_/g, " ")}</div>
            <div style={{ fontSize: 12, color: C.inkFaint, marginBottom: 8 }}>
              {g.existingProfileMatches?.length ? `Matches existing: ${g.existingProfileMatches.map((m) => `${m.full_name} (${m.member_id || "no member id"})`).join(", ")}. ` : ""}
              {fmtUGX(g.sumValidAmount)} across {g.totalRows} rows.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Btn size="sm" variant={groupDecisions[g.key]?.action === "import_as_new" ? "primary" : "outline"} onClick={() => setDecision(g.key, "import_as_new")}>Import as new investor</Btn>
              <Btn size="sm" variant={groupDecisions[g.key]?.action === "skip" ? "primary" : "outline"} onClick={() => setDecision(g.key, "skip")}>Skip for now</Btn>
            </div>
          </div>
        ))
      )}
      <div style={{ marginTop: 18 }}>
        <Btn onClick={onSubmit} disabled={busy} testId="migration-confirm-submit">{busy ? "Importing…" : "Confirm & Import"}</Btn>
        <Btn variant="ghost" onClick={onBack} style={{ marginLeft: 8 }}>Back</Btn>
      </div>
    </Card>
  );
}
