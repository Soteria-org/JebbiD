-- Historical investment data migration (docs/migration/HISTORICAL_DATA_MIGRATION_SPEC.md).
-- Split into its own migration because Postgres cannot add an enum value and
-- use it in the same transaction/migration as other DDL/DML that references it
-- (see spec §3.2's own note on this).
alter type public.notification_type add value if not exists 'migration_invitation_sent';
