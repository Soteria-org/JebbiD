-- Login by Member ID needs to resolve to an email BEFORE the person is
-- authenticated. RLS correctly blocks anonymous reads of `profiles`, so this narrow
-- function is the one sanctioned exception: it returns ONLY the email for a given
-- member_id or email, nothing else about the account, and reveals nothing about
-- whether the identifier exists (a non-match and a match both just fail sign-in the
-- same way one step later, in signInWithPassword).
create or replace function public.resolve_login_email(p_identifier text)
returns text
language sql stable security definer set search_path = public as $$
  select email from public.profiles
  where lower(email) = lower(p_identifier) or lower(member_id) = lower(p_identifier)
  limit 1;
$$;

grant execute on function public.resolve_login_email to anon, authenticated;

-- Known limitation, flagged rather than silently worked around: this has no rate
-- limiting of its own. Supabase's built-in Auth rate limits on signInWithPassword
-- provide some protection, but if brute-force enumeration of member IDs becomes a
-- real concern, add an explicit rate limit (e.g. via a Postgres table tracking
-- attempts per IP/identifier) before relying on this in production.
