-- Targeted counterpart to broadcast_notification() — Risk & Compliance
-- Monitor findings are about a SPECIFIC investor (incomplete KYC, missing
-- info, dormant account), so staff need to message that one person, not
-- fan out to everyone. Gated on is_staff() (not super_admin-only) since
-- Finance Officers already handle this kind of investor follow-up
-- elsewhere in the app.
create or replace function public.send_investor_notification(
  p_investor_id uuid, p_title text, p_message text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_target_role public.user_role;
begin
  if not public.is_staff() then
    raise exception 'Only staff can send direct messages to investors';
  end if;

  select role into v_target_role from public.profiles where id = p_investor_id;
  if v_target_role is null then
    raise exception 'Investor not found';
  end if;
  if v_target_role <> 'investor' then
    raise exception 'This can only be used to message investors';
  end if;

  if length(trim(coalesce(p_title, ''))) = 0 or length(trim(coalesce(p_message, ''))) = 0 then
    raise exception 'Title and message are required';
  end if;

  perform public.notify(p_investor_id, 'admin_broadcast', p_title, p_message);

  perform public.log_audit('Direct Message Sent', 'profiles', p_investor_id,
    null, jsonb_build_object('title', p_title));
end;
$$;

grant execute on function public.send_investor_notification(uuid, text, text) to authenticated;
revoke execute on function public.send_investor_notification(uuid, text, text) from public;
