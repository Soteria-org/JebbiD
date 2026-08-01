-- Matches the hardening already applied in migrations 017/018: PostgreSQL
-- grants EXECUTE to PUBLIC by default on function creation, so the earlier
-- `grant execute ... to authenticated` in admin_broadcast_notifications_function
-- left anon (and PUBLIC generally) still able to call it. The function's own
-- internal role check already rejects any non-super_admin caller — auth.uid()
-- is null for anon, so the check fails safely — but there's no reason to leave
-- the RPC callable at all by a role that can never legitimately use it.
revoke execute on function public.broadcast_notification(text, text, text) from public;
grant execute on function public.broadcast_notification(text, text, text) to authenticated;
