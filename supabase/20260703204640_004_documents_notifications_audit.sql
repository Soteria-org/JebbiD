create type public.document_type as enum
  ('selfie','national_id_front','national_id_back','deposit_proof','payout_proof','digital_signature');

create type public.notification_type as enum (
  'registration_successful','deposit_submitted','deposit_approved','deposit_rejected',
  'investment_created','investment_activated','investment_maturing','investment_matured',
  'withdrawal_submitted','withdrawal_approved','withdrawal_rejected','withdrawal_paid',
  'statement_available','new_registration','deposit_awaiting_review','withdrawal_request',
  'upcoming_maturity','large_deposit_alert'
);

-- One generic table for every uploaded file (KYC + proofs), referenced polymorphically
-- via related_table/related_id, instead of a bespoke document table per entity.
create table public.uploaded_documents (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id),
  document_type public.document_type not null,
  storage_bucket text not null,
  storage_path text not null,
  related_table text,
  related_id uuid,
  verified boolean not null default false,
  uploaded_at timestamptz not null default now()
);

create index idx_uploaded_documents_owner on public.uploaded_documents(owner_profile_id);
create index idx_uploaded_documents_related on public.uploaded_documents(related_table, related_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  type public.notification_type not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  related_table text,
  related_id uuid,
  created_at timestamptz not null default now()
);

create index idx_notifications_profile on public.notifications(profile_id, is_read);

-- Insert-only. No update/delete policy will ever be granted to this table (see migration 005).
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id),
  actor_name_snapshot text not null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_entity on public.audit_logs(entity_table, entity_id);
create index idx_audit_logs_created on public.audit_logs(created_at desc);
