insert into public.businesses (id, legal_name, status) values ('demo-business', 'Northstar Labs, Inc.', 'APPROVED') on conflict (id) do update set status = excluded.status;
insert into public.business_members (id, business_id, first_name, last_name, role) values ('member-raj', 'demo-business', 'Raj', 'Yendamuri', 'ADMIN'), ('member-aya', 'demo-business', 'Aya', 'Chen', 'MEMBER') on conflict (id) do update set first_name = excluded.first_name, last_name = excluded.last_name;
insert into public.onboarding_verifications (business_id, provider, provider_reference, subject_type, status) values
  ('demo-business', 'persona', 'inq_demo_business', 'BUSINESS', 'APPROVED'),
  ('demo-business', 'persona', 'inq_demo_owner', 'OWNER', 'APPROVED')
on conflict (business_id, subject_type) do update set status = excluded.status;
insert into public.linked_funding_accounts (id, business_id, account_id, provider, provider_item_id, provider_access_token, encrypted_account_number, encrypted_routing_number, institution_name, account_name, account_mask)
values ('00000000-0000-0000-0000-000000000001', 'demo-business', 'demo-account', 'PLAID', 'item-demo', 'SIMULATED:c2VlZC1wbGFpZC1pdGVt', 'SIMULATED:MTIzNDU2Nzg5', 'SIMULATED:MTAxMDUwMDAx', 'Chase Sandbox', 'Business Checking', '4821')
on conflict (id) do nothing;
insert into public.reconciliation_files (business_id, provider, file_reference) values ('demo-business', 'column-simulated', 'file-demo-2026-08-25') on conflict do nothing;

insert into public.funding_transfers (id, business_id, account_id, linked_funding_account_id, provider, provider_transfer_id, amount_cents, currency, status, settled_at, idempotency_key)
values ('00000000-0000-0000-0000-000000000010', 'demo-business', 'demo-account', '00000000-0000-0000-0000-000000000001', 'INCREASE', 'ach_demo_inbound_001', 50000, 'USD', 'SETTLED', now(), 'seed:funding:demo-business:001')
on conflict (id) do nothing;

insert into public.payments (id, business_id, account_id, initiator_member_id, provider, amount_cents, currency, rail, recipient, status, idempotency_key)
values ('00000000-0000-0000-0000-000000000020', 'demo-business', 'demo-account', 'member-aya', 'INCREASE', 124000, 'USD', 'ACH', '{"name":"Sandbox Supplier","accountNumber":"0000000000","routingNumber":"000000000"}', 'PENDING_APPROVAL', 'seed:payment:demo-business:001')
on conflict (id) do nothing;

insert into public.business_cards (business_id, card_token, member_id, provider, status)
values ('demo-business', 'simulated-card-demo-001', 'member-aya', 'LITHIC_SIMULATED', 'ASSIGNED')
on conflict (card_token) do nothing;

insert into public.card_transactions (id, provider, provider_transaction_id, card_token, status, authorization_amount_cents, settled_amount_cents, value_date, booking_date)
values ('00000000-0000-0000-0000-000000000030', 'LITHIC_SIMULATED', 'txn_demo_card_001', 'simulated-card-demo-001', 'SETTLED', 5000, 7340, current_date, current_date)
on conflict (id) do nothing;

insert into public.journal_entries (entry_type, value_date, booking_date, reference_id, idempotency_key, business_id, account_id)
select 'OPENING_BALANCE', current_date, current_date, 'seed-opening-demo', 'seed:opening:demo-business', 'demo-business', 'demo-account'
where not exists (select 1 from public.journal_entries where idempotency_key = 'seed:opening:demo-business')
returning id;

insert into public.journal_postings (journal_entry_id, account_code, debit_cents, credit_cents)
select e.id, p.account_code, p.debit_cents, p.credit_cents
from public.journal_entries e
cross join (values ('SAFEGUARDED_CASH', 100000, 0), ('CUSTOMER_AVAILABLE', 0, 100000)) as p(account_code, debit_cents, credit_cents)
where e.idempotency_key = 'seed:opening:demo-business'
  and not exists (select 1 from public.journal_postings jp where jp.journal_entry_id = e.id);

insert into public.journal_entries (entry_type, value_date, booking_date, reference_id, idempotency_key, business_id, account_id)
select 'FUNDING_SETTLED', current_date, current_date, 'ach_demo_inbound_001', 'seed:funding-entry:demo-business:001', 'demo-business', 'demo-account'
where not exists (select 1 from public.journal_entries where idempotency_key = 'seed:funding-entry:demo-business:001')
returning id;

insert into public.journal_postings (journal_entry_id, account_code, debit_cents, credit_cents)
select e.id, p.account_code, p.debit_cents, p.credit_cents
from public.journal_entries e
cross join (values ('SAFEGUARDED_CASH', 50000, 0), ('CUSTOMER_AVAILABLE', 0, 50000)) as p(account_code, debit_cents, credit_cents)
where e.idempotency_key = 'seed:funding-entry:demo-business:001'
  and not exists (select 1 from public.journal_postings jp where jp.journal_entry_id = e.id);
