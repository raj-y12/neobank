create table if not exists public.standing_orders (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id),
  account_id text not null,
  amount_cents bigint not null check (amount_cents > 0),
  recipient jsonb not null,
  frequency text not null check (frequency in ('DAILY', 'WEEKLY', 'MONTHLY')),
  next_run_date date not null,
  insufficient_funds_policy text not null default 'SKIP' check (insufficient_funds_policy in ('SKIP', 'RETRY_NEXT_DAY')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'CANCELED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.standing_order_occurrences (
  id uuid primary key default gen_random_uuid(),
  standing_order_id uuid not null references public.standing_orders(id),
  occurrence_key text not null,
  scheduled_date date not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PENDING_APPROVAL', 'SUBMITTED', 'SKIPPED', 'INSUFFICIENT_FUNDS')),
  payment_id uuid references public.payments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (standing_order_id, occurrence_key)
);

alter table public.standing_orders enable row level security;
alter table public.standing_order_occurrences enable row level security;

create policy standing_orders_member_read on public.standing_orders for select using (
  exists (select 1 from public.business_members m where m.business_id = standing_orders.business_id and m.auth_user_id = auth.uid())
);
create policy standing_order_occurrences_member_read on public.standing_order_occurrences for select using (
  exists (select 1 from public.standing_orders s join public.business_members m on m.business_id = s.business_id where s.id = standing_order_occurrences.standing_order_id and m.auth_user_id = auth.uid())
);

-- The unique occurrence key makes retries and concurrent scheduler workers
-- idempotent. A worker can claim the same occurrence safely after a timeout.
create or replace function public.claim_standing_order_occurrence(
  p_standing_order_id uuid,
  p_scheduled_date date
)
returns public.standing_order_occurrences
language sql
security invoker
set search_path = public
as $$
  insert into public.standing_order_occurrences (standing_order_id, occurrence_key, scheduled_date)
  values (p_standing_order_id, p_standing_order_id::text || ':' || p_scheduled_date::text, p_scheduled_date)
  on conflict (standing_order_id, occurrence_key) do update set updated_at = now()
  returning *;
$$;
