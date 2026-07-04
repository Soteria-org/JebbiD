create type public.withdrawal_status as enum ('pending','clarification_requested','approved','rejected','paid');

create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  reference_number text unique,
  investment_id uuid not null references public.investment_positions(id),
  investor_id uuid not null references public.profiles(id),
  amount_requested numeric(14,2) not null check (amount_requested > 0),
  reason text not null,
  comments text,
  payment_method public.payment_method not null,
  payout_details jsonb not null default '{}'::jsonb,
  is_early_withdrawal boolean not null default false,
  penalty_rate numeric(5,2),
  penalty_amount numeric(14,2),
  net_amount numeric(14,2) not null,
  status public.withdrawal_status not null default 'pending',
  clarification_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_withdrawal_requests_investor on public.withdrawal_requests(investor_id);
create index idx_withdrawal_requests_status on public.withdrawal_requests(status);

create sequence public.withdrawal_ref_seq start 1;

create or replace function public.generate_withdrawal_reference()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.reference_number is null then
    new.reference_number := 'WD-' || lpad(nextval('public.withdrawal_ref_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

create trigger trg_generate_withdrawal_reference
before insert on public.withdrawal_requests
for each row execute function public.generate_withdrawal_reference();

create trigger trg_withdrawal_requests_updated_at
before update on public.withdrawal_requests
for each row execute function public.set_updated_at();

-- Payout confirmation is a distinct event from approval (different actor, different
-- timestamp, its own proof) so it gets its own append-only table rather than more
-- columns bolted onto withdrawal_requests.
create table public.payout_records (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null unique references public.withdrawal_requests(id),
  paid_by uuid not null references public.profiles(id),
  payout_date date not null default current_date,
  transaction_id text,
  amount_paid numeric(14,2) not null,
  notes text,
  created_at timestamptz not null default now()
);
