-- Fixes a real bug that made every historical import fail at confirm time:
-- "column "status" is of type investment_status but expression is of type
-- text". The CASE expression's branches ('matured'/'active') are plain text
-- literals; Postgres only auto-coerces an "unknown"-typed literal to an enum
-- column via VALUES() context, not a text-typed CASE result -- so it needs an
-- explicit cast. Same function body as
-- 20260814082254_historical_migration_schema.sql, only the cast added.
create or replace function public.import_historical_investment(
  p_batch_id uuid,
  p_row_id uuid,
  p_investor_id uuid,
  p_package_code public.package_type,
  p_principal_amount numeric,
  p_annual_return_rate numeric,
  p_duration_months integer,
  p_start_date date,
  p_maturity_date date,
  p_expected_return numeric,
  p_maturity_value numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_package_id uuid;
  v_investor_role public.user_role;
  v_new_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can import historical investments';
  end if;

  select id into v_package_id from public.investment_packages where code = p_package_code and is_active limit 1;
  if v_package_id is null then
    raise exception 'No active investment package found for code %', p_package_code;
  end if;

  select role into v_investor_role from public.profiles where id = p_investor_id;
  if v_investor_role is null then
    raise exception 'Investor % not found', p_investor_id;
  end if;
  if v_investor_role <> 'investor' then
    raise exception 'Target of a historical investment import must be an investor';
  end if;

  if p_principal_amount is null or p_principal_amount <= 0 then
    raise exception 'principal_amount must be a positive number';
  end if;
  if p_maturity_date < p_start_date then
    raise exception 'maturity_date (%) cannot be before start_date (%)', p_maturity_date, p_start_date;
  end if;

  insert into public.investment_positions (
    deposit_submission_id, investor_id, package_id, principal_amount, annual_return_rate,
    duration_months, start_date, maturity_date, expected_return, maturity_value, status
  ) values (
    null, p_investor_id, v_package_id, p_principal_amount, p_annual_return_rate,
    p_duration_months, p_start_date, p_maturity_date, p_expected_return, p_maturity_value,
    (case when p_maturity_date <= current_date then 'matured' else 'active' end)::public.investment_status
  )
  returning id into v_new_id;

  if p_row_id is not null then
    update public.import_rows
    set resolution = 'imported', linked_investor_id = p_investor_id, linked_investment_id = v_new_id
    where id = p_row_id and batch_id = p_batch_id;
  end if;

  perform public.log_audit(
    'Historical Investment Imported', 'investment_positions', v_new_id,
    null,
    jsonb_build_object(
      'batch_id', p_batch_id, 'row_id', p_row_id, 'investor_id', p_investor_id,
      'principal_amount', p_principal_amount, 'start_date', p_start_date,
      'maturity_date', p_maturity_date, 'maturity_value', p_maturity_value
    )
  );

  return v_new_id;
end;
$$;
