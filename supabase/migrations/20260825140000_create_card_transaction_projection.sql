create table if not exists public.card_transactions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_transaction_id text not null,
  card_token text not null,
  status text not null,
  authorization_amount_cents bigint,
  settled_amount_cents bigint,
  value_date date,
  booking_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_transaction_id)
);

create table if not exists public.card_transaction_events (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.card_transactions(id),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  occurred_at timestamptz,
  hold_amount_cents bigint,
  settlement_amount_cents bigint,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.card_holds (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.card_transactions(id),
  amount_cents bigint not null,
  status text not null check (status in ('ACTIVE', 'RELEASED')),
  released_at timestamptz,
  release_event_id uuid references public.card_transaction_events(id),
  created_at timestamptz not null default now(),
  unique (transaction_id)
);

create index if not exists card_transactions_card_token_updated_at_idx
  on public.card_transactions (card_token, updated_at desc);

alter table public.card_transactions enable row level security;
alter table public.card_transaction_events enable row level security;
alter table public.card_holds enable row level security;
