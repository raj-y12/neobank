create or replace function public.record_journal_entry(
  p_entry_type text,
  p_value_date date,
  p_reference_id text,
  p_reversal_of_reference_id text,
  p_idempotency_key text,
  p_business_id text,
  p_account_id text,
  p_postings jsonb
)
returns uuid
language plpgsql
as $$
declare
  v_journal_entry_id uuid;
  v_debits bigint;
  v_credits bigint;
begin
  if p_postings is null or jsonb_array_length(p_postings) = 0 then
    raise exception 'Journal entry requires postings';
  end if;

  select
    coalesce(sum(coalesce((posting->>'debitCents')::bigint, 0)), 0),
    coalesce(sum(coalesce((posting->>'creditCents')::bigint, 0)), 0)
  into v_debits, v_credits
  from jsonb_array_elements(p_postings) as posting;

  if v_debits <> v_credits then
    raise exception 'Journal entry is not balanced: debits %, credits %', v_debits, v_credits;
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_postings) as posting
    where coalesce((posting->>'debitCents')::bigint, 0) < 0
       or coalesce((posting->>'creditCents')::bigint, 0) < 0
       or (coalesce((posting->>'debitCents')::bigint, 0) > 0 and coalesce((posting->>'creditCents')::bigint, 0) > 0)
       or (coalesce((posting->>'debitCents')::bigint, 0) = 0 and coalesce((posting->>'creditCents')::bigint, 0) = 0)
  ) then
    raise exception 'Invalid journal posting';
  end if;

  insert into public.journal_entries (entry_type, value_date, reference_id, reversal_of_reference_id, idempotency_key, business_id, account_id)
  values (p_entry_type, p_value_date, p_reference_id, p_reversal_of_reference_id, p_idempotency_key, p_business_id, p_account_id)
  on conflict do nothing
  returning id into v_journal_entry_id;

  if v_journal_entry_id is null then
    select id into v_journal_entry_id from public.journal_entries where idempotency_key = p_idempotency_key;
    return v_journal_entry_id;
  end if;

  insert into public.journal_postings (journal_entry_id, account_code, debit_cents, credit_cents)
  select v_journal_entry_id, posting->>'accountCode', coalesce((posting->>'debitCents')::bigint, 0), coalesce((posting->>'creditCents')::bigint, 0)
  from jsonb_array_elements(p_postings) as posting;
  return v_journal_entry_id;
end;
$$;

revoke all on function public.record_journal_entry(text, date, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_journal_entry(text, date, text, text, text, text, text, jsonb) to service_role;

create policy ledger_accounts_read on public.ledger_accounts for select using (true);
create policy ledger_entries_read on public.journal_entries for select using (
  auth.role() = 'service_role' or business_id in (
    select m.business_id from public.business_members m where m.auth_user_id = auth.uid()
  )
);
create policy ledger_postings_read on public.journal_postings for select using (
  auth.role() = 'service_role' or exists (
    select 1 from public.journal_entries e
    join public.business_members m on m.business_id = e.business_id
    where e.id = journal_postings.journal_entry_id and m.auth_user_id = auth.uid()
  )
);

create policy provider_events_service_read on public.provider_events for select using (auth.role() = 'service_role');
create policy card_transactions_service_read on public.card_transactions for select using (auth.role() = 'service_role');
create policy card_transaction_events_service_read on public.card_transaction_events for select using (auth.role() = 'service_role');
create policy card_holds_service_read on public.card_holds for select using (auth.role() = 'service_role');
create policy card_reversal_intents_service_read on public.card_reversal_intents for select using (auth.role() = 'service_role');
create policy card_event_parking_service_read on public.card_event_parking for select using (auth.role() = 'service_role');
