alter table public.journal_entries
  add column if not exists reversal_of_reference_id text;
