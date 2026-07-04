-- Fix 1: pin search_path on the three trigger helper functions that were missing it
-- (prevents search_path hijacking if a malicious schema is ever added ahead of public).
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_member_id()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role = 'investor' and new.member_id is null then
    new.member_id := 'JBD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.member_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create or replace function public.generate_withdrawal_reference()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.reference_number is null then
    new.reference_number := 'WD-' || lpad(nextval('public.withdrawal_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

-- Fix 2: trigger-only functions were, by default, directly callable via
-- /rest/v1/rpc/<name> by any signed-in (or even anonymous) user. They should ONLY
-- ever run as a side effect of an INSERT/UPDATE on their table — revoking direct
-- EXECUTE does not break the triggers (trigger firing is not subject to the
-- EXECUTE grant), it only blocks someone calling handle_payout_recorded() etc.
-- directly over the API to forge notifications/audit rows/investment positions.
revoke execute on function public.prevent_role_escalation() from public, anon, authenticated;
revoke execute on function public.handle_deposit_submitted() from public, anon, authenticated;
revoke execute on function public.handle_deposit_status_change() from public, anon, authenticated;
revoke execute on function public.handle_withdrawal_submitted() from public, anon, authenticated;
revoke execute on function public.handle_withdrawal_status_change() from public, anon, authenticated;
revoke execute on function public.handle_payout_recorded() from public, anon, authenticated;

-- is_staff()/is_super_admin() DO need to stay executable by `authenticated` — they're
-- called from inside RLS policies, and policy evaluation runs as the querying role,
-- which must hold EXECUTE on any function the policy calls. Only trim the unused
-- anonymous grant.
revoke execute on function public.is_staff() from anon;
revoke execute on function public.is_super_admin() from anon;

-- log_audit() and notify() are INTENTIONALLY exposed to `authenticated` (granted in
-- migration 006) — they're the sanctioned, safe way for app code to write audit/
-- notification rows without broader table-level insert access. The advisor will keep
-- flagging them; that's expected and fine.
