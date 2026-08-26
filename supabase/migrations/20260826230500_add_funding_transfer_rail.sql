alter table public.funding_transfers
  add column if not exists rail text not null default 'ACH';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'funding_transfers_rail_check'
      and conrelid = 'public.funding_transfers'::regclass
  ) then
    alter table public.funding_transfers
      add constraint funding_transfers_rail_check check (rail in ('ACH'));
  end if;
end $$;
