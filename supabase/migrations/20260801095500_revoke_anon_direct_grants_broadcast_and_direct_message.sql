-- Same root cause documented in migration 017_revoke_anon_direct_grants.sql:
-- `revoke ... from public` only removes the PUBLIC pseudo-role's blanket grant.
-- Supabase's platform separately applies ALTER DEFAULT PRIVILEGES that grant
-- `anon` its own DIRECT execute privilege on every new function in the public
-- schema — that direct grant is untouched by revoking from PUBLIC and has to
-- be revoked from anon explicitly. Confirmed via pg_proc / has_function_privilege
-- that anon could still execute both of these despite the earlier "from public"
-- revokes in their own migrations.
revoke execute on function public.broadcast_notification(text, text, text) from anon;
revoke execute on function public.send_investor_notification(uuid, text, text) from anon;
