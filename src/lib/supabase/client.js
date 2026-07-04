import { createBrowserClient } from "@supabase/ssr";

/**
 * Use inside Client Components ("use client" files). Safe to call multiple times —
 * @supabase/ssr caches the underlying client. Only ever uses the publishable
 * (anon-equivalent) key — RLS is what protects data, not this key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
