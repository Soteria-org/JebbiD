-- Missing covering indexes on foreign keys flagged by the performance advisor
create index idx_audit_logs_actor on public.audit_logs(actor_profile_id);
create index idx_deposit_submissions_package on public.deposit_submissions(package_id);
create index idx_deposit_submissions_reviewed_by on public.deposit_submissions(reviewed_by);
create index idx_investment_positions_package on public.investment_positions(package_id);
create index idx_payout_records_paid_by on public.payout_records(paid_by);
create index idx_profiles_created_by on public.profiles(created_by);
create index idx_staff_details_created_by on public.staff_details(created_by);
create index idx_withdrawal_requests_investment on public.withdrawal_requests(investment_id);
create index idx_withdrawal_requests_reviewed_by on public.withdrawal_requests(reviewed_by);

-- Rewrite every RLS policy to wrap auth.uid()/is_staff()/is_super_admin() in a
-- subquery: `(select auth.uid())` is evaluated once per statement (cached by the
-- planner) instead of re-evaluated per row. Behavior is identical, just faster at scale.

drop policy "profiles_select" on public.profiles;
drop policy "profiles_insert" on public.profiles;
drop policy "profiles_update" on public.profiles;
create policy "profiles_select" on public.profiles for select using (id = (select auth.uid()) or (select public.is_staff()));
create policy "profiles_insert" on public.profiles for insert with check (id = (select auth.uid()) or (select public.is_super_admin()));
create policy "profiles_update" on public.profiles for update using (id = (select auth.uid()) or (select public.is_super_admin()));

drop policy "investor_details_select" on public.investor_details;
drop policy "investor_details_insert" on public.investor_details;
drop policy "investor_details_update" on public.investor_details;
create policy "investor_details_select" on public.investor_details for select using (profile_id = (select auth.uid()) or (select public.is_staff()));
create policy "investor_details_insert" on public.investor_details for insert with check (profile_id = (select auth.uid()) or (select public.is_staff()));
create policy "investor_details_update" on public.investor_details for update using (profile_id = (select auth.uid()) or (select public.is_staff()));

drop policy "staff_details_select" on public.staff_details;
drop policy "staff_details_insert" on public.staff_details;
drop policy "staff_details_update" on public.staff_details;
create policy "staff_details_select" on public.staff_details for select using ((select public.is_staff()));
create policy "staff_details_insert" on public.staff_details for insert with check ((select public.is_super_admin()));
create policy "staff_details_update" on public.staff_details for update using ((select public.is_super_admin()));

drop policy "packages_select" on public.investment_packages;
drop policy "packages_insert" on public.investment_packages;
drop policy "packages_update" on public.investment_packages;
create policy "packages_select" on public.investment_packages for select using ((select auth.role()) = 'authenticated');
create policy "packages_insert" on public.investment_packages for insert with check ((select public.is_super_admin()));
create policy "packages_update" on public.investment_packages for update using ((select public.is_super_admin()));

drop policy "deposits_select" on public.deposit_submissions;
drop policy "deposits_insert" on public.deposit_submissions;
drop policy "deposits_staff_update" on public.deposit_submissions;
drop policy "deposits_investor_respond" on public.deposit_submissions;
create policy "deposits_select" on public.deposit_submissions for select using (investor_id = (select auth.uid()) or (select public.is_staff()));
create policy "deposits_insert" on public.deposit_submissions for insert with check (investor_id = (select auth.uid()));
create policy "deposits_staff_update" on public.deposit_submissions for update using ((select public.is_staff()));
create policy "deposits_investor_respond" on public.deposit_submissions for update
  using (investor_id = (select auth.uid()) and status = 'clarification_requested')
  with check (investor_id = (select auth.uid()));

drop policy "positions_select" on public.investment_positions;
drop policy "positions_insert" on public.investment_positions;
drop policy "positions_update" on public.investment_positions;
create policy "positions_select" on public.investment_positions for select using (investor_id = (select auth.uid()) or (select public.is_staff()));
create policy "positions_insert" on public.investment_positions for insert with check ((select public.is_staff()));
create policy "positions_update" on public.investment_positions for update using ((select public.is_staff()));

drop policy "withdrawals_select" on public.withdrawal_requests;
drop policy "withdrawals_insert" on public.withdrawal_requests;
drop policy "withdrawals_staff_update" on public.withdrawal_requests;
create policy "withdrawals_select" on public.withdrawal_requests for select using (investor_id = (select auth.uid()) or (select public.is_staff()));
create policy "withdrawals_insert" on public.withdrawal_requests for insert with check (investor_id = (select auth.uid()));
create policy "withdrawals_staff_update" on public.withdrawal_requests for update using ((select public.is_staff()));

drop policy "payouts_select" on public.payout_records;
drop policy "payouts_insert" on public.payout_records;
create policy "payouts_select" on public.payout_records for select using (
  (select public.is_staff()) or exists (
    select 1 from public.withdrawal_requests w where w.id = withdrawal_id and w.investor_id = (select auth.uid())
  )
);
create policy "payouts_insert" on public.payout_records for insert with check ((select public.is_staff()));

drop policy "documents_select" on public.uploaded_documents;
drop policy "documents_insert" on public.uploaded_documents;
create policy "documents_select" on public.uploaded_documents for select using (owner_profile_id = (select auth.uid()) or (select public.is_staff()));
create policy "documents_insert" on public.uploaded_documents for insert with check (owner_profile_id = (select auth.uid()) or (select public.is_staff()));

drop policy "notifications_select" on public.notifications;
drop policy "notifications_update" on public.notifications;
create policy "notifications_select" on public.notifications for select using (profile_id = (select auth.uid()));
create policy "notifications_update" on public.notifications for update using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

drop policy "audit_logs_select" on public.audit_logs;
create policy "audit_logs_select" on public.audit_logs for select using ((select public.is_staff()));
