-- Backs the "warn, then actually enforce it" flow: when staff warn an investor
-- that their account may be paused, these two columns record exactly when and
-- by when — so the threat in the message is a real, checkable deadline the
-- investor can see counting down, not just words. Cleared whenever the
-- warning is resolved (account unfrozen, or explicitly cleared).
alter table public.profiles add column pause_warning_at timestamptz;
alter table public.profiles add column pause_deadline timestamptz;

-- Distinct from 'admin_broadcast' so the client can reliably detect these
-- (rather than pattern-matching message text) and render a countdown/frozen
-- banner from profiles.pause_deadline / account_status instead.
alter type public.notification_type add value if not exists 'account_status_alert';
