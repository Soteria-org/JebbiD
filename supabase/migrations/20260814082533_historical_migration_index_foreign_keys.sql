-- Advisor flagged these three FKs as unindexed after historical_migration_schema.
-- import_rows/import_batches will grow to hundreds of rows per real import batch,
-- so these are worth having from the start rather than waiting for a slow-query report.
create index import_batches_uploaded_by_idx on public.import_batches(uploaded_by);
create index import_rows_linked_investor_id_idx on public.import_rows(linked_investor_id);
create index import_rows_linked_investment_id_idx on public.import_rows(linked_investment_id);
