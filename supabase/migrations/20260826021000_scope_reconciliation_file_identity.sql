-- File identity is tenant-scoped. A provider can legitimately reuse a file
-- reference in two businesses; it must not cause one tenant's receipt to
-- overwrite another tenant's reconciliation run.
alter table public.reconciliation_files
  drop constraint if exists reconciliation_files_provider_file_reference_key;

create unique index if not exists reconciliation_files_business_provider_reference_uidx
  on public.reconciliation_files (business_id, provider, file_reference);
