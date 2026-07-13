-- ROOT CAUSE of "packages never load / InvestWizard stuck forever": the packages
-- effect on the client fires exactly once, at first app mount — which happens on the
-- LOGIN SCREEN, before any session exists (useJBDocsStore is a single long-lived
-- hook instance; login just updates state within it, it never remounts). At that
-- first fetch, the request is anonymous, and packages_select required
-- auth.role() = 'authenticated', so RLS silently returned zero rows — not an error,
-- just an empty result — and nothing ever re-fetched after login succeeded.
--
-- Real fix, not a timing patch: investment package rates are not sensitive data —
-- they're literally on the org's own public marketing PDF ("Offering 30% annual
-- interest"). There's no reason this table needs authentication to read at all.
-- Allowing anon removes the race condition entirely instead of chasing effect timing.
drop policy "packages_select" on public.investment_packages;
create policy "packages_select" on public.investment_packages for select using (true);
