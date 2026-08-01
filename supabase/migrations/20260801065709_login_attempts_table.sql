create table public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.login_attempts enable row level security;

-- Staff can review failed attempts (Risk & Compliance Monitor). No INSERT
-- policy exists for any client role by design — rows are written exclusively
-- from the login() Server Action using the service-role admin client, which
-- bypasses RLS. This mirrors audit_logs/notifications: writes are centralized
-- through server-side code, not opened up as a client-writable table.
create policy "login_attempts_select_staff" on public.login_attempts for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('finance_officer','super_admin')));
