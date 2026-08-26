create or replace function public.release_payment_funds(
  p_business_id text,
  p_account_id text,
  p_payment_id text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_amount bigint;
begin
  select sum(p.debit_cents) into v_amount
  from public.journal_entries e
  join public.journal_postings p on p.journal_entry_id = e.id
  where e.idempotency_key = 'payment-reserve:' || p_payment_id
    and e.business_id = p_business_id
    and e.account_id = p_account_id
    and p.account_code = 'CUSTOMER_AVAILABLE';
  if coalesce(v_amount, 0) <= 0 then return null; end if;
  return public.record_journal_entry(
    'PAYMENT_RESERVATION_RELEASE', current_date, p_payment_id, p_payment_id,
    'payment-release:' || p_payment_id, p_business_id, p_account_id,
    jsonb_build_array(
      jsonb_build_object('accountCode', 'CUSTOMER_AVAILABLE', 'debitCents', 0, 'creditCents', v_amount),
      jsonb_build_object('accountCode', 'CUSTOMER_PAYMENT_HOLDS', 'debitCents', v_amount, 'creditCents', 0)
    )
  );
end;
$$;

revoke all on function public.release_payment_funds(text, text, text) from public, anon, authenticated;
grant execute on function public.release_payment_funds(text, text, text) to service_role;
