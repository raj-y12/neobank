-- Close the RLS gaps on application tables that contain onboarding,
-- funding, provider-event, and reconciliation data.

drop policy if exists business_onboarding_member_read on public.business_onboarding;
create policy business_onboarding_member_read
on public.business_onboarding
for select
to authenticated
using (
  exists (
    select 1 from public.business_memberships membership
    where membership.business_id = business_onboarding.business_id
      and membership.user_id = (select auth.uid())
  )
);

drop policy if exists linked_funding_accounts_member_read on public.linked_funding_accounts;
create policy linked_funding_accounts_member_read
on public.linked_funding_accounts
for select
to authenticated
using (
  exists (
    select 1 from public.business_memberships membership
    where membership.business_id = linked_funding_accounts.business_id
      and membership.user_id = (select auth.uid())
  )
);

drop policy if exists payment_events_member_read on public.payment_events;
create policy payment_events_member_read
on public.payment_events
for select
to authenticated
using (
  exists (
    select 1
    from public.payments payment
    join public.business_memberships membership on membership.business_id = payment.business_id
    where payment.id = payment_events.payment_id
      and membership.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.funding_transfers funding
    join public.business_memberships membership on membership.business_id = funding.business_id
    where funding.id = payment_events.funding_transfer_id
      and membership.user_id = (select auth.uid())
  )
);

drop policy if exists reconciliation_files_member_read on public.reconciliation_files;
create policy reconciliation_files_member_read
on public.reconciliation_files
for select
to authenticated
using (
  exists (
    select 1 from public.business_memberships membership
    where membership.business_id = reconciliation_files.business_id
      and membership.user_id = (select auth.uid())
  )
);

alter function public.prevent_hold_reactivation() set search_path = public, pg_temp;
alter function public.reject_ledger_mutation() set search_path = public, pg_temp;
alter function public.record_journal_entry(text, date, text, text, text, text, text, jsonb)
  set search_path = public, pg_temp;
