-- Safe, server-side-only way to write an audit row (no direct insert policy exists for
-- audit_logs, so this function — and triggers below — are the only path in).
create or replace function public.log_audit(
  p_action text, p_entity_table text, p_entity_id uuid,
  p_previous_value jsonb, p_new_value jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  select full_name into v_name from public.profiles where id = auth.uid();
  insert into public.audit_logs (actor_profile_id, actor_name_snapshot, action, entity_table, entity_id, previous_value, new_value)
  values (auth.uid(), coalesce(v_name, 'System'), p_action, p_entity_table, p_entity_id, p_previous_value, p_new_value);
end;
$$;

grant execute on function public.log_audit to authenticated;

create or replace function public.notify(
  p_profile_id uuid, p_type public.notification_type, p_title text, p_message text,
  p_related_table text default null, p_related_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (profile_id, type, title, message, related_table, related_id)
  values (p_profile_id, p_type, p_title, p_message, p_related_table, p_related_id);
end;
$$;

grant execute on function public.notify to authenticated;

-- 1) New deposit submitted -> notify investor, notify every staff member, audit it.
create or replace function public.handle_deposit_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  staff record;
begin
  perform public.notify(new.investor_id, 'deposit_submitted', 'Deposit Submitted',
    'Your deposit is pending verification.', 'deposit_submissions', new.id);

  for staff in select id from public.profiles where role in ('finance_officer','super_admin') loop
    perform public.notify(staff.id, 'deposit_awaiting_review', 'Deposit Awaiting Review',
      'A new deposit submission needs review.', 'deposit_submissions', new.id);
  end loop;

  perform public.log_audit('Deposit Submitted', 'deposit_submissions', new.id, null, to_jsonb(new));
  return new;
end;
$$;

create trigger trg_deposit_submitted
after insert on public.deposit_submissions
for each row execute function public.handle_deposit_submitted();

-- 2) Deposit status changes -> notify investor, audit it, and if approved,
--    CREATE THE INVESTMENT POSITION. This is the locked-in rule: a deposit and an
--    investment are never the same record; approval is what creates the second one.
create or replace function public.handle_deposit_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_expected_return numeric(14,2);
  v_maturity_value numeric(14,2);
  v_maturity_date date;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'approved' then
    v_expected_return := round(new.amount * (
      select annual_return_rate from public.investment_packages where id = new.package_id
    ) / 100.0, 2);
    v_maturity_value := new.amount + v_expected_return;
    v_maturity_date := new.date_paid + (
      (select duration_months from public.investment_packages where id = new.package_id) || ' months'
    )::interval;

    insert into public.investment_positions (
      deposit_submission_id, investor_id, package_id, principal_amount, annual_return_rate,
      duration_months, start_date, maturity_date, expected_return, maturity_value, status
    )
    select new.id, new.investor_id, new.package_id, new.amount, p.annual_return_rate,
           p.duration_months, new.date_paid, v_maturity_date, v_expected_return, v_maturity_value, 'active'
    from public.investment_packages p where p.id = new.package_id;

    perform public.notify(new.investor_id, 'investment_activated', 'Investment Activated',
      'Your investment of ' || new.amount || ' has been approved and activated.', 'deposit_submissions', new.id);

  elsif new.status = 'rejected' then
    perform public.notify(new.investor_id, 'deposit_rejected', 'Deposit Rejected',
      coalesce(new.clarification_note, 'Your deposit submission was rejected.'), 'deposit_submissions', new.id);

  elsif new.status = 'clarification_requested' then
    perform public.notify(new.investor_id, 'deposit_submitted', 'Clarification Requested',
      coalesce(new.clarification_note, 'Please provide more information about your deposit.'), 'deposit_submissions', new.id);
  end if;

  perform public.log_audit('Deposit ' || new.status, 'deposit_submissions', new.id, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

create trigger trg_deposit_status_change
after update on public.deposit_submissions
for each row execute function public.handle_deposit_status_change();

-- 3) Withdrawal submitted -> notify investor + staff, audit it.
create or replace function public.handle_withdrawal_submitted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  staff record;
begin
  perform public.notify(new.investor_id, 'withdrawal_submitted', 'Withdrawal Requested',
    'Your withdrawal request ' || new.reference_number || ' has been submitted and is pending review.',
    'withdrawal_requests', new.id);

  for staff in select id from public.profiles where role in ('finance_officer','super_admin') loop
    perform public.notify(staff.id, 'withdrawal_request', 'Withdrawal Request',
      'A new withdrawal request needs review.', 'withdrawal_requests', new.id);
  end loop;

  perform public.log_audit('Withdrawal Requested', 'withdrawal_requests', new.id, null, to_jsonb(new));
  return new;
end;
$$;

create trigger trg_withdrawal_submitted
after insert on public.withdrawal_requests
for each row execute function public.handle_withdrawal_submitted();

-- 4) Withdrawal status changes -> notify + audit (approve/reject/clarify only;
--    "paid" is set automatically by the payout trigger below, not chosen directly).
create or replace function public.handle_withdrawal_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'approved' then
    perform public.notify(new.investor_id, 'withdrawal_approved', 'Withdrawal Approved',
      'Your withdrawal request ' || new.reference_number || ' has been approved.', 'withdrawal_requests', new.id);
  elsif new.status = 'rejected' then
    perform public.notify(new.investor_id, 'withdrawal_rejected', 'Withdrawal Rejected',
      coalesce(new.clarification_note, 'Your withdrawal request was rejected.'), 'withdrawal_requests', new.id);
  end if;

  perform public.log_audit('Withdrawal ' || new.status, 'withdrawal_requests', new.id, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

create trigger trg_withdrawal_status_change
after update on public.withdrawal_requests
for each row execute function public.handle_withdrawal_status_change();

-- 5) Payout recorded -> mark withdrawal as paid, close the investment position
--    (V1 assumption: one withdrawal = full closure of that position; partial
--    withdrawals against a single position are a V2 decision), notify + audit.
create or replace function public.handle_payout_recorded()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_investment_id uuid;
  v_investor_id uuid;
  v_reference text;
begin
  update public.withdrawal_requests
    set status = 'paid'
    where id = new.withdrawal_id
    returning investment_id, investor_id, reference_number into v_investment_id, v_investor_id, v_reference;

  update public.investment_positions set status = 'closed' where id = v_investment_id;

  perform public.notify(v_investor_id, 'withdrawal_paid', 'Withdrawal Paid',
    'Your withdrawal ' || v_reference || ' of ' || new.amount_paid || ' has been paid.',
    'payout_records', new.id);

  perform public.log_audit('Withdrawal Paid', 'payout_records', new.id, null, to_jsonb(new));
  return new;
end;
$$;

create trigger trg_payout_recorded
after insert on public.payout_records
for each row execute function public.handle_payout_recorded();
