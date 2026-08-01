import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createInvestorProfileRows } from "@/lib/actions/auth-actions";
import { redirect } from "next/navigation";

/**
 * This is the exact URL Supabase's confirmation email links to (see
 * emailRedirectTo in registerInvestor). Supabase appends its own token_hash/type
 * query params — nothing to configure on our side beyond the URL itself.
 *
 * IMPORTANT: this URL must also be added to Supabase Dashboard -> Authentication ->
 * URL Configuration -> Redirect URLs, or Supabase will refuse to redirect here at
 * all, regardless of anything in this file.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/portal";

  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error && data.user) {
      // FIXED (real incident): this used to pass the RLS-scoped `supabase`
      // client here, relying on the session verifyOtp() just established to
      // satisfy profiles_insert's `id = auth.uid()` check. In production this
      // silently failed for at least one real signup — email_confirmed_at was
      // set, but no profiles row was ever created, leaving an account that
      // could never sign in (login()'s `.single()` on profiles threw
      // PostgREST's "cannot coerce the result to a single JSON object" error,
      // with no clear signal anywhere about why). Using the service-role
      // admin client here removes RLS/session-timing as a possible failure
      // mode entirely — this is server-only code, already gated on a
      // cryptographically verified OTP token, so bypassing RLS here is the
      // same trust boundary as e.g. createStaffOrInvestorAccount().
      const admin = createAdminClient();
      const meta = data.user.user_metadata ?? {};
      const result = await createInvestorProfileRows(admin, data.user.id, {
        ...meta,
        email: data.user.email,
      });

      if (result.error) {
        redirect(`/auth/error?reason=${encodeURIComponent(result.error)}`);
      }

      redirect(next);
    }
  }

  redirect("/auth/error?reason=invalid_or_expired_link");
}
