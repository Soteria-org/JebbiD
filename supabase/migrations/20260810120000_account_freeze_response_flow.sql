-- Closes the loop on account freezing: previously a frozen investor was
-- signed all the way out with no way back in except contacting support
-- directly. Now they can still sign in to a restricted screen (app layer —
-- see FrozenAccountScreen.jsx and the login()/getCurrentSession() change in
-- this same batch), upload whatever resolves the freeze, and that upload
-- notifies every super_admin so someone actually sees it and can unfreeze.
-- set_account_freeze() already notifies the investor on unfreeze — this
-- migration only adds the missing "investor -> admin" direction.
alter type public.document_type add value if not exists 'account_freeze_response';

create or replace function public.notify_admins_freeze_response(p_investor_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  admin record;
  v_status public.account_status;
begin
  if auth.uid() <> p_investor_id then
    raise exception 'Not authorized';
  end if;

  select account_status into v_status from public.profiles where id = p_investor_id;
  if v_status is distinct from 'suspended' then
    raise exception 'Account is not currently paused';
  end if;

  for admin in select id from public.profiles where role = 'super_admin' loop
    perform public.notify(admin.id, 'account_status_alert', 'Member Responded to Pause',
      'A paused member has uploaded a response and is waiting for review.', 'profiles', p_investor_id);
  end loop;

  perform public.log_audit('Freeze Response Submitted', 'profiles', p_investor_id, null,
    jsonb_build_object('responded', true));
end;
$$;

revoke execute on function public.notify_admins_freeze_response(uuid) from public, anon;
grant execute on function public.notify_admins_freeze_response(uuid) to authenticated;
