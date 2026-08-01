-- Advisor still flagged anon as able to execute rls_auto_enable() after
-- migration 20260801100152 revoked anon's direct grant. Root cause: the
-- PUBLIC pseudo-role still held its own EXECUTE grant on this function
-- (confirmed via information_schema.routine_privileges), and PUBLIC grants
-- apply to every role including anon regardless of any anon-specific
-- revoke. Revoking from PUBLIC closes that.
revoke execute on function public.rls_auto_enable() from public;
