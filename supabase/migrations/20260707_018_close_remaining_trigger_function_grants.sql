-- Full-project audit of every function's proacl (prompted by the anon-grant bug just
-- found and fixed in migration 017) turned up three more trigger-only functions that
-- migration 008's lockdown pass simply missed — not security definer, so the real
-- exploitability is low (calling them directly via RPC fails immediately: NEW/OLD
-- only bind inside actual trigger execution), but leaving them inconsistent with
-- every other trigger function in this codebase is sloppy, not defensible. Closing
-- for consistency with the standard applied everywhere else.
revoke execute on function public.generate_member_id() from public, anon, authenticated;
revoke execute on function public.generate_withdrawal_reference() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
