-- Reconstructed from the live schema — this migration was applied directly
-- to the Supabase project on 2026-07-28 without a matching local file ever
-- being committed. Content below mirrors exactly what exists live (columns,
-- sequences, functions, triggers, constraints), verified via
-- information_schema/pg_catalog against the running database, so the repo
-- history matches production. Follows the same DEP-00001 / POS-00001 style
-- reference-number pattern withdrawal_requests already used (migration
-- 003_withdrawals_and_payouts.sql).

alter table public.deposit_submissions add column reference_number text unique;
alter table public.investment_positions add column reference_number text unique;

create sequence public.deposit_ref_seq start 1;
create sequence public.position_ref_seq start 1;

create or replace function public.generate_deposit_reference()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.reference_number is null then
    new.reference_number := 'DEP-' || lpad(nextval('public.deposit_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$function$;

create or replace function public.generate_position_reference()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.reference_number is null then
    new.reference_number := 'POS-' || lpad(nextval('public.position_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$function$;

create trigger trg_generate_deposit_reference
before insert on public.deposit_submissions
for each row execute function public.generate_deposit_reference();

create trigger trg_generate_position_reference
before insert on public.investment_positions
for each row execute function public.generate_position_reference();
