-- Pairs with send_investor_notification() but is specifically for findings in
-- Risk & Compliance Monitor that threaten a pause (incomplete KYC, missing
-- info, dormant account) — sets a real, visible deadline instead of just
-- sending words. is_staff() gated, same as send_investor_notification(),
-- since Finance Officers already handle this kind of follow-up.
create or replace function public.schedule_account_warning(
  p_investor_id uuid, p_title text, p_message text, p_deadline_days int default 7
) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_target_role public.user_role;
  v_deadline timestamptz;
begin
  if not public.is_staff() then
    raise exception 'Only staff can issue account warnings';
  end if;

  select role into v_target_role from public.profiles where id = p_investor_id;
  if v_target_role is null then
    raise exception 'Investor not found';
  end if;
  if v_target_role <> 'investor' then
    raise exception 'This can only be used to warn investors';
  end if;

  if length(trim(coalesce(p_title, ''))) = 0 or length(trim(coalesce(p_message, ''))) = 0 then
    raise exception 'Title and message are required';
  end if;
  if p_deadline_days is null or p_deadline_days < 1 or p_deadline_days > 90 then
    raise exception 'Deadline must be between 1 and 90 days';
  end if;

  v_deadline := now() + (p_deadline_days || ' days')::interval;

  update public.profiles
  set pause_warning_at = now(), pause_deadline = v_deadline
  where id = p_investor_id;

  perform public.notify(p_investor_id, 'account_status_alert', p_title, p_message);

  perform public.log_audit('Account Warning Issued', 'profiles', p_investor_id,
    null, jsonb_build_object('title', p_title, 'deadline', v_deadline));

  return v_deadline;
end;
$$;

revoke execute on function public.schedule_account_warning(uuid, text, text, int) from public, anon;
grant execute on function public.schedule_account_warning(uuid, text, text, int) to authenticated;

-- Lets staff cancel a pending warning without freezing (e.g. the investor
-- fixed the issue before the deadline) — clears the countdown the investor
-- sees, and tells them so.
create or replace function public.clear_account_warning(p_investor_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can clear account warnings';
  end if;

  update public.profiles
  set pause_warning_at = null, pause_deadline = null
  where id = p_investor_id and role = 'investor';

  perform public.notify(p_investor_id, 'account_status_alert', 'Warning Resolved',
    'Thanks — the issue on your account has been resolved and the pending pause has been cancelled.');

  perform public.log_audit('Account Warning Cleared', 'profiles', p_investor_id, null, null);
end;
$$;

revoke execute on function public.clear_account_warning(uuid) from public, anon;
grant execute on function public.clear_account_warning(uuid) to authenticated;
