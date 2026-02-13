insert into public.profiles (id, name, email, role)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1), 'Cliente'),
  u.email,
  'customer'
from auth.users u
on conflict (id) do nothing;

update public.profiles
set role = 'admin'
where email = 'marcelohabm@gmail.com';