create table if not exists public.card_reversal_intents (
  id uuid primary key default gen_random_uuid(),
  original_transaction_id uuid not null references public.card_transactions(id),
  card_token text not null,
  expected_amount_cents bigint not null check (expected_amount_cents > 0),
  provider_return_transaction_id text unique,
  status text not null check (status in ('PENDING', 'LINKED', 'POSTED', 'REJECTED')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  linked_at timestamptz,
  posted_at timestamptz
);

alter table public.card_transactions
  add column if not exists reversal_of_transaction_id uuid references public.card_transactions(id);

create index if not exists card_reversal_intents_original_transaction_idx
  on public.card_reversal_intents (original_transaction_id);

create index if not exists card_reversal_intents_status_idx
  on public.card_reversal_intents (status);

alter table public.card_reversal_intents enable row level security;
