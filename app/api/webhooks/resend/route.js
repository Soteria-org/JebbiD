import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Receives Resend's delivery-event webhooks (sent/delivered/bounced/complained/
 * etc.) and records them so the Club Intelligence Centre can show a real
 * delivery rate instead of nothing. Resend signs these with Svix, so the
 * body must be verified BEFORE it's trusted — this is the only thing that
 * authorizes a write to email_events (that table has no RLS insert policy
 * for any client role; this route uses the service-role admin client).
 *
 * Setup required outside this repo, once:
 *   1. Deploy this branch so /api/webhooks/resend is publicly reachable.
 *   2. In the Resend dashboard (or via the Resend MCP create-webhook tool),
 *      create a webhook pointed at https://jebbidox.site/api/webhooks/resend
 *      for the events listed in WATCHED_EVENTS below.
 *   3. Copy the signing secret Resend gives you (starts with "whsec_") into
 *      this deployment's RESEND_WEBHOOK_SECRET environment variable.
 * Until both the deploy and the env var exist, this route 500s on every call
 * — that's intentional (see the guard below) rather than silently accepting
 * unverified events.
 */
const WATCHED_EVENTS = new Set([
  "email.sent", "email.delivered", "email.delivery_delayed",
  "email.bounced", "email.complained", "email.failed",
]);

function verifySvixSignature(secret, svixId, svixTimestamp, svixSignatureHeader, rawBody) {
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  const provided = (svixSignatureHeader || "").split(" ").map((s) => s.split(",")[1]).filter(Boolean);
  return provided.some((sig) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, "base64"), Buffer.from(expected, "base64"));
    } catch {
      return false;
    }
  });
}

export async function POST(request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("Webhook not configured: RESEND_WEBHOOK_SECRET is not set in this deployment.", { status: 500 });
  }

  const rawBody = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing Svix signature headers.", { status: 400 });
  }
  if (!verifySvixSignature(secret, svixId, svixTimestamp, svixSignature, rawBody)) {
    return new Response("Invalid signature.", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON.", { status: 400 });
  }

  if (!WATCHED_EVENTS.has(event.type)) {
    return new Response("ok", { status: 200 }); // acknowledged, just not one we track
  }

  const admin = createAdminClient();
  const { error } = await admin.from("email_events").insert({
    resend_email_id: event.data?.email_id ?? null,
    event_type: event.type,
    recipient: Array.isArray(event.data?.to) ? event.data.to[0] : (event.data?.to ?? null),
    subject: event.data?.subject ?? null,
    raw: event,
  });
  if (error) {
    return new Response("Failed to record event: " + error.message, { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
