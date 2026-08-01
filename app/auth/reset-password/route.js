import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * The URL requestPasswordReset()'s resetPasswordForEmail() points at
 * (see auth-actions.js). Supabase appends its own token_hash/type=recovery
 * query params, same mechanics as app/auth/confirm/route.js but kept as a
 * separate route deliberately: confirming a signup and recovering a
 * password are different trust events, and this one must NOT run
 * createInvestorProfileRows() — it only needs to turn a valid recovery
 * token into a session, then hand off to the "set a new password" page.
 *
 * IMPORTANT: this URL must also be added to Supabase Dashboard ->
 * Authentication -> URL Configuration -> Redirect URLs, same as /auth/confirm.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (token_hash && type === "recovery") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect("/auth/reset-password/new");
  }

  redirect("/auth/error?reason=invalid_or_expired_link");
}
