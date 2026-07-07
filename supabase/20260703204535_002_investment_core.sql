create type public.package_type as enum ('standard','corporate');
create type public.payment_method as enum ('mobile_money','bank_transfer');
create type public.deposit_status as enum ('pending','clarification_requested','approved','rejected');
create type public.investment_status as enum ('active','matured','closed','reversed');

-- Rates/durations live in a real table (not hardcoded) so Settings -> Investment Settings
-- can edit them later without a schema change. New rates only apply going forward:
-- investment_positions snapshots the rate at creation time (see below).
create table public.investment_packages (
  id uuid primary key default gen_random_uuid(),
  code public.package_type not null unique,
  name text not null,
  min_amount numeric(14,2) not null,
  max_amount numeric(14,2),
  annual_return_rate numeric(5,2) not null,
  duration_months int not null default 12,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.investment_packages (code, name, min_amount, max_amount, annual_return_rate, duration_months) values
  ('standard', 'Standard Package', 100000, 999999.99, 30.00, 12),
  ('corporate', 'Corporate Package', 1000000, null, 40.00, 12);

create trigger trg_investment_packages_updated_at
before update on public.investment_packages
for each row execute function public.set_updated_at();

-- A deposit submission is "investor says they paid, here is proof" — NOT yet an investment.
create table public.deposit_submissions (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.profiles(id),
  package_id uuid not null references public.investment_packages(id),
  amount numeric(14,2) not null check (amount > 0),
  payment_method public.payment_method not null,
  depositor_name text,
  transaction_reference text,
  date_paid date not null default current_date,
  financial_goal text,
  notes text,
  status public.deposit_status not null default 'pending',
  clarification_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_deposit_submissions_investor on public.deposit_submissions(investor_id);
create index idx_deposit_submissions_status on public.deposit_submissions(status);

create trigger trg_deposit_submissions_updated_at
before update on public.deposit_submissions
for each row execute function public.set_updated_at();

-- An investment position is only ever created once a deposit_submission is approved.
-- 1:1 with the deposit that created it (additional deposits => new position, never merged).
create table public.investment_positions (
  id uuid primary key default gen_random_uuid(),
  deposit_submission_id uuid unique references public.deposit_submissions(id),
  investor_id uuid not null references public.profiles(id),
  package_id uuid not null references public.investment_packages(id),
  principal_amount numeric(14,2) not null check (principal_amount > 0),
  annual_return_rate numeric(5,2) not null,
  duration_months int not null default 12,
  start_date date not null,
  maturity_date date not null,
  expected_return numeric(14,2) not null,
  maturity_value numeric(14,2) not null,
  status public.investment_status not null default 'active',
  maturity_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_investment_positions_investor on public.investment_positions(investor_id);
create index idx_investment_positions_status on public.investment_positions(status);

create trigger trg_investment_positions_updated_at
before update on public.investment_positions
for each row execute function public.set_updated_at();
