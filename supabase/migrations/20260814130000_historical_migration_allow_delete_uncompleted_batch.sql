-- Lets a super_admin delete an import batch that was uploaded/previewed but
-- never confirmed -- exactly the "I uploaded the wrong file/sheet, let me
-- redo it" case, which has no financial data attached to it yet (no
-- investment_positions rows exist for a batch that never ran
-- import_historical_investment()). Deliberately does NOT allow deleting a
-- 'completed' batch -- that status is only ever reached after real investor
-- accounts and investment_positions rows were created from it, and this
-- schema's rule (docs/database-schema.md §5) is no casual delete of
-- financial records, ever. import_rows cascades automatically via its
-- existing FK (batch_id references import_batches(id) on delete cascade).
create policy "import_batches_super_admin_delete_uncompleted" on public.import_batches
  for delete using (public.is_super_admin() and status <> 'completed');
