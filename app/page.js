import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { HeroRotator } from "@/components/marketing/HeroRotator";
import { SUPPORT_EMAIL } from "@/lib/constants";

// The landing page has its own restrained red/ink/white system — separate from
// the internal app's garnet/gold "Digital Passbook" tokens in src/lib/theme.js,
// which stay as-is (this redesign is scoped to the public landing page, not the
// authenticated dashboard). RED is tuned close to the logo's disc color.
const RED = "#E71920";
const INK = "#15100F";
const INK_SOFT = "#4A4747";
const INK_FAINT = "#8A8583";
const BORDER = "#E7E5E4";
const PANEL = "#FAFAFA";

const KEYWORDS = ["Youth Investment", "Savings", "Investment Management", "Digital Records", "Member Accounts"];

// Real photography from the Jebbidox brand library (Bloom) — one photo per
// section, per the "one core image" rule. Not committed as repo binaries;
// served through next/image's remote loader (see next.config.mjs).
const HERO_PHOTO = {
  src: "https://www.trybloom.ai/img/b55eb95c-4413-4699-bcfc-91102dcb2dce",
  alt: "A young Jebbidox investor smiling and celebrating after checking his investment progress on his phone at his desk",
};
const VALUE_PHOTO = {
  src: "https://www.trybloom.ai/img/04310eef-9d7b-4d99-83e2-a89107e5566f",
  alt: "Four young Jebbidox Youth Investment Club members reviewing their investment portfolio together around a laptop",
};

