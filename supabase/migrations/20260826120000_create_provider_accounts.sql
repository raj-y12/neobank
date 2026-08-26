create table if not exists public.provider_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id),
  account_id text not null,
  provider text not null check (provider in ('INCREASE')),
  provider_account_id text not null,
  provider_account_number_id text,
  encrypted_account_number text,
  encrypted_routing_number text,
  status text not null check (status in ('ACTIVE', 'DISCONNECTED', 'ERROR')) default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, account_id, provider),
  unique (provider, provider_account_id)
);

create index if not exists provider_accounts_scope_idx
  on public.provider_accounts (business_id, account_id, provider, status);

alter table public.provider_accounts enable row level security;

create policy provider_accounts_member_read
on public.provider_accounts
for select
to authenticated
using (
  exists (
    select 1
    from public.business_members membership
    where membership.business_id = provider_accounts.business_id
      and membership.auth_user_id = (select auth.uid())
  )
);
