-- Decision 3: username is easier to remember than a Member ID. Unique, optional at
-- the DB level (nullable) because admin-created accounts can backfill it, but the
-- app will always collect it going forward.
alter table public.profiles add column username text unique;

-- resolve_login_email now also matches on username, so login accepts
-- Member ID, username, or email interchangeably.
create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql stable security definer set search_path = public as $$
  select email from public.profiles
  where lower(email) = lower(p_identifier)
     or lower(member_id) = lower(p_identifier)
     or lower(username) = lower(p_identifier)
  limit 1;
$$;

-- Decision 1: Finance Officers can create investor accounts (normal front-desk/
-- walk-in registration work) but NOT other Finance Officers or Super Admins — that
-- distinction is enforced here at the database level, not just in application code,
-- so a bug in the Server Action can't accidentally let a Finance Officer create
-- another staff account.
drop policy "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert with check (
  id = (select auth.uid())
  or (select public.is_super_admin())
  or ((select public.is_staff()) and role = 'investor')
);
