import { createClient } from "@/lib/supabase/server";
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
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error && data.user) {
      // Now that a real session exists, create the profile rows using the metadata
      // that rode along on signUp() — this is the deferred half of registerInvestor().
      const meta = data.user.user_metadata ?? {};
      const result = await createInvestorProfileRows(supabase, data.user.id, {
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
