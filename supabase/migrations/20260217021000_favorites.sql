create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, product_id)
);

alter table public.favorites enable row level security;

drop policy if exists favorites_select_owner_or_admin on public.favorites;
create policy favorites_select_owner_or_admin
on public.favorites
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists favorites_insert_owner on public.favorites;
create policy favorites_insert_owner
on public.favorites
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists favorites_delete_owner_or_admin on public.favorites;
create policy favorites_delete_owner_or_admin
on public.favorites
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());
