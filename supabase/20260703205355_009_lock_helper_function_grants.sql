-- Revoking from `anon` alone wasn't enough — Postgres grants EXECUTE to the PUBLIC
-- pseudo-role by default, and anon inherits through that, not through a direct grant.
-- Revoke from PUBLIC, then explicitly re-grant only to `authenticated` (RLS policies
-- still need it — see migration 008 notes).
revoke execute on function public.is_staff() from public;
revoke execute on function public.is_super_admin() from public;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
