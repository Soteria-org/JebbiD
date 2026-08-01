-- Bug: profiles.role is the enum public.user_role, but p_target_role is text —
-- `role = p_target_role` has no matching operator, so this failed on every
-- single call with "operator does not exist: user_role = text". This is why
-- the broadcast feature never sent anything. Fixed by casting.
create or replace function public.broadcast_notification(
  p_target_role text, p_title text, p_message text
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_caller_role text;
  v_count integer := 0;
  r record;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role is distinct from 'super_admin' then
    raise exception 'Only Super Admin can send broadcast messages';
  end if;

  if p_target_role not in ('investor', 'finance_officer') then
    raise exception 'Invalid target role: must be investor or finance_officer';
  end if;

  if length(trim(coalesce(p_title, ''))) = 0 or length(trim(coalesce(p_message, ''))) = 0 then
    raise exception 'Title and message are required';
  end if;

  for r in select id from public.profiles where role = p_target_role::public.user_role loop
    perform public.notify(r.id, 'admin_broadcast', p_title, p_message);
    v_count := v_count + 1;
  end loop;

  perform public.log_audit('Broadcast Sent', 'profiles', auth.uid(),
    null, jsonb_build_object('target_role', p_target_role, 'title', p_title, 'recipient_count', v_count));

  return v_count;
end;
$$;

grant execute on function public.broadcast_notification(text, text, text) to authenticated;
revoke execute on function public.broadcast_notification(text, text, text) from public;
