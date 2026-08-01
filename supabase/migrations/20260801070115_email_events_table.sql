create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text,
  event_type text not null,
  recipient text,
  subject text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index email_events_event_type_idx on public.email_events(event_type);
create index email_events_created_at_idx on public.email_events(created_at desc);

alter table public.email_events enable row level security;

-- Same pattern as login_attempts: staff can read, nobody can write via RLS.
-- The only writer is app/api/webhooks/resend/route.js, using the service-role
-- admin client after verifying the Resend/Svix webhook signature — that
-- signature check IS the authorization for this table, not an RLS policy.
create policy "email_events_select_staff" on public.email_events for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('finance_officer','super_admin')));
