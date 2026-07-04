-- Bug found while writing the actual auth Server Actions: prevent_role_escalation()
-- (migration 005) blocks ANY non-super_admin from changing must_change_password —
-- including a user clearing their OWN flag after they've just completed the forced
-- password change. As written, nobody could ever finish that flow except an admin
-- doing it for them, which defeats the point of self-service first login.
--
-- Fix: allow exactly two narrow self-service transitions, and nothing else, for
-- non-admins: must_change_password true->false, and account_status invited->active,
-- and only on the caller's own row. Role changes remain fully admin-only, always.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    if new.role <> old.role then
      raise exception 'Not authorized to change role';
    end if;

    if new.account_status <> old.account_status then
      if not (new.id = auth.uid() and old.account_status = 'invited' and new.account_status = 'active') then
        raise exception 'Not authorized to change account_status';
      end if;
    end if;

    if new.must_change_password is distinct from old.must_change_password then
      if not (new.id = auth.uid() and old.must_change_password = true and new.must_change_password = false) then
        raise exception 'Not authorized to change must_change_password';
      end if;
    end if;
  end if;
  return new;
end;
$$;
