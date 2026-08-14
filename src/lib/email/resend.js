/**
 * Outbound email via the Resend REST API — a direct fetch() call, not the
 * `resend` npm SDK, since this is the one place in the app that needs to
 * actually send mail (see docs/migration/HISTORICAL_DATA_MIGRATION_SPEC.md
 * §6.2's decision: option 2, a real Resend send, rather than reworking the
 * temp-password flow around Supabase's native magic-link invite). Everywhere
 * else in this repo, Resend is only ever a receiver (app/api/webhooks/resend/
 * route.js) or a Supabase-Dashboard-configured SMTP relay (see
 * docs/database-schema.md §8) — this is intentionally the first and only
 * direct outbound call.
 *
 * Requires RESEND_API_KEY and RESEND_FROM_EMAIL in the deploy environment.
 * Mirrors createStaffOrInvestorAccount()'s self-diagnosing missing-env-var
 * check (auth-actions.js) rather than letting a misconfiguration surface as
 * an opaque fetch failure deep inside an admin flow.
 */
export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    return { error: "Server is not configured to send email (missing RESEND_API_KEY in the deploy environment)." };
  }
  if (!from) {
    return { error: "Server is not configured to send email (missing RESEND_FROM_EMAIL in the deploy environment)." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { error: body?.message || `Resend API returned ${response.status}` };
    }
    return { success: true, id: body?.id };
  } catch (err) {
    return { error: "Failed to reach the email provider: " + (err?.message || String(err)) };
  }
}

export function migrationInvitationEmailHtml({ fullName, memberId, tempPassword, loginUrl, expiryHours }) {
  return `
    <div style="font-family: Poppins, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #C8102E;">Welcome back to Jebbidox, ${escapeHtml(fullName)}</h2>
      <p>Your historical investment records with Jebbidox Youth Investment Club have been migrated onto our new platform. Your Member ID is <strong>${escapeHtml(memberId || "—")}</strong>.</p>
      <p>To view your investments, sign in with the temporary password below. You'll be asked to set a permanent password on first sign-in.</p>
      <p style="background:#f5f5f5; padding:12px 16px; border-radius:8px; font-family: monospace; font-size: 16px;">${escapeHtml(tempPassword)}</p>
      <p style="color:#C8102E; font-weight:600;">This temporary password expires in ${expiryHours} hours.</p>
      <p><a href="${loginUrl}" style="background:#C8102E; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; display:inline-block;">Sign in to Jebbidox</a></p>
      <p style="font-size:13px; color:#666;">If this expires before you sign in, contact your Jebbidox administrator to have it resent.</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
