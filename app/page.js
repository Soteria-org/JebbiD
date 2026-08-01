import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { HeroRotator } from "@/components/marketing/HeroRotator";
import { SUPPORT_EMAIL } from "@/lib/constants";
import {
  Award, Bell, FileCheck, Lock, ShieldCheck, TrendingUp, Users, Wallet, Briefcase,
} from "@/components/icons/index";

const EDITORIAL = [
  { word: "OWN.", body: "Wealth begins the day your money starts working harder than you do." },
  { word: "DISCIPLINE.", body: "Great investors rarely make dramatic decisions. They make consistent ones." },
  { word: "COMPOUND.", body: "Time quietly rewards those who stay invested." },
  { word: "TOMORROW.", body: "Build the future before you need it." },
];

const FEATURES = [
  { icon: Wallet, title: "Digital Passbook", body: "Every deposit, approval, and maturity writes a new stamped entry to your permanent member ledger — not a spreadsheet row that can quietly change." },
  { icon: TrendingUp, title: "Structured Packages", body: "Standard and Corporate investment packages with fixed annual returns and a clear 12-month term, visible before you commit a shilling." },
  { icon: ShieldCheck, title: "Row-Level Security", body: "Every account is protected by database-level access policies, not just an app-layer check — investors see only their own ledger, always." },
  { icon: FileCheck, title: "Audited, Not Just Logged", body: "Approvals, rejections, and account changes are written to an immutable audit trail — nothing about your money moves without a record." },
  { icon: Award, title: "Maturity Centre", body: "When a position matures, you choose what happens next — reinvest, withdraw, or switch package — nothing is decided for you." },
  { icon: Bell, title: "Real-Time Notifications", body: "Know the moment a deposit is verified, a position matures, or a Finance Officer needs something from you." },
];

const STEPS = [
  { n: "01", title: "Open a Member Ledger", body: "Register with your details and identification — your account starts as a digital passbook, not a generic profile." },
  { n: "02", title: "Choose a Package", body: "Standard at 30% per year, or Corporate at 40% per year for larger positions. Both run a fixed 12-month term." },
  { n: "03", title: "Submit a Deposit", body: "Pay by mobile money or bank transfer, attach your proof, and a Finance Officer verifies it — visibly, with a status you can track." },
  { n: "04", title: "Track to Maturity", body: "Watch your position accrue in the Maturity Centre, then reinvest, withdraw, or switch package when it matures." },
];

const THOUGHT_BUBBLES = [
  ["🎯", "Weekly Goal", "One more investment this month keeps your financial goals on track."],
  ["🛡", "Security Note", "Every transaction is verified by a person before it reaches your portfolio."],
  ["💬", "Today's Reminder", "Consistency beats intensity."],
];

const FAQS = [
  ["What is Jebbidox?", "A member-owned investment club platform. Every investor gets a digital passbook — a running, verifiable ledger of deposits, approvals, interest, and maturity, reviewed by a Finance Officer before anything is confirmed."],
  ["How are returns calculated?", "Each package has a fixed annual rate — 30% for Standard, 40% for Corporate — applied over a 12-month term from the date your deposit is approved."],
  ["Who approves my deposit?", "A Finance Officer reviews the proof of payment you submit and approves, rejects, or requests clarification. You're notified the moment your status changes."],
  ["Is my data protected?", "Every table is protected by row-level security at the database layer — an investor account can never read another investor's ledger, positions, or documents, by design, not just by app-layer convention."],
  ["What happens at maturity?", "You choose: reinvest into a new position, withdraw your funds, or switch package. Nothing happens automatically without your decision."],
];

