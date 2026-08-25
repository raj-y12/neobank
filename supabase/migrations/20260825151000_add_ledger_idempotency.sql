alter table public.journal_entries
  add column if not exists idempotency_key text;

create unique index if not exists journal_entries_idempotency_key_idx
  on public.journal_entries (idempotency_key)
  where idempotency_key is not null;
