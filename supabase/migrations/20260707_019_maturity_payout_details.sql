-- Must explicitly drop the old 2-arg signature first. `create or replace` only
-- replaces a function with the IDENTICAL parameter list — adding parameters
-- creates a second, overloaded function alongside the old one. If left in place,
-- the old 2-arg version would still be callable and would completely bypass the
-- payout-detail validation being added here, since it doesn't know these params exist.
drop function if exists public.choose_maturity_action(uuid, text);

create function public.choose_maturity_action(
  p_position_id uuid,
  p_choice text,
  p_payment_method text default null,
  p_network text default null,
  p_phone text default null,
  p_bank_name text default null,
  p_account_name text default null,
  p_account_number text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_position record;
  v_current_code public.package_type;
  v_new_package_id uuid;
  v_new_id uuid;
  v_wd_id uuid;
  v_payout_details jsonb;
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

  -- Real payout details required for any choice that actually creates a withdrawal.
  -- Reinvest/switch_package never reach this branch — no money leaves the system.
  if p_choice in ('withdraw_profit','withdraw_all') then
    if p_payment_method is null or p_payment_method not in ('mobile_money','bank_transfer') then
      raise exception 'A valid payment method (mobile_money or bank_transfer) is required for this choice';
    end if;
    if p_payment_method = 'mobile_money' and (p_network is null or p_network not in ('MTN','Airtel') or p_phone is null) then
      raise exception 'Mobile money network (MTN or Airtel) and phone number are required';
    end if;
    if p_payment_method = 'bank_transfer' and (p_bank_name is null or p_account_name is null or p_account_number is null) then
      raise exception 'Bank name, account name, and account number are required';
    end if;

    v_payout_details := case when p_payment_method = 'mobile_money'
      then jsonb_build_object('network', p_network, 'phone', p_phone)
      else jsonb_build_object('bankName', p_bank_name, 'accountName', p_account_name, 'accountNumber', p_account_number)
    end;
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
      p_payment_method, v_payout_details, false, null, 0, v_position.expected_return
    ) returning id into v_wd_id;

  elsif p_choice = 'withdraw_all' then
    insert into public.withdrawal_requests (
      investment_id, investor_id, amount_requested, reason, payment_method, payout_details,
      is_early_withdrawal, penalty_rate, penalty_amount, net_amount
    ) values (
      p_position_id, v_position.investor_id, v_position.maturity_value, 'Full maturity withdrawal',
      p_payment_method, v_payout_details, false, null, 0, v_position.maturity_value
    ) returning id into v_wd_id;
  end if;

  return jsonb_build_object('new_position_id', v_new_id, 'withdrawal_id', v_wd_id);
end;
$$;

-- Same platform default-privilege behavior discovered in migrations 016-017: a
-- FRESH create grants anon/authenticated/service_role directly again, regardless of
-- what the previous (now-dropped) function had. Must revoke from anon again here,
-- explicitly, not assume it carries over.
revoke execute on function public.choose_maturity_action(uuid, text, text, text, text, text, text, text) from anon, public;
grant execute on function public.choose_maturity_action(uuid, text, text, text, text, text, text, text) to authenticated;
