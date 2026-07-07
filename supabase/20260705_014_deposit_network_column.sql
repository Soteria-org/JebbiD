-- MTN and Airtel are the two mobile money networks Jebbidox actually operates with
-- (confirmed from the org's own contact numbers). payment_method stays a transport-
-- level classification (mobile_money/bank_transfer, consistent with
-- withdrawal_requests); this column captures which network when it's mobile money.
-- Nullable because it's meaningless for bank_transfer rows.
alter table public.deposit_submissions add column network text
  check (network is null or network in ('MTN', 'Airtel'));
