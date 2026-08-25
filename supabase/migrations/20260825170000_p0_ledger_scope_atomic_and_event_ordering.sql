alter table public.journal_entries
  add column if not exists business_id text not null default 'demo-business',
  add column if not exists account_id text not null default 'demo-account';

create index if not exists journal_entries_scope_created_at_idx
  on public.journal_entries (business_id, account_id, created_at desc);

create table if not exists public.card_event_parking (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  provider_transaction_id text not null,
  event_type text not null,
  payload jsonb not null,
  parked_at timestamptz not null default now(),
  matched_at timestamptz,
  unique (provider, provider_event_id)
);

create index if not exists card_event_parking_transaction_idx
  on public.card_event_parking (provider, provider_transaction_id, parked_at);

alter table public.card_event_parking enable row level security;

create or replace function public.prevent_hold_reactivation()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'RELEASED' and new.status = 'ACTIVE' then
    new.status := 'RELEASED';
    new.amount_cents := old.amount_cents;
    new.released_at := coalesce(old.released_at, new.released_at);
    new.release_event_id := coalesce(old.release_event_id, new.release_event_id);
  end if;
  return new;
end;
$$;

drop trigger if exists card_holds_monotonic_status on public.card_holds;
create trigger card_holds_monotonic_status
before update on public.card_holds
for each row execute function public.prevent_hold_reactivation();

create or replace function public.record_journal_entry(
  p_entry_type text,
  p_value_date date,
  p_reference_id text,
  p_reversal_of_reference_id text,
  p_idempotency_key text,
  p_business_id text,
  p_account_id text,
  p_postings jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_journal_entry_id uuid;
begin
  insert into public.journal_entries (
    entry_type,
    value_date,
    reference_id,
    reversal_of_reference_id,
    idempotency_key,
    business_id,
    account_id
  ) values (
    p_entry_type,
    p_value_date,
    p_reference_id,
    p_reversal_of_reference_id,
    p_idempotency_key,
    p_business_id,
    p_account_id
  )
  on conflict do nothing
  returning id into v_journal_entry_id;

  if v_journal_entry_id is null then
    select id into v_journal_entry_id
    from public.journal_entries
    where idempotency_key = p_idempotency_key;
    return v_journal_entry_id;
  end if;

  insert into public.journal_postings (journal_entry_id, account_code, debit_cents, credit_cents)
  select
    v_journal_entry_id,
    posting->>'accountCode',
    coalesce((posting->>'debitCents')::bigint, 0),
    coalesce((posting->>'creditCents')::bigint, 0)
  from jsonb_array_elements(p_postings) as posting;

  return v_journal_entry_id;
end;
$$;

revoke all on function public.record_journal_entry(text, date, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_journal_entry(text, date, text, text, text, text, text, jsonb) to service_role;
