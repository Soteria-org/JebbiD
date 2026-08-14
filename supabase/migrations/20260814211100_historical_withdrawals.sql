-- Historical withdrawals: club records of withdrawals paid out before this
-- investor's account existed on the platform. Deliberately NOT modeled as
-- withdrawal_requests rows -- that table's investment_id is a hard NOT NULL
-- FK to a specific investment_positions row, and the request/review workflow
-- (status, reviewed_by/reviewed_at, penalty fields) models an in-app request
-- that never happened for these. This is a much simpler "here is a fact from
-- the club's own records" table, read-only once written, same spirit as
-- import_rows.source_data: kept forever, never guessed at.
create table public.historical_withdrawals (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.profiles(id),
  amount numeric not null check (amount > 0),
  withdrawal_date date not null,
  month_covered text,
  payment_method payment_method not null,
  source_note text not null default 'Imported from the club''s own records (historical migration) -- not a request made through this platform.',
  batch_id uuid references public.import_batches(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

comment on table public.historical_withdrawals is 'Withdrawals the club recorded before this investor existed on the platform. Read-only historical fact, not a live withdrawal_requests row -- no investment_id link, no review workflow.';

alter table public.historical_withdrawals enable row level security;

-- Investor can see their own; finance officers and super admins can see everyone's.
create policy "historical_withdrawals_investor_select" on public.historical_withdrawals
  for select using (investor_id = auth.uid());

create policy "historical_withdrawals_staff_select" on public.historical_withdrawals
  for select using (public.is_staff());

-- Only super admins can add historical records; no update/update policy and no
-- delete policy at all -- matches this schema's standing rule that financial
-- records are never casually edited or deleted once written.
create policy "historical_withdrawals_super_admin_insert" on public.historical_withdrawals
  for insert with check (public.is_super_admin());

create index historical_withdrawals_investor_id_idx on public.historical_withdrawals(investor_id);
create index historical_withdrawals_batch_id_idx on public.historical_withdrawals(batch_id);
