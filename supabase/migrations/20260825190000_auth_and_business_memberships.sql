create table if not exists public.business_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id text not null,
  account_id text not null,
  role text not null check (role in ('ADMIN', 'MEMBER')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, business_id)
);

create index if not exists business_memberships_user_id_idx on public.business_memberships(user_id);
alter table public.business_memberships enable row level security;

drop policy if exists "members can read their memberships" on public.business_memberships;
create policy "members can read their memberships"
on public.business_memberships
for select
to authenticated
using ((select auth.uid()) = user_id);
