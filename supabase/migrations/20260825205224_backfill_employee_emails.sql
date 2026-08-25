update public.business_members member
set email = auth_user.email
from auth.users auth_user
where member.auth_user_id = auth_user.id
  and (member.email is null or member.email = '');
