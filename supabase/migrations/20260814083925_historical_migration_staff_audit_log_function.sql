-- Discovered while wiring this feature's Server Actions: log_audit() has had NO
-- grant for the `authenticated` role since security_hardening (2026-08-10) revoked
-- it (correctly -- it was directly callable by anyone before that). It's only
-- ever callable now from inside another SECURITY DEFINER function, which is by
-- design for trigger-driven audit entries (deposit approval, maturity choices,
-- etc.) but leaves no path for a Server Action to log a staff-initiated action
-- that isn't itself wrapped in a dedicated RPC (e.g. import_historical_investment
-- already handles its own logging internally -- this is for the surrounding
-- migration actions that aren't single-purpose RPCs: creating a migrated
-- investor's identity record, issuing/resending their invitation).
--
-- This is a narrow, staff-gated, generic pass-through -- NOT a re-opening of
-- log_audit() itself. It runs as the caller's own session (so auth.uid() inside
-- log_audit() correctly attributes the entry to the acting staff member, not
-- "System"), and is scoped to entity tables this migration feature actually
-- writes to, so it can't be used to plant an arbitrary audit entry against an
-- unrelated table.
create or replace function public.log_staff_action(p_action text, p_entity_table text, p_entity_id uuid, p_previous_value jsonb, p_new_value jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can log an action here';
  end if;
  if p_entity_table not in ('profiles', 'investor_details', 'import_batches', 'import_rows') then
    raise exception 'log_staff_action is not scoped to entity table %', p_entity_table;
  end if;

  perform public.log_audit(p_action, p_entity_table, p_entity_id, p_previous_value, p_new_value);
end;
$$;

revoke execute on function public.log_staff_action(text, text, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.log_staff_action(text, text, uuid, jsonb, jsonb) to authenticated;
