-- Historical investment data migration (docs/migration/HISTORICAL_DATA_MIGRATION_SPEC.md).
--
-- Resolves TWO architectural conflicts deliberately, both documented here since
-- they're load-bearing decisions, not incidental implementation details:
--
-- Conflict A (spec §3.1, anticipated by the spec): investment_positions must only
-- ever be written by handle_deposit_status_change() in normal operation, but a
-- migrated investment has no deposit_submissions row to approve, and even if it
-- did, that trigger recomputes maturity from TODAY's package rate, not the
-- historical one. Resolved by import_historical_investment(): a second, narrowly-
-- scoped, audited, super_admin-only SECURITY DEFINER function that is the only
-- other code path allowed to insert into investment_positions directly.
--
-- Conflict B (flagged by the spec as unresolved -- "the first real decision to
-- make" -- discovered here by inspecting the live schema): profiles.id has a hard
-- FK to auth.users(id) ON DELETE CASCADE. There is no identity table independent
-- of a login in this schema, so "migrate the money first, onboard the person
-- second" cannot mean "create a profiles row with no auth.users row" -- that's not
-- possible here without ripping up every RLS policy in the app (auth.uid() =
-- profiles.id is the foundation of all of them). Resolved by creating the
-- auth.users + profiles + investor_details rows for a migrated investor AT IMPORT
-- TIME (in application code, not this migration), but with a discarded/unknown
-- random password, must_change_password = true, account_status = 'invited', and
-- crucially NO temp password generated and NO invitation email sent -- the
-- investor cannot sign in (nobody, including the admin, knows any password for
-- that auth.users row) and does not know the account exists. "Create Account" in
-- spec §6.3 is therefore actually "issue real credentials and invite" for a
-- migrated investor, not "create the identity record" (that already happened at
-- import time) -- functionally equivalent to the spec's intent (investor
-- experiences nothing until explicitly invited) without violating the FK.

-- 1. Three-field status model (spec §2.2) -- migration_status and
--    financial_history_status are independent of kyc_status and of each other.
create type public.migration_status_type as enum ('native', 'migrated');
alter table public.profiles add column migration_status public.migration_status_type not null default 'native';
comment on column public.profiles.migration_status is
  'Did this record come from a migration, or was it created natively through the app? Independent of financial_history_status and kyc_status/verification_status -- see spec §2.2.';

alter table public.investor_details add column financial_history_status text;
comment on column public.investor_details.financial_history_status is
  'Trust status of this investor''s historical money figures. Only meaningful for migration_status=''migrated'' investors (e.g. ''imported_approved''). Null for native investors -- they don''t need this axis at all.';

-- verification_status is intentionally a GENERATED column, not a stored value kept
-- in lockstep by application code -- per spec §2.2's own preference ("a
-- generated/computed value read off kyc_status"), this can never drift from
-- kyc_status because Postgres recomputes it, not because some code path
-- remembered to update both.
alter table public.investor_details add column verification_status text
  generated always as (case when kyc_status = 'approved' then 'verified' else 'unverified' end) stored;
comment on column public.investor_details.verification_status is
  'Derived, never stored independently: verified iff kyc_status = approved. Migration status and financial-history trust never factor into this -- see spec §2.2.';

-- 48-hour temp-credential expiry (spec §3.2/§6.2) -- did not exist before this;
-- an admin-issued temp password previously never expired.
alter table public.profiles add column temp_password_issued_at timestamptz;
comment on column public.profiles.temp_password_issued_at is
  'Set whenever a temp password is (re)issued via createStaffOrInvestorAccount or a migrated-investor invite/resend. login() rejects sign-in with must_change_password=true if this is more than 48 hours in the past.';

-- 2. Import staging (spec §4.2) -- never write spreadsheet rows straight into
--    profiles/investor_details/investment_positions. RLS staff-can-read,
--    super_admin-can-write, matching §9's RBAC (upload/map/validate/approve is
--    Super-Admin-only; Finance Officer can view). No DELETE policy on either
--    table, by design, same as every other financial-adjacent table in this
--    schema (spec §14: no casual delete of financial records).
create type public.import_batch_status as enum ('draft', 'validated', 'importing', 'completed', 'failed');
create type public.import_row_validation_status as enum ('valid', 'warning', 'error');
create type public.import_row_resolution as enum
  ('pending', 'new', 'duplicate_exact', 'duplicate_possible', 'imported', 'skipped', 'failed');

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  source_type text not null default 'xlsx',
  uploaded_by uuid not null references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  column_mapping jsonb,
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  warning_rows integer not null default 0,
  invalid_rows integer not null default 0,
  imported_rows integer not null default 0,
  failed_rows integer not null default 0,
  source_total_amount numeric(14,2),
  imported_total_amount numeric(14,2),
  status public.import_batch_status not null default 'draft',
  notes text,
  completed_at timestamptz
);
comment on table public.import_batches is
  'One row per uploaded source file. Every import_rows row traces back to exactly one batch -- spec §4.1: "every stage must be traceable back to a specific import_batches row."';

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  source_row_number integer not null,
  source_data jsonb not null,
  mapped_data jsonb,
  validation_status public.import_row_validation_status not null default 'error',
  validation_errors jsonb not null default '[]'::jsonb,
  validation_warnings jsonb not null default '[]'::jsonb,
  resolution public.import_row_resolution not null default 'pending',
  linked_investor_id uuid references public.profiles(id),
  linked_investment_id uuid references public.investment_positions(id),
  created_at timestamptz not null default now()
);
comment on table public.import_rows is
  'source_data is the raw row, untouched, kept forever even after import -- spec §4.2: "the only way to answer what the original spreadsheet actually said months later during a dispute."';

