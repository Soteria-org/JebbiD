-- The actual enforcement side of the pause threat in
-- schedule_account_warning() — super_admin only (a step above the is_staff()
-- gate on warnings/messages, since this actually locks someone out).
-- Freezing sets account_status='suspended', which login() already checks
-- and blocks on. Unfreezing also clears any pending warning/deadline, since
-- restoring access without clearing the countdown would immediately show
-- the investor a stale "you may be paused" banner again.
create or replace function public.set_account_freeze(p_investor_id uuid, p_frozen boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_target_role public.user_role;
  v_current_status public.account_status;
  v_name text;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can freeze or unfreeze accounts';
  end if;

  select role, account_status, full_name into v_target_role, v_current_status, v_name
  from public.profiles where id = p_investor_id;
  if v_target_role is null then
    raise exception 'Investor not found';
  end if;
  if v_target_role <> 'investor' then
    raise exception 'Only investor accounts can be frozen/unfrozen here';
  end if;

  if p_frozen then
    update public.profiles set account_status = 'suspended' where id = p_investor_id;
    perform public.notify(p_investor_id, 'account_status_alert', 'Account Paused',
      'Your account has been paused because outstanding requirements were not completed in time. Contact support to resolve this.');
    perform public.log_audit('Account Frozen', 'profiles', p_investor_id,
      jsonb_build_object('account_status', v_current_status), jsonb_build_object('account_status', 'suspended'));
  else
    update public.profiles
    set account_status = 'active', pause_warning_at = null, pause_deadline = null
    where id = p_investor_id;
    perform public.notify(p_investor_id, 'account_status_alert', 'Account Restored',
      'Your account has been unpaused and full access has been restored.');
    perform public.log_audit('Account Unfrozen', 'profiles', p_investor_id,
      jsonb_build_object('account_status', v_current_status), jsonb_build_object('account_status', 'active'));
  end if;
end;
$$;

revoke execute on function public.set_account_freeze(uuid, boolean) from public, anon;
grant execute on function public.set_account_freeze(uuid, boolean) to authenticated;
