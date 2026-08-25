create table if not exists public.business_onboarding (
  id uuid primary key default gen_random_uuid(),
  business_id text not null unique,
  account_id text not null,
  business_name text not null,
  owner_name text not null,
  owner_email text not null,
  persona_business_inquiry_id text unique,
  persona_owner_inquiry_id text unique,
  business_status text not null default 'PENDING' check (business_status in ('PENDING', 'APPROVED', 'REJECTED')),
  owner_status text not null default 'PENDING' check (owner_status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_onboarding_persona_business_idx
  on public.business_onboarding (persona_business_inquiry_id);
create index if not exists business_onboarding_persona_owner_idx
  on public.business_onboarding (persona_owner_inquiry_id);

create table if not exists public.linked_funding_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id text not null unique,
  account_id text not null,
  provider text not null default 'PLAID',
  provider_item_id text not null unique,
  provider_access_token text not null,
  institution_id text,
  institution_name text,
  account_name text,
  account_mask text,
  status text not null default 'LINKED' check (status in ('LINKED', 'ERROR', 'DISCONNECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists linked_funding_accounts_scope_idx
  on public.linked_funding_accounts (business_id, account_id);

alter table public.business_onboarding enable row level security;
alter table public.linked_funding_accounts enable row level security;
