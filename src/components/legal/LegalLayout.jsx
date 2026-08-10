import { Fragment } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { SUPPORT_EMAIL, SUPPORT_PHONES } from "@/lib/constants";
import { RED, INK, INK_SOFT, INK_FAINT, BORDER, PANEL, FONT_FAMILY } from "@/lib/marketingTheme";

// Shared shell for /privacy and /terms — same header/footer chrome and red/
// ink/white system as the landing page (app/page.js), so a member who opens
// either link from the registration wizard lands on something that reads as
// the same site, not a bolted-on legal template. A left-rail table of
// contents (built from `sections`) is the one addition specific to long-form
// legal text — both documents run 15-20+ numbered sections, and a plain
// scroll would bury the section a reader is actually looking for.
function Block({ block }) {
  if (block.type === "ul") {
    return (
      <ul style={{ margin: "0 0 14px", paddingLeft: 20, color: INK_SOFT, fontSize: 14.5, lineHeight: 1.75 }}>
        {block.items.map((item, i) => <li key={i} style={{ marginBottom: 4 }}>{item}</li>)}
      </ul>
    );
  }
  return <p style={{ margin: "0 0 14px", color: INK_SOFT, fontSize: 14.5, lineHeight: 1.75 }}>{block.text}</p>;
}

export function LegalLayout({ eyebrow, title, effectiveDate, lastUpdated, intro, sections, contact }) {
  return (
    <div style={{ background: "#FFFFFF", color: INK, fontFamily: FONT_FAMILY }}>
      <style>{`
        .jbd-legal-toc { display: block; }
        @media (max-width: 900px) {
          .jbd-legal-toc { display: none; }
        }
        .jbd-legal-link:hover { color: ${RED} !important; }
        .jbd-legal-toc a:hover { color: ${RED} !important; }
      `}</style>

      {/* ---------------- NAV ---------------- */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid " + BORDER }}>
        <nav aria-label="Primary" style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, textDecoration: "none" }}>
            <Logo size={32} />
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 0.6, color: INK, whiteSpace: "nowrap" }}>JEBBIDOX</span>
          </Link>
          <Link className="jbd-legal-link" href="/" style={{ fontSize: 13.5, fontWeight: 600, color: INK_SOFT, textDecoration: "none", transition: "color 0.15s" }}>
            ← Back to Jebbidox
          </Link>
        </nav>
      </header>

      <main>
        {/* ---------------- TITLE ---------------- */}
        <section style={{ padding: "56px 24px 40px", borderBottom: "1px solid " + BORDER }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.6, color: RED, textTransform: "uppercase", marginBottom: 14 }}>
              {eyebrow}
            </div>
            <h1 style={{ fontSize: "clamp(28px, 3.8vw, 42px)", fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 16px", color: INK }}>
              {title}
            </h1>
            {intro ? <p style={{ fontSize: 15.5, color: INK_SOFT, maxWidth: 620, lineHeight: 1.7, margin: "0 0 18px" }}>{intro}</p> : null}
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12.5, color: INK_FAINT }}>
              <span><strong style={{ color: INK_SOFT }}>Effective Date:</strong> {effectiveDate}</span>
              <span><strong style={{ color: INK_SOFT }}>Last Updated:</strong> {lastUpdated}</span>
            </div>
          </div>
        </section>

        {/* ---------------- CONTENT ---------------- */}
        <section style={{ padding: "48px 24px 72px" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "240px 1fr", gap: 56, alignItems: "flex-start" }}>
            <nav aria-label="Table of contents" className="jbd-legal-toc" style={{ position: "sticky", top: 92 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: INK_FAINT, textTransform: "uppercase", marginBottom: 12 }}>
                On this page
              </div>
              <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} style={{ fontSize: 12.5, color: INK_SOFT, textDecoration: "none", lineHeight: 1.4, transition: "color 0.15s" }}>
                      {s.heading}
                    </a>
                  </li>
                ))}
                {contact ? (
                  <li>
                    <a href="#contact" style={{ fontSize: 12.5, color: INK_SOFT, textDecoration: "none", lineHeight: 1.4, transition: "color 0.15s" }}>
                      {contact.heading}
                    </a>
                  </li>
                ) : null}
              </ol>
            </nav>

            <article>
              {sections.map((s) => (
                <div key={s.id} id={s.id} style={{ marginBottom: 34, scrollMarginTop: 92 }}>
                  <h2 style={{ fontSize: 19, fontWeight: 700, color: INK, margin: "0 0 12px" }}>{s.heading}</h2>
                  {s.blocks.map((b, i) => <Block key={i} block={b} />)}
                </div>
              ))}

              {contact ? (
                <div id="contact" style={{ marginTop: 40, padding: 22, borderRadius: 8, background: PANEL, border: "1px solid " + BORDER, scrollMarginTop: 92 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: INK, marginBottom: 6 }}>{contact.heading}</div>
                  <div style={{ fontSize: 14, color: INK_SOFT, lineHeight: 1.8 }}>
                    <div style={{ fontWeight: 600, color: INK }}>Jebbidox Youth Investment Club</div>
                    <div>Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="jbd-legal-link" style={{ color: INK_SOFT, transition: "color 0.15s" }}>{SUPPORT_EMAIL}</a></div>
                    <div>
                      Telephone:{" "}
                      {SUPPORT_PHONES.map((phone, i) => (
                        <Fragment key={phone}>
                          {i > 0 ? ", " : ""}
                          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="jbd-legal-link" style={{ color: INK_SOFT, transition: "color 0.15s" }}>{phone}</a>
                        </Fragment>
                      ))}
                    </div>
                    <div>Address: Kireka, Uganda</div>
                  </div>
                </div>
              ) : null}
            </article>
          </div>
        </section>
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer style={{ borderTop: "1px solid " + BORDER, padding: "36px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <Logo size={22} />
            <span style={{ fontWeight: 700, fontSize: 13, color: INK }}>Jebbidox Youth Investment Club</span>
          </div>
          <nav aria-label="Footer" style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12.5 }}>
            <Link className="jbd-legal-link" href="/privacy" style={{ color: INK_SOFT, textDecoration: "none", transition: "color 0.15s" }}>Privacy Policy</Link>
            <Link className="jbd-legal-link" href="/terms" style={{ color: INK_SOFT, textDecoration: "none", transition: "color 0.15s" }}>Terms &amp; Conditions</Link>
            <Link className="jbd-legal-link" href="/portal" style={{ color: INK_SOFT, textDecoration: "none", transition: "color 0.15s" }}>Sign In</Link>
          </nav>
        </div>
        <div style={{ maxWidth: 1180, margin: "18px auto 0", fontSize: 12, color: INK_FAINT }}>
          © 2026 Jebbidox Youth Investment Club. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
