-- Root cause found via direct pg_proc.proacl inspection (the advisor tool was
-- reporting correctly — migration 016's fix was just incomplete). `anon` had its own
-- DIRECT grant on these functions, not an inherited one via the PUBLIC pseudo-role —
-- Supabase's platform applies default privileges that grant anon/authenticated/
-- service_role EXECUTE directly on every new function created in the public schema.
-- `revoke ... from public` (migration 016) correctly removed the (separate, mostly
-- redundant) PUBLIC entry, but never touched anon's own direct grant. This is the
-- same root cause as migration 009, just an extra layer deeper than I accounted for
-- there — migration 008 happened to also revoke `from anon` explicitly, which is
-- what actually fixed is_staff/is_super_admin, not the `from public` revoke in 009.
revoke execute on function public.choose_maturity_action(uuid, text) from anon;
revoke execute on function public.log_audit(text, text, uuid, jsonb, jsonb) from anon;
revoke execute on function public.notify(uuid, public.notification_type, text, text, text, uuid) from anon;
