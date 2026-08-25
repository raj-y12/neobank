with latest_event as (
  select distinct on (transaction_id)
    transaction_id,
    payload
  from public.card_transaction_events
  order by transaction_id, occurred_at desc nulls last, created_at desc
), normalized as (
  select
    transaction_id,
    nullif((
      select abs(nullif(auth_event->'amounts'->'hold'->>'amount', '')::bigint)
      from jsonb_array_elements(coalesce(payload->'events', '[]'::jsonb)) as auth_event
      where auth_event->>'type' = 'AUTHORIZATION'
      order by auth_event->>'created' desc
      limit 1
    ), 0) as authorization_amount_cents,
    coalesce(
      nullif(abs(nullif(payload->>'settled_amount', '')::bigint), 0),
      nullif(abs(nullif(payload->'events'->-1->'amounts'->'settlement'->>'amount', '')::bigint), 0)
    ) as settled_amount_cents,
    payload->>'status' as provider_status
  from latest_event
)
update public.card_transactions as t
set authorization_amount_cents = n.authorization_amount_cents,
    settled_amount_cents = n.settled_amount_cents,
    status = case
      when t.status = 'UNMATCHED_RETURN' then t.status
      else coalesce(n.provider_status, t.status)
    end
from normalized as n
where t.id = n.transaction_id;
