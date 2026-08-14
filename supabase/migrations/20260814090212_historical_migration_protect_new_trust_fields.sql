-- SECURITY FIX, same review pass. profiles_update allows any investor to
-- update their OWN profiles row (`id = auth.uid()`), and prevent_role_escalation
-- only guards role/account_status/must_change_password on UPDATE -- it never
-- covered the new migration_status column, meaning an investor could PATCH
-- their own profiles.migration_status directly over PostgREST. Same shape of
-- gap for investor_details_update (`profile_id = auth.uid()`), which has NO
-- column-guard trigger at all -- so financial_history_status (also new) was
-- self-writable by the investor it belongs to. (investor_details.kyc_status
-- has this same pre-existing gap and is NOT touched here -- it predates this
-- feature, has a materially different blast radius (self-approving KYC vs.
-- relabeling an already-migrated financial history), and deserves its own
-- dedicated review rather than a drive-by fix bundled into this migration.)
--
-- Both fixes are UPDATE-only (matching prevent_role_escalation's own scope),
-- so migration-actions.js's admin-client INSERT of investor_details during
-- migrated-identity creation is unaffected -- these only fire on UPDATE, and
-- nothing in this feature ever updates financial_history_status after
-- creation.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    if new.role <> old.role then
      raise exception 'Not authorized to change role';
    end if;

    if new.account_status <> old.account_status then
      if not (new.id = auth.uid() and old.account_status = 'invited' and new.account_status = 'active') then
        raise exception 'Not authorized to change account_status';
      end if;
    end if;

    if new.must_change_password is distinct from old.must_change_password then
      if not (new.id = auth.uid() and old.must_change_password = true and new.must_change_password = false) then
        raise exception 'Not authorized to change must_change_password';
      end if;
    end if;

    if new.migration_status is distinct from old.migration_status then
      raise exception 'Not authorized to change migration_status';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.prevent_financial_history_status_self_edit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.financial_history_status is distinct from old.financial_history_status then
    if not public.is_staff() then
      raise exception 'Not authorized to change financial_history_status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_financial_history_status_self_edit on public.investor_details;
create trigger trg_prevent_financial_history_status_self_edit
  before update on public.investor_details
  for each row execute function public.prevent_financial_history_status_self_edit();
