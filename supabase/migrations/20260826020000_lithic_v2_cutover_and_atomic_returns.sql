alter table public.provider_events add column if not exists processing_version integer not null default 1;
update public.provider_events set processing_version = 1 where processing_version is distinct from 1;
alter table public.provider_events alter column processing_version set default 2;

comment on table public.provider_events is 'Immutable provider webhook deliveries; processing_version 1 is the pre-semantic legacy baseline and 2 is semantic lifecycle processing.';
comment on table public.card_transaction_events is 'Immutable normalized provider facts. card_transactions and card_holds are mutable rebuildable projections.';
comment on table public.card_transactions is 'Mutable rebuildable current-state projection derived from immutable provider and journal facts.';
comment on table public.card_holds is 'Mutable rebuildable current hold projection derived from immutable card_transaction_events.';

create or replace function public.prevent_card_transaction_event_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'card_transaction_events are append-only';
end;
$$;

drop trigger if exists card_transaction_events_append_only on public.card_transaction_events;
create trigger card_transaction_events_append_only
before update or delete on public.card_transaction_events
for each row execute function public.prevent_card_transaction_event_mutation();

create or replace function public.record_journal_entry_at(
  p_entry_type text,
  p_value_date date,
  p_reference_id text,
  p_reversal_of_reference_id text,
  p_idempotency_key text,
  p_business_id text,
  p_account_id text,
  p_postings jsonb,
  p_knowledge_time timestamptz
)
returns uuid language plpgsql as $$
declare
  v_id uuid;
  v_debits bigint;
  v_credits bigint;
begin
  if p_postings is null or jsonb_array_length(p_postings) = 0 then raise exception 'Journal entry requires postings'; end if;
  select coalesce(sum(coalesce((p->>'debitCents')::bigint,0)),0), coalesce(sum(coalesce((p->>'creditCents')::bigint,0)),0)
    into v_debits,v_credits from jsonb_array_elements(p_postings) p;
  if v_debits <> v_credits then raise exception 'Journal entry is not balanced'; end if;
  insert into public.journal_entries(entry_type,value_date,booking_date,created_at,reference_id,reversal_of_reference_id,idempotency_key,business_id,account_id)
  values(p_entry_type,p_value_date,(p_knowledge_time at time zone 'UTC')::date,p_knowledge_time,p_reference_id,p_reversal_of_reference_id,p_idempotency_key,p_business_id,p_account_id)
  on conflict do nothing returning id into v_id;
  if v_id is null then select id into v_id from public.journal_entries where idempotency_key=p_idempotency_key; return v_id; end if;
  insert into public.journal_postings(journal_entry_id,account_code,debit_cents,credit_cents)
  select v_id,p->>'accountCode',coalesce((p->>'debitCents')::bigint,0),coalesce((p->>'creditCents')::bigint,0) from jsonb_array_elements(p_postings) p;
  return v_id;
end;
$$;

create or replace function public.post_card_return_atomic(
  p_original_provider_transaction_id text,
  p_return_event_id text,
  p_return_transaction_id text,
  p_amount_cents bigint,
  p_knowledge_time timestamptz,
  p_business_id text,
  p_account_id text
)
returns integer language plpgsql as $$
declare
  c record;
  v_remaining bigint := p_amount_cents;
  v_amount bigint;
  v_count integer := 0;
  v_prefix text := 'lithic:'||p_return_event_id||':settlement-reversal:';
begin
  if p_amount_cents <= 0 then raise exception 'Return amount must be positive'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_original_provider_transaction_id,0));
  for c in
    with clearing as (
      select e.reference_id,e.value_date,e.created_at,
        sum(case when p.account_code='CARD_SETTLEMENT_PAYABLE' then p.credit_cents-p.debit_cents else 0 end)::bigint amount
      from public.journal_entries e join public.journal_postings p on p.journal_entry_id=e.id
      where e.entry_type='CARD_CLEARING' and e.reference_id like p_original_provider_transaction_id||':%'
      group by e.id,e.reference_id,e.value_date,e.created_at
    ), reversed as (
      select e.reversal_of_reference_id,
        sum(case when p.account_code='CARD_SETTLEMENT_PAYABLE' then p.debit_cents-p.credit_cents else 0 end)::bigint amount
      from public.journal_entries e join public.journal_postings p on p.journal_entry_id=e.id
      where e.entry_type='CARD_SETTLEMENT_REVERSAL' and e.idempotency_key not like v_prefix||'%'
      group by e.reversal_of_reference_id
    )
    select clearing.reference_id,clearing.value_date,greatest(0,clearing.amount-coalesce(reversed.amount,0))::bigint reversible
    from clearing left join reversed on reversed.reversal_of_reference_id=clearing.reference_id
    where clearing.amount-coalesce(reversed.amount,0)>0 order by clearing.value_date,clearing.created_at,clearing.reference_id
  loop
    exit when v_remaining=0;
    v_amount := least(v_remaining,c.reversible);
    perform public.record_journal_entry_at('CARD_SETTLEMENT_REVERSAL',c.value_date,
      p_return_transaction_id||':'||p_return_event_id||':'||(v_count+1),c.reference_id,
      v_prefix||c.reference_id,p_business_id,p_account_id,
      jsonb_build_array(
        jsonb_build_object('accountCode','CARD_SETTLEMENT_PAYABLE','debitCents',v_amount,'creditCents',0),
        jsonb_build_object('accountCode','CUSTOMER_AVAILABLE','debitCents',0,'creditCents',v_amount)
      ),p_knowledge_time);
    v_remaining := v_remaining-v_amount; v_count := v_count+1;
  end loop;
  if v_remaining>0 then raise exception 'Return exceeds reversible clearing amount'; end if;
  return v_count;
end;
$$;

revoke all on function public.record_journal_entry_at(text,date,text,text,text,text,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.record_journal_entry_at(text,date,text,text,text,text,text,jsonb,timestamptz) to service_role;
revoke all on function public.post_card_return_atomic(text,text,text,bigint,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.post_card_return_atomic(text,text,text,bigint,timestamptz,text,text) to service_role;
