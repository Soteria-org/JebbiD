-- add_deposit_and_position_reference_numbers (2026-07-28) postdates the
-- anon/public grant hardening in 017/018_close_remaining_trigger_function_grants,
-- so generate_deposit_reference() and generate_position_reference() never got
-- the same treatment generate_withdrawal_reference() got — anon, authenticated,
-- and PUBLIC could all call them directly. They're trigger-only functions with
-- no legitimate direct-call use case; closing the gap to match the
-- established pattern (postgres/service_role only).
revoke execute on function public.generate_deposit_reference() from public, anon, authenticated;
revoke execute on function public.generate_position_reference() from public, anon, authenticated;
