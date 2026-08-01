-- Lets Super Admin send a one-off message to every Investor or every Finance
-- Officer at once (Club Intelligence Centre "Broadcast" action). Reuses the
-- existing public.notify() helper (already SECURITY DEFINER, so it can insert
-- into notifications despite that table having no direct INSERT policy) rather
-- than opening a new insert policy — keeps notifications writes centralized
-- through the same trigger/function pattern the rest of the schema already uses.
--
-- Split into two migrations (enum value, then function) because Postgres
-- won't let a new enum value be used in the same transaction that adds it.

alter type public.notification_type add value if not exists 'admin_broadcast';
