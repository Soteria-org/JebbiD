export default function AuthErrorPage({ searchParams }) {
  const reason = searchParams?.reason;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1B0808",
        color: "#FFF5F5",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Confirmation link problem</h1>
        <p style={{ opacity: 0.8, fontSize: 14, lineHeight: 1.5 }}>
          This link is invalid or has expired. Please try registering again, or
          contact support if this keeps happening.
        </p>
        {reason && (
          <p style={{ opacity: 0.5, fontSize: 12, marginTop: 16 }}>Reference: {reason}</p>
        )}
      </div>
    </div>
  );
}