export default function LandingPage() {
  return (
    <div style={{ background: "#F6EFE0", color: "#1C1410", fontFamily: "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" }}>
      {/* ---------------- NAV ---------------- */}
      <style>{`
        @media (max-width: 480px) {
          .jbd-nav-signin { display: none; }
          .jbd-nav-wordmark { display: none; }
        }
      `}</style>
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(246,239,224,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid #DCCCA8" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <Logo size={32} animated tone="onLight" />
            <span className="jbd-nav-wordmark" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, letterSpacing: 1.6, color: "#7A1220", whiteSpace: "nowrap" }}>JEBBIDOX</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <Link className="jbd-nav-signin" href="/portal" style={{ fontSize: 13.5, fontWeight: 600, color: "#5C4F44", textDecoration: "none", padding: "9px 6px", whiteSpace: "nowrap" }}>Sign In</Link>
            <Link href="/portal" style={{ fontSize: 13.5, fontWeight: 700, color: "#FBF6EA", textDecoration: "none", background: "#7A1220", padding: "10px 16px", borderRadius: 8, whiteSpace: "nowrap" }}>
              Open a Member Ledger
            </Link>
          </div>
        </div>
      </div>

      {/* ---------------- HERO ---------------- */}
      <section style={{
        position: "relative", overflow: "hidden",
        background: "radial-gradient(circle at 18% 0%, #7A1220, #4E0B15 65%)",
        color: "#FBF6EA", padding: "88px 24px 96px",
      }}>
        <div style={{ position: "absolute", right: "8%", top: -80, width: 320, height: 320, border: "1.5px solid rgba(216,189,130,0.22)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", right: "18%", top: 40, width: 200, height: 200, border: "1.5px solid rgba(216,189,130,0.18)", borderRadius: "50%" }} />
        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <Logo size={64} animated />
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, letterSpacing: 2.5, color: "#D8BD82", marginBottom: 18 }}>
            EST. 2026 · KIREKA, UGANDA
          </div>

          <HeroRotator />

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 30 }}>
            <Link href="/portal" style={{ fontSize: 14.5, fontWeight: 700, color: "#3A2A0A", textDecoration: "none", background: "#B98A2E", padding: "15px 28px", borderRadius: 8 }}>
              Open a Member Ledger →
            </Link>
            <Link href="/portal" style={{ fontSize: 14.5, fontWeight: 600, color: "#FBF6EA", textDecoration: "none", border: "1.5px solid rgba(251,246,234,0.4)", padding: "15px 28px", borderRadius: 8 }}>
              Member Sign In
            </Link>
          </div>
          <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap", marginTop: 64 }}>
            {[["30%", "Standard package return"], ["40%", "Corporate package return"], ["12mo", "Investment period"]].map((s) => (
              <div key={s[0]}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 30, fontWeight: 600 }}>{s[0]}</div>
                <div style={{ fontSize: 12.5, color: "#D9C2A8", marginTop: 4 }}>{s[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- EDITORIAL STATEMENTS ---------------- */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "88px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "48px 32px" }}>
          {EDITORIAL.map((e) => (
            <div key={e.word} style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(24px, 2.6vw, 36px)", fontWeight: 600, color: "#7A1220", letterSpacing: 0.5, marginBottom: 12, whiteSpace: "nowrap" }}>
                {e.word}
              </div>
              <div style={{ fontSize: 14.5, color: "#5C4F44", lineHeight: 1.65, maxWidth: 260 }}>{e.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 88px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: 2, color: "#9C8D7C", marginBottom: 10 }}>WHY JEBBIDOX</div>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(26px, 3.4vw, 36px)", fontWeight: 600, margin: 0 }}>
            Built like an institution. Feels like yours.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 22 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{ background: "#FFFFFF", border: "1px solid #DCCCA8", borderRadius: 14, padding: 28, boxShadow: "0 1px 2px rgba(28,20,16,.05), 0 12px 28px -14px rgba(28,20,16,.2)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F3E1DF", color: "#7A1220", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <f.icon size={20} />
              </div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: "#5C4F44", lineHeight: 1.65 }}>{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section style={{ background: "#FBF6EA", borderTop: "1px solid #DCCCA8", borderBottom: "1px solid #DCCCA8", padding: "88px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: 2, color: "#9C8D7C", marginBottom: 10 }}>HOW IT WORKS</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(26px, 3.4vw, 36px)", fontWeight: 600, margin: 0 }}>
              Four steps. Nothing hidden between them.
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 28 }}>
            {STEPS.map((s) => (
              <div key={s.n}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: 34, fontWeight: 600, color: "#D8BD82", marginBottom: 10 }}>{s.n}</div>
                <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: "#5C4F44", lineHeight: 1.65 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- PHILOSOPHY / SECURITY ---------------- */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "88px 24px", display: "flex", flexWrap: "wrap", gap: 56, alignItems: "center" }}>
        <div style={{ flex: "1 1 420px", minWidth: 0 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: 2, color: "#9C8D7C", marginBottom: 10 }}>OUR PHILOSOPHY</div>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 600, marginTop: 0, marginBottom: 18 }}>
            Wealth is built quietly, one verified deposit at a time.
          </h2>
          <p style={{ fontSize: 14.5, color: "#5C4F44", lineHeight: 1.75, marginBottom: 16 }}>
            Jebbidox exists for members who would rather build slowly and transparently than
            chase speculative returns. Every package has a fixed rate and a fixed term, every
            deposit is verified by a person before it counts, and every action — yours or
            staff&rsquo;s — is written permanently to your ledger.
          </p>
          <p style={{ fontSize: 14.5, color: "#5C4F44", lineHeight: 1.75 }}>
            No balances that move without explanation. No approvals that happen invisibly.
            This is what a member-owned investment club looks like when it&rsquo;s built for trust
            first.
          </p>
        </div>
        <div style={{ flex: "1 1 320px", minWidth: 0, background: "#FFFFFF", border: "1px solid #DCCCA8", borderRadius: 16, padding: 32 }}>
          {[
            [Lock, "Row-level database security on every table"],
            [FileCheck, "Immutable audit trail on every approval"],
            [Users, "Role-scoped access — investor, Finance Officer, Super Admin"],
            [Briefcase, "Human review on every deposit and withdrawal"],
          ].map(([Icon, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px dashed #DCCCA8" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#E4EBE1", color: "#3F5D42", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} />
              </div>
              <span style={{ fontSize: 13.5, color: "#1C1410" }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- INSIDE THE APP: THOUGHT BUBBLES ---------------- */}
      <section style={{ background: "#FBF6EA", borderTop: "1px solid #DCCCA8", borderBottom: "1px solid #DCCCA8", padding: "88px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: 2, color: "#9C8D7C", marginBottom: 10 }}>INSIDE THE APP</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 600, margin: 0 }}>
              Small nudges. Real numbers. Never noise.
            </h2>
            <p style={{ fontSize: 13.5, color: "#5C4F44", marginTop: 10, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              Your dashboard surfaces short, honest observations about your own portfolio — examples below, not live data.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, maxWidth: 900, margin: "0 auto" }}>
            {THOUGHT_BUBBLES.map(([icon, kicker, text]) => (
              <div key={kicker} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "#FFFFFF", border: "1px solid #DCCCA8", borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 2px rgba(28,20,16,.05), 0 12px 28px -14px rgba(28,20,16,.2)" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#F3E1DF", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{icon}</div>
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#7A1220", marginBottom: 4 }}>{kicker}</div>
                  <div style={{ fontSize: 13, color: "#1C1410", lineHeight: 1.5 }}>{text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section style={{ background: "#FBF6EA", padding: "88px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: 2, color: "#9C8D7C", marginBottom: 10 }}>QUESTIONS</div>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 600, margin: 0 }}>Frequently asked</h2>
          </div>
          {FAQS.map(([q, a]) => (
            <div key={q} style={{ padding: "20px 0", borderBottom: "1px solid #DCCCA8" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{q}</div>
              <div style={{ fontSize: 13.5, color: "#5C4F44", lineHeight: 1.65 }}>{a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section style={{ background: "linear-gradient(135deg, #7A1220, #4E0B15)", color: "#FBF6EA", padding: "72px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 600, margin: "0 0 14px" }}>
          The best time to invest was yesterday.<br />The second best time is today.
        </h2>
        <p style={{ fontSize: 14.5, color: "#D9C2A8", marginBottom: 30 }}>Open a Member Ledger in a few minutes.</p>
        <Link href="/portal" style={{ fontSize: 14.5, fontWeight: 700, color: "#3A2A0A", textDecoration: "none", background: "#B98A2E", padding: "15px 30px", borderRadius: 8, display: "inline-block" }}>
          Open a Member Ledger →
        </Link>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer style={{ padding: "32px 24px", borderTop: "1px solid #DCCCA8" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#9C8D7C" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo size={22} tone="onLight" />
            <span>Jebbidox Youth Investment Club</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span>Kireka, Uganda</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "inherit", textDecoration: "none" }}>{SUPPORT_EMAIL}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
