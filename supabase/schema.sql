-- Nuvle schema for Supabase (run in SQL Editor)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1), 'Cliente'),
    new.email,
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key,
  label text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id text primary key,
  name text not null,
  price numeric(12,2) not null check (price > 0),
  original_price numeric(12,2),
  discount_percentage numeric(5,2) check (discount_percentage is null or (discount_percentage >= 0 and discount_percentage <= 95)),
  image text not null,
  category_id text not null references public.categories(id),
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.product_sizes (
  product_id text not null references public.products(id) on delete cascade,
  size text not null,
  stock integer not null default 0 check (stock >= 0),
  width_cm numeric(8,2) not null default 0,
  length_cm numeric(8,2) not null default 0,
  sleeve_cm numeric(8,2) not null default 0,
  primary key (product_id, size)
);

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_sizes enable row level security;

drop policy if exists categories_read_public on public.categories;
create policy categories_read_public
on public.categories
for select
to anon, authenticated
using (true);

drop policy if exists categories_write_admin on public.categories;
create policy categories_write_admin
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists products_read_public on public.products;
create policy products_read_public
on public.products
for select
to anon, authenticated
using (true);

drop policy if exists products_write_admin on public.products;
create policy products_write_admin
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists product_sizes_read_public on public.product_sizes;
create policy product_sizes_read_public
on public.product_sizes
for select
to anon, authenticated
using (true);

drop policy if exists product_sizes_insert_delete_admin on public.product_sizes;
create policy product_sizes_insert_delete_admin
on public.product_sizes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists product_sizes_update_authenticated on public.product_sizes;
create policy product_sizes_update_authenticated
on public.product_sizes
for update
to authenticated
using (true)
with check (stock >= 0);

-- ---------------------------------------------------------------------------
-- Store settings
-- ---------------------------------------------------------------------------
create table if not exists public.store_settings (
  id integer primary key,
  whatsapp_label text not null,
  whatsapp_url text not null,
  contact_email text not null,
  contact_handle text not null,
  tiktok_url text not null default '',
  instagram_url text not null default '',
  x_url text not null default '',
  facebook_url text not null default '',
  whatsapp_social_url text not null default '',
  linkedin_url text not null default ''
);

alter table public.store_settings enable row level security;

drop policy if exists store_settings_read_public on public.store_settings;
create policy store_settings_read_public
on public.store_settings
for select
to anon, authenticated
using (true);

drop policy if exists store_settings_write_admin on public.store_settings;
create policy store_settings_write_admin
on public.store_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.store_settings (
  id,
  whatsapp_label,
  whatsapp_url,
  contact_email,
  contact_handle,
  tiktok_url,
  instagram_url,
  x_url,
  facebook_url,
  whatsapp_social_url,
  linkedin_url
)
values (
  1,
  '(81) 98896-6556',
  'https://wa.me/5581988966556',
  'nuvleoficial@gmail.com',
  '@nuvleoficial',
  '',
  'https://instagram.com/nuvleoficial',
  '',
  '',
  'https://wa.me/5581988966556',
  ''
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  status text not null check (status in ('pending_payment', 'paid', 'preparing', 'shipped', 'delivered')),
  payment_method text not null check (payment_method in ('pix', 'credit', 'debit')),
  total numeric(12,2) not null check (total >= 0),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_cpf text not null,
  customer_address text not null,
  customer_city text not null,
  customer_state text not null,
  customer_zip_code text not null
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null,
  name text not null,
  image text not null,
  quantity integer not null check (quantity > 0),
  price numeric(12,2) not null check (price >= 0),
  size text
);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists orders_select_owner_or_admin on public.orders;
create policy orders_select_owner_or_admin
on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists orders_insert_owner on public.orders;
create policy orders_insert_owner
on public.orders
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists orders_delete_admin on public.orders;
create policy orders_delete_admin
on public.orders
for delete
to authenticated
using (public.is_admin());

drop policy if exists order_items_select_owner_or_admin on public.order_items;
create policy order_items_select_owner_or_admin
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists order_items_insert_owner_or_admin on public.order_items;
create policy order_items_insert_owner_or_admin
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists order_items_delete_admin on public.order_items;
create policy order_items_delete_admin
on public.order_items
for delete
to authenticated
using (public.is_admin());
