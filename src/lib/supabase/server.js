import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * THIS IS THE FIX FOR "refresh works but the data never changes":
 *
 * Next.js's App Router patches the global fetch() so that, by default, GET
 * requests made anywhere in server-side code (Server Components, Server
 * Actions, Route Handlers) go through its own Data Cache — cached
 * indefinitely unless told otherwise. Supabase's JS client makes its REST
 * calls via fetch(), so every .select() a Server Action ran was silently
 * being intercepted: the FIRST call for a given query got cached, and every
 * later call for that same query — including every "Refresh" click and every
 * poll tick — was served that same frozen response straight from Next's
 * cache, never actually reaching Supabase again. The refresh button and the
 * poll were both working exactly as written; the data underneath them was
 * just never allowed to change.
 *
 * noStoreFetch forces cache: "no-store" on every request this client makes,
 * opting every Supabase call out of Next's Data Cache.
 */
function noStoreFetch(url, options = {}) {
  return fetch(url, { ...options, cache: "no-store" });
}

/**
 * Use inside Server Components, Server Actions, and Route Handlers. Reads/writes the
 * session via cookies so the user stays logged in across requests.
 *
 * NEVER import this into a "use client" file.
 *
 * This still uses the publishable key (RLS-scoped). For admin-only operations that
 * must bypass RLS entirely (e.g. creating a Finance Officer's auth user), use
 * `createAdminClient()` below instead — and only ever from server-only code
 * (Server Actions / Route Handlers), never sent to the browser.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { fetch: noStoreFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component (no response to attach to).
            // Safe to ignore as long as middleware.js is refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Admin client using the SERVICE ROLE key — bypasses RLS entirely.
 *
 * SUPABASE_SERVICE_ROLE_KEY must NOT be prefixed with NEXT_PUBLIC_, must never be
 * committed, and this function must never be imported by anything that ships to the
 * browser. Use only for actions a normal user's RLS-scoped session cannot do, e.g.:
 *   - Super Admin creating a Finance Officer's auth.users row + temp password
 *   - Any operation that must run as "the system", not as a specific user
 */
export function createAdminClient() {
  const { createClient: createSupabaseClient } = require("@supabase/supabase-js");
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: noStoreFetch } }
  );
}
