-- Bind Supabase identities to the member records used by payment initiation
-- and maker-checker approvals. Preserve the seeded demo member identifiers so
-- existing demo payments retain their intended initiator.
update public.business_members member
set auth_user_id = membership.user_id,
    role = membership.role
from public.business_memberships membership
where member.business_id = membership.business_id
  and member.auth_user_id is null
  and (
    (member.id = 'member-raj' and membership.role = 'ADMIN')
    or (member.id = 'member-aya' and membership.role = 'MEMBER')
  );

insert into public.business_members (id, business_id, auth_user_id, role)
select
  'member-auth-' || replace(membership.user_id::text, '-', ''),
  membership.business_id,
  membership.user_id,
  membership.role
from public.business_memberships membership
where not exists (
  select 1
  from public.business_members member
  where member.business_id = membership.business_id
    and member.auth_user_id = membership.user_id
)
on conflict (business_id, auth_user_id) do update
set role = excluded.role;