function FramedPhoto({ photo, priority }) {
  return (
    <div style={{ background: PANEL, border: "1px solid " + BORDER, borderRadius: 8, boxShadow: "0 1px 2px rgba(21,16,15,.04), 0 10px 24px -14px rgba(21,16,15,.18)", padding: 8, lineHeight: 0 }}>
      <Image
        src={photo.src}
        alt={photo.alt}
        width={760}
        height={507}
        priority={priority}
        sizes="(max-width: 720px) 90vw, 480px"
        style={{ width: "100%", height: "auto", borderRadius: 4, display: "block" }}
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <div style={{ background: "#FFFFFF", color: INK, fontFamily: "'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" }}>
      <style>{`
        @media (max-width: 480px) {
          .jbd-nav-signin { display: none; }
          .jbd-nav-wordmark { display: none; }
        }
        @media (max-width: 780px) {
          .jbd-hero-grid { grid-template-columns: 1fr !important; }
          .jbd-hero-photo { max-width: 420px; margin: 0 auto; }
        }
        @media (max-width: 720px) {
          .jbd-value-grid { grid-template-columns: 1fr !important; }
          .jbd-value-image { order: -1; max-width: 380px; margin: 0 auto; }
        }
        @media (max-width: 640px) {
          .jbd-stat-row { gap: 26px !important; }
          .jbd-footer-row { flex-direction: column !important; align-items: flex-start !important; }
        }
        .jbd-cta-primary:hover { background: #C81118 !important; }
        .jbd-cta-secondary:hover { border-color: ${INK} !important; color: ${INK} !important; }
        .jbd-link:hover { color: ${RED} !important; }
      `}</style>

      {/* ---------------- NAV ---------------- */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid " + BORDER }}>
        <nav aria-label="Primary" style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, textDecoration: "none" }}>
            <Logo size={32} />
            <span className="jbd-nav-wordmark" style={{ fontWeight: 700, fontSize: 14, letterSpacing: 0.6, color: INK, whiteSpace: "nowrap" }}>JEBBIDOX</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Link className="jbd-nav-signin jbd-link" href="/portal" style={{ fontSize: 13.5, fontWeight: 600, color: INK_SOFT, textDecoration: "none", padding: "9px 6px", whiteSpace: "nowrap", transition: "color 0.15s" }}>
              Sign In
            </Link>
            <Link className="jbd-cta-primary" href="/portal?join=1" style={{ fontSize: 13.5, fontWeight: 700, color: "#FFFFFF", textDecoration: "none", background: RED, padding: "10px 18px", borderRadius: 8, whiteSpace: "nowrap", transition: "background 0.15s" }}>
              Join Jebbidox
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ---------------- SECTION 1 — HERO ---------------- */}
        <section aria-label="Introduction" style={{ padding: "72px 24px" }}>
          <div className="jbd-hero-grid" style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 56, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.6, color: RED, textTransform: "uppercase", marginBottom: 16 }}>
                Jebbidox Youth Investment Club
              </div>

              <HeroRotator align="left" />

              <p style={{ fontSize: 15.5, color: INK_SOFT, maxWidth: 440, margin: "22px 0 0", lineHeight: 1.6 }}>
                A digital investment club for young people who want their contributions, investments and
                financial records in one place — not scattered across memory.
              </p>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 32 }}>
                <Link className="jbd-cta-primary" href="/portal?join=1" style={{ fontSize: 14.5, fontWeight: 700, color: "#FFFFFF", textDecoration: "none", background: RED, padding: "15px 28px", borderRadius: 8, transition: "background 0.15s" }}>
                  Join Jebbidox
                </Link>
                <Link className="jbd-cta-secondary" href="/portal" style={{ fontSize: 14.5, fontWeight: 600, color: INK_SOFT, textDecoration: "none", border: "1.5px solid " + BORDER, padding: "15px 28px", borderRadius: 8, transition: "border-color 0.15s, color 0.15s" }}>
                  Sign In
                </Link>
              </div>

              <div className="jbd-stat-row" style={{ display: "flex", gap: 40, flexWrap: "wrap", marginTop: 52 }}>
                {[["30%", "Standard package"], ["40%", "Corporate package"], ["12 months", "Investment period"]].map((s) => (
                  <div key={s[0]}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: INK }}>{s[0]}</div>
                    <div style={{ fontSize: 12, color: INK_FAINT, marginTop: 3 }}>{s[1]}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="jbd-hero-photo">
              <FramedPhoto photo={HERO_PHOTO} priority />
            </div>
          </div>
        </section>

        {/* ---------------- SECTION 2 — VALUE / EXPLANATION ---------------- */}
        <section id="about" aria-label="What is Jebbidox" style={{ borderTop: "1px solid " + BORDER, padding: "80px 24px" }}>
          <div className="jbd-value-grid" style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 64, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 1.6, color: RED, textTransform: "uppercase", marginBottom: 14 }}>
                What is Jebbidox
              </div>
              <h2 style={{ fontSize: "clamp(28px, 3.4vw, 40px)", fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 18px", color: INK }}>
                Invest with clarity.
              </h2>
              <p style={{ fontSize: 15.5, color: INK_SOFT, lineHeight: 1.75, marginBottom: 14 }}>
                Jebbidox gives members a simple digital way to participate in the Jebbidox Youth Investment
                Club — keep track of contributions, follow investments, and access financial records in
                one place.
              </p>
              <p style={{ fontSize: 14, color: INK_FAINT, lineHeight: 1.7, marginBottom: 26 }}>
                Built for young investors in Uganda who want their money&rsquo;s progress on record, not
                just in memory.
              </p>
              <div style={{ fontSize: 12.5, color: INK_FAINT, letterSpacing: 0.2 }}>
                {KEYWORDS.join(" · ")}
              </div>
            </div>

            <div className="jbd-value-image">
              <FramedPhoto photo={VALUE_PHOTO} />
            </div>
          </div>
        </section>
      </main>

      {/* ---------------- SECTION 3 — FOOTER ---------------- */}
      <footer style={{ borderTop: "1px solid " + BORDER, padding: "36px 24px" }}>
        <div className="jbd-footer-row" style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div style={{ maxWidth: 320 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
              <Logo size={24} />
              <span style={{ fontWeight: 700, fontSize: 13.5, color: INK }}>Jebbidox Youth Investment Club</span>
            </div>
            <p style={{ fontSize: 12.5, color: INK_FAINT, lineHeight: 1.6, margin: 0 }}>
              Building better financial habits, one investment at a time.
            </p>
          </div>

          <nav aria-label="Footer" style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 13 }}>
            <a className="jbd-link" href="#about" style={{ color: INK_SOFT, textDecoration: "none", transition: "color 0.15s" }}>About</a>
            <a className="jbd-link" href={`mailto:${SUPPORT_EMAIL}`} style={{ color: INK_SOFT, textDecoration: "none", transition: "color 0.15s" }}>Contact</a>
            <Link className="jbd-link" href="/portal" style={{ color: INK_SOFT, textDecoration: "none", transition: "color 0.15s" }}>Sign In</Link>
            <Link className="jbd-link" href="/portal?join=1" style={{ color: INK_SOFT, textDecoration: "none", transition: "color 0.15s" }}>Join Jebbidox</Link>
          </nav>
        </div>

        <div className="jbd-footer-row" style={{ maxWidth: 1180, margin: "22px auto 0", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, fontSize: 12, color: INK_FAINT, borderTop: "1px solid " + BORDER, paddingTop: 18 }}>
          <span>© 2026 Jebbidox Youth Investment Club. All rights reserved.</span>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <span>Kireka, Uganda</span>
            <a className="jbd-link" href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "inherit", textDecoration: "none", transition: "color 0.15s" }}>{SUPPORT_EMAIL}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
