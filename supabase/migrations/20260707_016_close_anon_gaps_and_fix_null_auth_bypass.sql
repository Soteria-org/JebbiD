-- REAL BUG, not just hygiene: the ownership check used `<>` against auth.uid().
-- When called with no session, auth.uid() is NULL, and `x <> NULL` evaluates to
-- NULL — which PL/pgSQL's IF treats as false, so the exception never fired. Combined
-- with the anon-callable gap below, an unauthenticated caller could have bypassed
-- the ownership check entirely. Explicit NULL guard added; this is the important
-- fix, the grant revocation below is defense-in-depth on top of it, not instead of it.
create or replace function public.choose_maturity_action(p_position_id uuid, p_choice text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_position record;
  v_current_code public.package_type;
  v_new_package_id uuid;
  v_new_id uuid;
  v_wd_id uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;

  select * into v_position from public.investment_positions where id = p_position_id for update;
  if v_position is null then raise exception 'Investment position not found'; end if;
  if v_position.investor_id <> auth.uid() then raise exception 'Not authorized to act on this position'; end if;
  if v_position.status <> 'active' then raise exception 'This position is not eligible for a maturity decision'; end if;
  if v_position.maturity_date > current_date then raise exception 'This position has not yet matured'; end if;
  if v_position.maturity_action is not null then raise exception 'A maturity decision has already been made for this position'; end if;
  if p_choice not in ('reinvest','withdraw_profit','switch_package','withdraw_all') then
    raise exception 'Invalid maturity choice';
  end if;

  update public.investment_positions set status = 'matured', maturity_action = p_choice where id = p_position_id;

  if p_choice in ('reinvest','switch_package') then
    select code into v_current_code from public.investment_packages where id = v_position.package_id;
    if p_choice = 'switch_package' then
      select id into v_new_package_id from public.investment_packages
        where code = (case when v_current_code = 'standard' then 'corporate' else 'standard' end)::public.package_type
        limit 1;
    else
      v_new_package_id := v_position.package_id;
    end if;

    insert into public.investment_positions (
      investor_id, package_id, principal_amount, annual_return_rate, duration_months,
      start_date, maturity_date, expected_return, maturity_value, status
    )
    select v_position.investor_id, v_new_package_id, v_position.maturity_value, p.annual_return_rate,
           p.duration_months, current_date, current_date + (p.duration_months || ' months')::interval,
           round(v_position.maturity_value * p.annual_return_rate / 100.0, 2),
           v_position.maturity_value + round(v_position.maturity_value * p.annual_return_rate / 100.0, 2),
           'active'
    from public.investment_packages p where p.id = v_new_package_id
    returning id into v_new_id;

    perform public.notify(v_position.investor_id, 'investment_matured', 'Investment Matured',
      'Your investment matured and was rolled into a new position.', 'investment_positions', v_new_id);
    perform public.log_audit(
      case p_choice when 'switch_package' then 'Package Switched' else 'Investment Reinvested' end,
      'investment_positions', v_new_id, to_jsonb(v_position), jsonb_build_object('new_position_id', v_new_id));

  elsif p_choice = 'withdraw_profit' then
    insert into public.investment_positions (
      investor_id, package_id, principal_amount, annual_return_rate, duration_months,
      start_date, maturity_date, expected_return, maturity_value, status
    )
    select v_position.investor_id, v_position.package_id, v_position.principal_amount, p.annual_return_rate,
           p.duration_months, current_date, current_date + (p.duration_months || ' months')::interval,
           round(v_position.principal_amount * p.annual_return_rate / 100.0, 2),
           v_position.principal_amount + round(v_position.principal_amount * p.annual_return_rate / 100.0, 2),
           'active'
    from public.investment_packages p where p.id = v_position.package_id
    returning id into v_new_id;

    insert into public.withdrawal_requests (
      investment_id, investor_id, amount_requested, reason, payment_method, payout_details,
      is_early_withdrawal, penalty_rate, penalty_amount, net_amount
    ) values (
      p_position_id, v_position.investor_id, v_position.expected_return, 'Maturity profit withdrawal',
      'mobile_money', '{}'::jsonb, false, null, 0, v_position.expected_return
    ) returning id into v_wd_id;

  elsif p_choice = 'withdraw_all' then
    insert into public.withdrawal_requests (
      investment_id, investor_id, amount_requested, reason, payment_method, payout_details,
      is_early_withdrawal, penalty_rate, penalty_amount, net_amount
    ) values (
      p_position_id, v_position.investor_id, v_position.maturity_value, 'Full maturity withdrawal',
      'mobile_money', '{}'::jsonb, false, null, 0, v_position.maturity_value
    ) returning id into v_wd_id;
  end if;

  return jsonb_build_object('new_position_id', v_new_id, 'withdrawal_id', v_wd_id);
end;
$$;

-- Same PUBLIC-inheritance gap as migration 009: revoking from `anon` alone doesn't
-- work because anon inherits EXECUTE through the implicit PUBLIC grant. This time it
-- also caught log_audit() and notify() — which I explicitly granted to `authenticated`
-- back in migration 006, but never revoked from PUBLIC, meaning anon could ALSO call
-- them this whole time: an anonymous caller could have inserted fake audit_logs rows
-- (actor_profile_id null, "System" as the actor name) or spammed arbitrary
-- notifications to any investor. Revoking PUBLIC, keeping the explicit authenticated grant.
--
-- NOTE: this migration's revoke turned out to be INCOMPLETE — see migration 017.
revoke execute on function public.choose_maturity_action(uuid, text) from public;
revoke execute on function public.log_audit(text, text, uuid, jsonb, jsonb) from public;
revoke execute on function public.notify(uuid, public.notification_type, text, text, text, uuid) from public;

grant execute on function public.choose_maturity_action(uuid, text) to authenticated;
grant execute on function public.log_audit(text, text, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.notify(uuid, public.notification_type, text, text, text, uuid) to authenticated;
