create table if not exists public.businesses (
  id text primary key,
  legal_name text not null,
  status text not null check (status in ('PENDING', 'APPROVED', 'REJECTED')) default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id text primary key,
  business_id text not null references public.businesses(id),
  auth_user_id uuid,
  role text not null check (role in ('ADMIN', 'MEMBER')),
  created_at timestamptz not null default now(),
  unique (business_id, auth_user_id)
);

create table if not exists public.onboarding_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id),
  provider text not null,
  provider_reference text,
  subject_type text not null check (subject_type in ('BUSINESS', 'OWNER')),
  status text not null check (status in ('PENDING', 'APPROVED', 'REJECTED')) default 'PENDING',
  provider_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, subject_type)
);

create table if not exists public.linked_funding_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id),
  account_id text not null,
  provider text not null,
  provider_item_id text not null,
  encrypted_access_token text not null,
  institution_name text,
  account_mask text,
  status text not null check (status in ('LINKED', 'DISCONNECTED', 'ERROR')) default 'LINKED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_item_id)
);

create table if not exists public.funding_transfers (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id),
  account_id text not null,
  linked_funding_account_id uuid not null references public.linked_funding_accounts(id),
  provider text not null,
  provider_transfer_id text,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'USD',
  status text not null check (status in ('PENDING', 'SETTLED', 'RETURNED')) default 'PENDING',
  settled_at timestamptz,
  returned_at timestamptz,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_transfer_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id),
  account_id text not null,
  initiator_member_id text not null references public.business_members(id),
  provider text not null,
  provider_payment_id text,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'USD',
  rail text not null default 'ACH',
  recipient jsonb not null,
  status text not null check (status in ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUBMITTED', 'SETTLED', 'RETURNED')) default 'PENDING_APPROVAL',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table if not exists public.payment_approvals (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id),
  approver_member_id text not null references public.business_members(id),
  decision text not null check (decision in ('APPROVED', 'REJECTED')),
  note text,
  created_at timestamptz not null default now(),
  unique (payment_id, approver_member_id)
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id),
  funding_transfer_id uuid references public.funding_transfers(id),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.reconciliation_files (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id),
  provider text not null,
  file_reference text not null,
  received_at timestamptz not null default now(),
  unique (provider, file_reference)
);

create table if not exists public.reconciliation_breaks (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id),
  file_id uuid references public.reconciliation_files(id),
  break_type text not null check (break_type in ('IN_FILE_NOT_LEDGER', 'IN_LEDGER_NOT_FILE', 'AMOUNT_MISMATCH')),
  provider_reference text not null,
  ledger_reference text,
  expected_amount_cents bigint,
  actual_amount_cents bigint,
  status text not null check (status in ('OPEN', 'RESOLVED')) default 'OPEN',
  note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists payments_business_status_idx on public.payments (business_id, status, created_at desc);
create index if not exists funding_transfers_business_status_idx on public.funding_transfers (business_id, status, created_at desc);
create index if not exists reconciliation_breaks_business_status_idx on public.reconciliation_breaks (business_id, status, created_at desc);

do $$ declare table_name text; begin
  foreach table_name in array array['businesses','business_members','onboarding_verifications','linked_funding_accounts','funding_transfers','payments','payment_approvals','payment_events','reconciliation_files','reconciliation_breaks'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Service-role routes perform the same business-scope checks explicitly. These
-- policies prevent accidental exposure if a client query is introduced later.
create policy businesses_member_read on public.businesses for select using (
  exists (select 1 from public.business_members m where m.business_id = businesses.id and m.auth_user_id = auth.uid())
);
create policy business_members_self_read on public.business_members for select using (auth_user_id = auth.uid());
create policy onboarding_member_read on public.onboarding_verifications for select using (
  exists (select 1 from public.business_members m where m.business_id = onboarding_verifications.business_id and m.auth_user_id = auth.uid())
);
create policy funding_member_read on public.funding_transfers for select using (
  exists (select 1 from public.business_members m where m.business_id = funding_transfers.business_id and m.auth_user_id = auth.uid())
);
create policy payments_member_read on public.payments for select using (
  exists (select 1 from public.business_members m where m.business_id = payments.business_id and m.auth_user_id = auth.uid())
);
create policy approvals_member_read on public.payment_approvals for select using (
  exists (select 1 from public.payments p join public.business_members m on m.business_id = p.business_id where p.id = payment_approvals.payment_id and m.auth_user_id = auth.uid())
);
create policy reconciliation_member_read on public.reconciliation_breaks for select using (
  exists (select 1 from public.business_members m where m.business_id = reconciliation_breaks.business_id and m.auth_user_id = auth.uid())
);