create index import_rows_batch_id_idx on public.import_rows(batch_id);

alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;

create policy "import_batches_staff_select" on public.import_batches for select using (public.is_staff());
create policy "import_batches_super_admin_insert" on public.import_batches for insert with check (public.is_super_admin());
create policy "import_batches_super_admin_update" on public.import_batches for update using (public.is_super_admin());

create policy "import_rows_staff_select" on public.import_rows for select using (public.is_staff());
create policy "import_rows_super_admin_insert" on public.import_rows for insert with check (public.is_super_admin());
create policy "import_rows_super_admin_update" on public.import_rows for update using (public.is_super_admin());

-- 3. The one and only other code path allowed to insert into investment_positions
--    directly (Conflict A above). Deliberately narrow: no upsert, no bulk mode,
--    one row at a time, every call traceable to a batch+row, always audited.
--    super_admin-only, matching §9 (import approval is Super-Admin-scoped) and
--    the same caller-check pattern as set_account_freeze/choose_maturity_action.
create or replace function public.import_historical_investment(
  p_batch_id uuid,
  p_row_id uuid,
  p_investor_id uuid,
  p_package_code public.package_type,
  p_principal_amount numeric,
  p_annual_return_rate numeric,
  p_duration_months integer,
  p_start_date date,
  p_maturity_date date,
  p_expected_return numeric,
  p_maturity_value numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_package_id uuid;
  v_investor_role public.user_role;
  v_new_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'Only a super admin can import historical investments';
  end if;

  select id into v_package_id from public.investment_packages where code = p_package_code and is_active limit 1;
  if v_package_id is null then
    raise exception 'No active investment package found for code %', p_package_code;
  end if;

  select role into v_investor_role from public.profiles where id = p_investor_id;
  if v_investor_role is null then
    raise exception 'Investor % not found', p_investor_id;
  end if;
  if v_investor_role <> 'investor' then
    raise exception 'Target of a historical investment import must be an investor';
  end if;

  if p_principal_amount is null or p_principal_amount <= 0 then
    raise exception 'principal_amount must be a positive number';
  end if;
  if p_maturity_date < p_start_date then
    raise exception 'maturity_date (%) cannot be before start_date (%)', p_maturity_date, p_start_date;
  end if;

  insert into public.investment_positions (
    deposit_submission_id, investor_id, package_id, principal_amount, annual_return_rate,
    duration_months, start_date, maturity_date, expected_return, maturity_value, status
  ) values (
    null, p_investor_id, v_package_id, p_principal_amount, p_annual_return_rate,
    p_duration_months, p_start_date, p_maturity_date, p_expected_return, p_maturity_value,
    case when p_maturity_date <= current_date then 'matured' else 'active' end
  )
  returning id into v_new_id;

  if p_row_id is not null then
    update public.import_rows
    set resolution = 'imported', linked_investor_id = p_investor_id, linked_investment_id = v_new_id
    where id = p_row_id and batch_id = p_batch_id;
  end if;

  perform public.log_audit(
    'Historical Investment Imported', 'investment_positions', v_new_id,
    null,
    jsonb_build_object(
      'batch_id', p_batch_id, 'row_id', p_row_id, 'investor_id', p_investor_id,
      'principal_amount', p_principal_amount, 'start_date', p_start_date,
      'maturity_date', p_maturity_date, 'maturity_value', p_maturity_value
    )
  );

  return v_new_id;
end;
$$;

revoke execute on function public.import_historical_investment(uuid, uuid, uuid, public.package_type, numeric, numeric, integer, date, date, numeric, numeric) from public, anon;
grant execute on function public.import_historical_investment(uuid, uuid, uuid, public.package_type, numeric, numeric, integer, date, date, numeric, numeric) to authenticated;
