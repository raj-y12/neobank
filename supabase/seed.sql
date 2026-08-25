insert into public.businesses (id, legal_name, status) values ('demo-business', 'Northstar Labs, Inc.', 'APPROVED') on conflict (id) do update set status = excluded.status;
insert into public.business_members (id, business_id, role) values ('member-raj', 'demo-business', 'ADMIN'), ('member-aya', 'demo-business', 'MEMBER') on conflict (id) do nothing;
insert into public.onboarding_verifications (business_id, provider, provider_reference, subject_type, status) values
  ('demo-business', 'persona', 'inq_demo_business', 'BUSINESS', 'APPROVED'),
  ('demo-business', 'persona', 'inq_demo_owner', 'OWNER', 'APPROVED')
on conflict (business_id, subject_type) do update set status = excluded.status;
insert into public.linked_funding_accounts (id, business_id, account_id, provider, provider_item_id, encrypted_access_token, institution_name, account_mask)
values ('00000000-0000-0000-0000-000000000001', 'demo-business', 'demo-account', 'plaid-simulated', 'item-demo', 'SIMULATED_TOKEN_NOT_A_PLAID_CREDENTIAL', 'Chase', '4821')
on conflict (id) do nothing;
insert into public.reconciliation_files (business_id, provider, file_reference) values ('demo-business', 'column-simulated', 'file-demo-2026-08-25') on conflict do nothing;
