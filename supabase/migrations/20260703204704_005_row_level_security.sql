-- Helper functions (security definer so they can read profiles without recursing into RLS)
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('finance_officer','super_admin'));
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

-- Defense in depth: even if a future policy is too generous, nobody except super_admin
-- can change their own or anyone else's role/account_status/must_change_password via
-- a plain table update. Real privilege changes must go through admin-only server code.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    if new.role <> old.role
       or new.account_status <> old.account_status
       or new.must_change_password is distinct from old.must_change_password then
      raise exception 'Not authorized to change role, account_status, or must_change_password';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_prevent_role_escalation
before update on public.profiles
for each row execute function public.prevent_role_escalation();

-- profiles
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid() or public.is_super_admin());
create policy "profiles_update" on public.profiles for update using (id = auth.uid() or public.is_super_admin());
-- no delete policy anywhere in this migration => deletes are always denied by RLS

-- investor_details
alter table public.investor_details enable row level security;
create policy "investor_details_select" on public.investor_details for select using (profile_id = auth.uid() or public.is_staff());
create policy "investor_details_insert" on public.investor_details for insert with check (profile_id = auth.uid() or public.is_staff());
create policy "investor_details_update" on public.investor_details for update using (profile_id = auth.uid() or public.is_staff());

-- staff_details: staff-only visibility, admin-only writes
alter table public.staff_details enable row level security;
create policy "staff_details_select" on public.staff_details for select using (public.is_staff());
create policy "staff_details_insert" on public.staff_details for insert with check (public.is_super_admin());
create policy "staff_details_update" on public.staff_details for update using (public.is_super_admin());

-- investment_packages: any signed-in user can read; only admin edits rates
alter table public.investment_packages enable row level security;
create policy "packages_select" on public.investment_packages for select using (auth.role() = 'authenticated');
create policy "packages_insert" on public.investment_packages for insert with check (public.is_super_admin());
create policy "packages_update" on public.investment_packages for update using (public.is_super_admin());

-- deposit_submissions: investor sees/creates own; staff sees/reviews all;
-- investor may only edit their own submission while it's awaiting their response
alter table public.deposit_submissions enable row level security;
create policy "deposits_select" on public.deposit_submissions for select using (investor_id = auth.uid() or public.is_staff());
create policy "deposits_insert" on public.deposit_submissions for insert with check (investor_id = auth.uid());
create policy "deposits_staff_update" on public.deposit_submissions for update using (public.is_staff());
create policy "deposits_investor_respond" on public.deposit_submissions for update
  using (investor_id = auth.uid() and status = 'clarification_requested')
  with check (investor_id = auth.uid());

-- investment_positions: investor read-only on own rows; only staff (via approval flow) writes
alter table public.investment_positions enable row level security;
create policy "positions_select" on public.investment_positions for select using (investor_id = auth.uid() or public.is_staff());
create policy "positions_insert" on public.investment_positions for insert with check (public.is_staff());
create policy "positions_update" on public.investment_positions for update using (public.is_staff());

-- withdrawal_requests: same pattern as deposits
alter table public.withdrawal_requests enable row level security;
create policy "withdrawals_select" on public.withdrawal_requests for select using (investor_id = auth.uid() or public.is_staff());
create policy "withdrawals_insert" on public.withdrawal_requests for insert with check (investor_id = auth.uid());
create policy "withdrawals_staff_update" on public.withdrawal_requests for update using (public.is_staff());

-- payout_records: append-only. staff insert; investor + staff can read; nobody edits/deletes.
alter table public.payout_records enable row level security;
create policy "payouts_select" on public.payout_records for select using (
  public.is_staff() or exists (
    select 1 from public.withdrawal_requests w where w.id = withdrawal_id and w.investor_id = auth.uid()
  )
);
create policy "payouts_insert" on public.payout_records for insert with check (public.is_staff());

-- uploaded_documents: owner + staff can read; owner or staff can insert; immutable after upload
alter table public.uploaded_documents enable row level security;
create policy "documents_select" on public.uploaded_documents for select using (owner_profile_id = auth.uid() or public.is_staff());
create policy "documents_insert" on public.uploaded_documents for insert with check (owner_profile_id = auth.uid() or public.is_staff());

-- notifications: users read/mark-read only their own. Rows are created by trigger
-- functions (security definer, migration 006) — no direct client insert policy.
alter table public.notifications enable row level security;
create policy "notifications_select" on public.notifications for select using (profile_id = auth.uid());
create policy "notifications_update" on public.notifications for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- audit_logs: staff can read; nobody can write directly (only via log_audit() / triggers,
-- migration 006), and nobody can update or delete — true insert-only audit trail.
alter table public.audit_logs enable row level security;
create policy "audit_logs_select" on public.audit_logs for select using (public.is_staff());
