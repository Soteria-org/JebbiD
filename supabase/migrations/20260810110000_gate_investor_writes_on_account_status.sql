-- Freezing an account (set_account_freeze, migration 20260801145400) only ever
-- blocked NEW sign-ins: login() and the app's session-restore check both look
-- at profiles.account_status, but neither of those runs on every request — a
-- frozen investor who was already signed in (a tab left open, or simply
-- before the app happens to re-check) keeps a perfectly valid Supabase Auth
-- session, because freezing never revokes the JWT itself. deposits_insert and
-- withdrawals_insert (migration 005) only ever checked investor_id =
-- auth.uid(), not account_status, so that still-valid session could keep
-- submitting new deposits/withdrawal requests after being frozen. This closes
-- that gap at the RLS layer itself, so it holds regardless of what the app
-- layer does or forgets to re-check.
create or replace function public.is_active_investor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and account_status <> 'suspended'
  );
$$;

drop policy "deposits_insert" on public.deposit_submissions;
create policy "deposits_insert" on public.deposit_submissions
  for insert with check (investor_id = auth.uid() and public.is_active_investor());

drop policy "withdrawals_insert" on public.withdrawal_requests;
create policy "withdrawals_insert" on public.withdrawal_requests
  for insert with check (investor_id = auth.uid() and public.is_active_investor());
