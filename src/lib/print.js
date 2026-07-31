/**
 * Opens a standalone, print-ready document in a new tab and triggers the
 * browser's print dialog — from which the user can print or "Save as PDF"
 * (every modern browser's print dialog offers this natively, so a receipt
 * or statement is both printable and downloadable without a PDF-generation
 * dependency). The document is fully self-contained: it doesn't inherit app
 * chrome (sidebar/header) because it's a separate document, not a CSS-hidden
 * section of the current page — which is what makes it print cleanly.
 */
export function openPrintDocument(title, bodyHtml) {
  const win = window.open("", "_blank", "width=820,height=1060");
  if (!win) return false;

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#1C1410; --ink-soft:#5C4F44; --ink-faint:#9C8D7C;
    --paper:#F6EFE0; --white:#FFFFFF;
    --garnet:#7A1220; --gold:#B98A2E; --gold-soft:#EDE0BE;
    --sage:#3F5D42; --line:#DCCCA8;
  }
  *{box-sizing:border-box;}
  body{
    margin:0; background:var(--paper); color:var(--ink);
    font-family:'IBM Plex Sans',sans-serif; padding:40px;
  }
  .sheet{
    max-width:720px; margin:0 auto; background:var(--white);
    border:1px solid var(--line); border-radius:4px; padding:48px;
    position:relative; overflow:hidden;
  }
  .watermark{
    position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
    font-family:'Fraunces',serif; font-size:120px; font-weight:600; color:var(--garnet);
    opacity:0.035; transform:rotate(-18deg); pointer-events:none; white-space:nowrap;
  }
  .display{ font-family:'Fraunces',serif; }
  .mono{ font-family:'IBM Plex Mono',monospace; }
  table{ width:100%; border-collapse:collapse; }
  th{ text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:0.8px; color:var(--ink-faint);
    font-weight:600; padding:8px 10px; border-bottom:1.5px solid var(--ink); }
  td{ padding:10px; border-bottom:1px dashed var(--line); font-size:13px; }
  .num{ font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums; text-align:right; }
  .print-btn{
    display:block; margin:24px auto 0; font-family:'IBM Plex Sans',sans-serif; font-weight:700; font-size:13.5px;
    background:var(--garnet); color:var(--white); border:none; border-radius:8px; padding:12px 24px; cursor:pointer;
  }
  @media print{
    body{ padding:0; background:var(--white); }
    .sheet{ border:none; border-radius:0; max-width:none; }
    .print-btn{ display:none; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="watermark">JEBBIDOX</div>
  ${bodyHtml}
</div>
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>`);
  win.document.close();
  win.focus();
  return true;
}
