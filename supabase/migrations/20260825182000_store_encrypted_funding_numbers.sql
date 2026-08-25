alter table public.linked_funding_accounts
  add column if not exists encrypted_account_number text,
  add column if not exists encrypted_routing_number text;
