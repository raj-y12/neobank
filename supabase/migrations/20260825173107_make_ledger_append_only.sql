-- Journal headers and postings are financial history. They may only be
-- created; corrections must be represented by new journal entries.

create or replace function public.reject_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Ledger rows are append-only: % on %.%',
    tg_op,
    tg_table_schema,
    tg_table_name
    using errcode = '55000';
end;
$$;

drop trigger if exists journal_entries_append_only on public.journal_entries;
create trigger journal_entries_append_only
before update or delete on public.journal_entries
for each row execute function public.reject_ledger_mutation();

drop trigger if exists journal_postings_append_only on public.journal_postings;
create trigger journal_postings_append_only
before update or delete on public.journal_postings
for each row execute function public.reject_ledger_mutation();
