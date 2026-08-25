alter table public.business_members
  add column if not exists email text,
  add column if not exists status text not null default 'ACTIVE';

alter table public.business_members
  drop constraint if exists business_members_status_check;

alter table public.business_members
  add constraint business_members_status_check check (status in ('INVITED', 'ACTIVE', 'DISABLED'));

create table if not exists public.business_cards (
  id uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id),
  card_token text not null unique,
  member_id text references public.business_members(id),
  provider text not null default 'LITHIC',
  status text not null default 'ASSIGNED' check (status in ('ASSIGNED', 'UNASSIGNED', 'DISABLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_cards_business_id_idx on public.business_cards (business_id, created_at desc);
create index if not exists business_cards_member_id_idx on public.business_cards (member_id);
alter table public.business_cards enable row level security;

drop policy if exists business_cards_member_read on public.business_cards;
create policy business_cards_member_read on public.business_cards
for select to authenticated
using (exists (
  select 1 from public.business_members m
  where m.business_id = business_cards.business_id
    and m.auth_user_id = (select auth.uid())
));

drop policy if exists business_members_business_read on public.business_members;
create policy business_members_business_read on public.business_members
for select to authenticated
using (exists (
  select 1 from public.business_members own
  where own.business_id = business_members.business_id
    and own.auth_user_id = (select auth.uid())
));
