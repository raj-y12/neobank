create table if not exists public.ledger_accounts (
  code text primary key,
  name text not null,
  account_type text not null check (account_type in ('ASSET', 'LIABILITY')),
  created_at timestamptz not null default now()
);

insert into public.ledger_accounts (code, name, account_type) values
  ('SAFEGUARDED_CASH', 'Safeguarded cash', 'ASSET'),
  ('CUSTOMER_AVAILABLE', 'Customer available funds', 'LIABILITY'),
  ('CUSTOMER_CARD_HOLDS', 'Customer card holds', 'LIABILITY'),
  ('CARD_SETTLEMENT_PAYABLE', 'Card settlement payable', 'LIABILITY')
on conflict (code) do nothing;

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null,
  value_date date not null,
  booking_date date not null default current_date,
  reference_id text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_postings (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id),
  account_code text not null references public.ledger_accounts(code),
  debit_cents bigint not null default 0 check (debit_cents >= 0),
  credit_cents bigint not null default 0 check (credit_cents >= 0),
  created_at timestamptz not null default now(),
  check ((debit_cents > 0 and credit_cents = 0) or (credit_cents > 0 and debit_cents = 0))
);

create index if not exists journal_postings_account_idx
  on public.journal_postings (account_code, created_at desc);

alter table public.ledger_accounts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_postings enable row level security;
