import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * Called from the root middleware.js on every request. Refreshes the Supabase auth
 * session (rotates the access token via the refresh token in cookies) so Server
 * Components always see a valid session. This does NOT do route protection/redirects
 * by itself — see the note at the bottom for where that gets added once auth screens
 * are wired up.
 */
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Required: this actually triggers the token refresh. Do not remove even though
  // the return value isn't used directly here.
  await supabase.auth.getUser();

  // NOTE: route protection (e.g. redirect to /login if no session and path is
  // /dashboard) intentionally is NOT implemented yet — that depends on the
  // auth-wiring decisions in Phase 2C (useJBDocsStore rewiring). Adding it now would
  // just be guessing at route names that don't exist yet in the App Router structure.

  return supabaseResponse;
}
