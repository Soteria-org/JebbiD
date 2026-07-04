insert into storage.buckets (id, name, public) values
  ('kyc-documents', 'kyc-documents', false),
  ('payment-proofs', 'payment-proofs', false),
  ('payout-proofs', 'payout-proofs', false)
on conflict (id) do nothing;

-- Convention: object path is always "{owner_profile_id}/{filename}".
-- Investors can read/write only their own folder; staff can read every folder.

create policy "kyc_documents_owner_rw" on storage.objects for all
using (bucket_id = 'kyc-documents' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()))
with check (bucket_id = 'kyc-documents' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));

create policy "payment_proofs_owner_rw" on storage.objects for all
using (bucket_id = 'payment-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()))
with check (bucket_id = 'payment-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));

-- Payout proofs are uploaded by finance/admin only; investors can read their own.
create policy "payout_proofs_staff_write" on storage.objects for insert
with check (bucket_id = 'payout-proofs' and public.is_staff());

create policy "payout_proofs_read" on storage.objects for select
using (bucket_id = 'payout-proofs' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
