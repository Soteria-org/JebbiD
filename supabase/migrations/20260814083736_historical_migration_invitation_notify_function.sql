-- notify() itself was locked down to internal-callers-only in security_hardening
-- (2026-08-10) -- correctly, since it let any signed-in user spoof a notification
-- to any other profile_id. This is the staff-gated wrapper for the one new
-- notification this migration feature needs (the 'migration_invitation_sent'
-- enum value added in historical_migration_notification_type), matching the
-- existing send_investor_notification()/broadcast_notification() pattern rather
-- than re-opening notify() itself.
create or replace function public.notify_migration_invitation_sent(p_investor_id uuid, p_title text, p_message text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_target_role public.user_role;
begin
  if not public.is_staff() then
    raise exception 'Only staff can send migration invitations';
  end if;

  select role into v_target_role from public.profiles where id = p_investor_id;
  if v_target_role is null then
    raise exception 'Investor not found';
  end if;
  if v_target_role <> 'investor' then
    raise exception 'Migration invitations can only be sent to investors';
  end if;

  perform public.notify(p_investor_id, 'migration_invitation_sent', p_title, p_message, 'profiles', p_investor_id);
  perform public.log_audit('Migration Invitation Sent', 'profiles', p_investor_id, null, jsonb_build_object('title', p_title));
end;
$$;

revoke execute on function public.notify_migration_invitation_sent(uuid, text, text) from public, anon;
grant execute on function public.notify_migration_invitation_sent(uuid, text, text) to authenticated;
