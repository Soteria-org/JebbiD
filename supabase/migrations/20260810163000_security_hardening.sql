-- Security hardening pass (see JebbiDox Engineering Log, Aug 10 2026 for
-- the full diagnostic this came out of).

-- 1. choose_maturity_action() checked position ownership but never
--    account_status, unlike deposits/withdrawals (which is_active_investor()
--    already gates via RLS). Since this function is SECURITY DEFINER and
--    inserts into investment_positions/withdrawal_requests directly, RLS
--    never runs for those writes — a suspended investor could still call
--    this RPC directly to reinvest, switch package, or withdraw at maturity.
create or replace function public.choose_maturity_action(
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
language plpgsql
security definer
set search_path = 'public'
as $function$
declare
  v_position record;
  v_current_code public.package_type;
  v_new_package_id uuid;
  v_new_id uuid;
  v_wd_id uuid;
  v_payout_details jsonb;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if not public.is_active_investor() then raise exception 'Account is currently paused'; end if;

  select * into v_position from public.investment_positions where id = p_position_id for update;
  if v_position is null then raise exception 'Investment position not found'; end if;
  if v_position.investor_id <> auth.uid() then raise exception 'Not authorized to act on this position'; end if;
  if v_position.status <> 'active' then raise exception 'This position is not eligible for a maturity decision'; end if;
  if v_position.maturity_date > current_date then raise exception 'This position has not yet matured'; end if;
  if v_position.maturity_action is not null then raise exception 'A maturity decision has already been made for this position'; end if;
  if p_choice not in ('reinvest','withdraw_profit','switch_package','withdraw_all') then
    raise exception 'Invalid maturity choice';
  end if;

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
$function$;

-- 2. notify() and log_audit() are internal helpers meant to be called from
--    other SECURITY DEFINER functions (which run as the functions' owner,
--    so they keep working with no grant needed) — not to be called directly
--    over PostgREST by any authenticated user. Without this, any signed-in
--    investor could POST /rest/v1/rpc/notify with an arbitrary profile_id to
--    send a spoofed system notification to any other user, or POST
--    /rest/v1/rpc/log_audit to plant a fabricated entry in the audit trail.
revoke execute on function public.notify(uuid, public.notification_type, text, text, text, uuid) from authenticated, anon, public;
revoke execute on function public.log_audit(text, text, uuid, jsonb, jsonb) from authenticated, anon, public;

-- 3. No size/type limits existed on any upload bucket, so nothing at the
--    storage layer stopped an authenticated user from uploading an
--    oversized or non-image/PDF file to KYC or payment-proof storage.
update storage.buckets set file_size_limit = 8388608, allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'kyc-documents';
update storage.buckets set file_size_limit = 8388608, allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
where id = 'payment-proofs';
update storage.buckets set file_size_limit = 8388608, allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
where id = 'payout-proofs';

-- 4. kyc_documents_owner_rw / payment_proofs_owner_rw used `for all`, which
--    bundled DELETE into the owner's rights — letting an investor delete
--    their own submitted KYC photos or payment proof after the fact, which
--    has no legitimate product use and is an evidence-destruction risk for
--    records staff rely on. Re-upload (insert/update via `upsert: true`)
--    still works the same; only DELETE moves to staff-only.
drop policy if exists "kyc_documents_owner_rw" on storage.objects;
create policy "kyc_documents_owner_rw" on storage.objects for select
using (bucket_id = 'kyc-documents' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
create policy "kyc_documents_owner_write" on storage.objects for insert
with check (bucket_id = 'kyc-documents' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
create policy "kyc_documents_owner_update" on storage.objects for update
using (bucket_id = 'kyc-documents' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()))
with check (bucket_id = 'kyc-documents' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
create policy "kyc_documents_staff_delete" on storage.objects for delete
using (bucket_id = 'kyc-documents' and public.is_staff());

drop policy if exists "payment_proofs_owner_rw" on storage.objects;
create policy "payment_proofs_owner_rw" on storage.objects for select
using (bucket_id = 'payment-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
create policy "payment_proofs_owner_write" on storage.objects for insert
with check (bucket_id = 'payment-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
create policy "payment_proofs_owner_update" on storage.objects for update
using (bucket_id = 'payment-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()))
with check (bucket_id = 'payment-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
create policy "payment_proofs_staff_delete" on storage.objects for delete
using (bucket_id = 'payment-proofs' and public.is_staff());
