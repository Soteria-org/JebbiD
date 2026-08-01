-- Perf advisor: auth.uid() inside these policies was being re-evaluated per
-- row instead of once per query. Wrapping in (select ...) lets Postgres treat
-- it as an initplan, matching the pattern the rest of this schema should use.
drop policy "login_attempts_select_staff" on public.login_attempts;
create policy "login_attempts_select_staff" on public.login_attempts for select
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('finance_officer','super_admin')));

drop policy "email_events_select_staff" on public.email_events;
create policy "email_events_select_staff" on public.email_events for select
  using (exists (select 1 from public.profiles where id = (select auth.uid()) and role in ('finance_officer','super_admin')));
