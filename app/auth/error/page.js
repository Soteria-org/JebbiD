import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function AuthErrorPage({ searchParams }) {
  const reason = searchParams?.reason;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 18% 12%, #7A1220, #4E0B15 62%)",
        color: "#FBF6EA",
        fontFamily: "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <Logo size={48} />
        </div>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
          Confirmation link problem
        </h1>
        <p style={{ color: "#D9C2A8", fontSize: 14, lineHeight: 1.6 }}>
          This link is invalid or has expired. Please try registering again, or
          contact support if this keeps happening.
        </p>
        {reason && (
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", color: "#B8987A", fontSize: 11.5, marginTop: 18 }}>
            Reference: {reason}
          </p>
        )}
        <Link
          href="/portal"
          style={{
            display: "inline-block", marginTop: 28, fontSize: 14, fontWeight: 700,
            color: "#3A2A0A", textDecoration: "none", background: "#B98A2E",
            padding: "13px 26px", borderRadius: 8,
          }}
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
