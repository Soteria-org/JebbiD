-- rls_auto_enable() is a DDL event-trigger safety net (auto-enables RLS on
-- newly created public-schema tables) — harmless to call manually (it's a
-- no-op outside an actual event-trigger context, since
-- pg_event_trigger_ddl_commands() only returns rows there), but there's no
-- reason to leave it anon-callable. Matches the project's existing pattern.
revoke execute on function public.rls_auto_enable() from anon;
