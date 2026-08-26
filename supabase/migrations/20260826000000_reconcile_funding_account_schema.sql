-- The original payment-core and P1 migrations both attempted to create
-- linked_funding_accounts. The payment-core table wins in a clean migration,
-- so bring that shape up to the adapter's current contract without dropping
-- any existing encrypted values.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'linked_funding_accounts' and column_name = 'provider_access_token'
  ) then
    alter table public.linked_funding_accounts add column provider_access_token text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'linked_funding_accounts' and column_name = 'encrypted_access_token'
  ) then
    update public.linked_funding_accounts
    set provider_access_token = coalesce(provider_access_token, encrypted_access_token)
    where provider_access_token is null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'linked_funding_accounts' and column_name = 'institution_id'
  ) then
    alter table public.linked_funding_accounts add column institution_id text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'linked_funding_accounts' and column_name = 'account_name'
  ) then
    alter table public.linked_funding_accounts add column account_name text;
  end if;
end $$;

create index if not exists linked_funding_accounts_business_account_idx
  on public.linked_funding_accounts (business_id, account_id);

insert into public.ledger_accounts (code, name, account_type)
values ('CUSTOMER_PAYMENT_HOLDS', 'Customer payment holds', 'LIABILITY')
on conflict (code) do nothing;

create or replace function public.reserve_payment_funds(
  p_business_id text,
  p_account_id text,
  p_payment_id text,
  p_amount_cents bigint
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry_id uuid;
  v_available bigint;
  v_key text := 'payment-reserve:' || p_payment_id;
begin
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Payment amount must be positive cents';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_business_id || ':' || p_account_id));

  select id into v_entry_id from public.journal_entries where idempotency_key = v_key;
  if v_entry_id is not null then return v_entry_id; end if;

  select coalesce(sum(posting.credit_cents - posting.debit_cents), 0)
    into v_available
  from public.journal_entries entry
  join public.journal_postings posting on posting.journal_entry_id = entry.id
  where entry.business_id = p_business_id
    and entry.account_id = p_account_id
    and posting.account_code = 'CUSTOMER_AVAILABLE';

  if v_available < p_amount_cents then
    raise exception 'Insufficient available funds';
  end if;

  return public.record_journal_entry(
    'PAYMENT_RESERVATION', current_date, p_payment_id, null, v_key,
    p_business_id, p_account_id,
    jsonb_build_array(
      jsonb_build_object('accountCode', 'CUSTOMER_AVAILABLE', 'debitCents', p_amount_cents, 'creditCents', 0),
      jsonb_build_object('accountCode', 'CUSTOMER_PAYMENT_HOLDS', 'debitCents', 0, 'creditCents', p_amount_cents)
    )
  );
end;
$$;

revoke all on function public.reserve_payment_funds(text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.reserve_payment_funds(text, text, text, bigint) to service_role;
