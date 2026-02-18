-- Nuvle schema for Supabase (run in SQL Editor)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text not null default '',
  cpf text not null default '',
  address text not null default '',
  address_number text not null default '',
  address_complement text not null default '',
  reference_point text not null default '',
  city text not null default '',
  state text not null default '',
  zip_code text not null default '',
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default timezone('utc', now())
);

-- Ensure new columns exist in projects created before this version.
alter table public.profiles
  add column if not exists phone text not null default '',
  add column if not exists cpf text not null default '',
  add column if not exists address text not null default '',
  add column if not exists address_number text not null default '',
  add column if not exists address_complement text not null default '',
  add column if not exists reference_point text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '',
  add column if not exists zip_code text not null default '';

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

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;

  if not public.is_admin() then
    raise exception 'Sem permissao';
  end if;

  if p_user_id is null then
    raise exception 'Usuario invalido';
  end if;

  if auth.uid() = p_user_id then
    raise exception 'Nao e permitido excluir seu proprio usuario';
  end if;

  delete from auth.users
  where id = p_user_id;

  if not found then
    raise exception 'Usuario nao encontrado';
  end if;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

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
with check (
  id = auth.uid()
  and role = 'customer'
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role = 'customer'
  )
);

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
  is_featured boolean not null default false,
  image text not null,
  images text[],
  category_id text not null references public.categories(id),
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Ensure new columns exist in projects created before this version.
alter table public.products
  add column if not exists images text[],
  add column if not exists is_featured boolean not null default false;

update public.products
set images = array[image]
where images is null;

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

drop policy if exists product_sizes_write_admin on public.product_sizes;
create policy product_sizes_write_admin
on public.product_sizes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Store settings
-- ---------------------------------------------------------------------------
create table if not exists public.store_settings (
  id integer primary key,
  whatsapp_label text not null,
  whatsapp_url text not null,
  contact_email text not null,
  contact_handle text not null,
  show_contact_whatsapp boolean not null default true,
  show_contact_email boolean not null default true,
  show_contact_handle boolean not null default true,
  show_social_icons boolean not null default true,
  show_social_tiktok boolean not null default true,
  show_social_instagram boolean not null default true,
  show_social_x boolean not null default true,
  show_social_facebook boolean not null default true,
  show_social_whatsapp boolean not null default true,
  show_social_linkedin boolean not null default true,
  tiktok_url text not null default '',
  instagram_url text not null default '',
  x_url text not null default '',
  facebook_url text not null default '',
  whatsapp_social_url text not null default '',
  linkedin_url text not null default ''
);

-- Ensure new columns exist in projects created before this version.
alter table public.store_settings
  add column if not exists show_contact_whatsapp boolean not null default true,
  add column if not exists show_contact_email boolean not null default true,
  add column if not exists show_contact_handle boolean not null default true,
  add column if not exists show_social_icons boolean not null default true,
  add column if not exists show_social_tiktok boolean not null default true,
  add column if not exists show_social_instagram boolean not null default true,
  add column if not exists show_social_x boolean not null default true,
  add column if not exists show_social_facebook boolean not null default true,
  add column if not exists show_social_whatsapp boolean not null default true,
  add column if not exists show_social_linkedin boolean not null default true;

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
  'nuvleoficial',
  '',
  'https://instagram.com/nuvleoficial',
  '',
  '',
  'https://wa.me/5581988966556',
  ''
)
on conflict (id) do nothing;

-- Remove leading "@" if the project was seeded with an old handle format.
update public.store_settings
set contact_handle = regexp_replace(contact_handle, '^@+', '')
where id = 1;

-- ---------------------------------------------------------------------------
-- Storage (product images)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
  set public = excluded.public;

-- Supabase Storage already ships with RLS enabled on storage.objects.
-- Trying to ALTER this table can fail with "must be owner of table objects".

drop policy if exists "product_images_read" on storage.objects;
create policy "product_images_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "product_images_insert_admin" on storage.objects;
create policy "product_images_insert_admin"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_update_admin" on storage.objects;
create policy "product_images_update_admin"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_delete_admin" on storage.objects;
create policy "product_images_delete_admin"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  code text primary key,
  description text not null default '',
  discount_percentage numeric(5,2) not null check (discount_percentage > 0 and discount_percentage <= 95),
  max_uses_per_customer integer not null default 1 check (max_uses_per_customer > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.coupons
  add column if not exists max_uses_per_customer integer not null default 1;

alter table public.coupons enable row level security;

drop policy if exists coupons_admin_all on public.coupons;
create policy coupons_admin_all
on public.coupons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_code text not null references public.coupons(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists coupon_redemptions_coupon_user_idx
  on public.coupon_redemptions (coupon_code, user_id);

alter table public.coupon_redemptions enable row level security;

drop policy if exists coupon_redemptions_select_owner_or_admin on public.coupon_redemptions;
create policy coupon_redemptions_select_owner_or_admin
on public.coupon_redemptions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists coupon_redemptions_write_admin on public.coupon_redemptions;
create policy coupon_redemptions_write_admin
on public.coupon_redemptions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.validate_coupon(p_code text)
returns table (
  code text,
  description text,
  discount_percentage numeric,
  max_uses_per_customer integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_code text;
  coupon_limit integer;
  customer_uses integer;
  current_user_id uuid;
begin
  normalized_code := upper(trim(coalesce(p_code, '')));
  if normalized_code = '' then
    return;
  end if;

  select
    c.code,
    c.description,
    c.discount_percentage,
    c.max_uses_per_customer
  into
    code,
    description,
    discount_percentage,
    max_uses_per_customer
  from public.coupons c
  where c.is_active = true
    and upper(trim(c.code)) = normalized_code
  limit 1;

  if not found then
    return;
  end if;

  current_user_id := auth.uid();
  coupon_limit := coalesce(max_uses_per_customer, 1);

  if current_user_id is not null then
    select count(*)
    into customer_uses
    from public.coupon_redemptions cr
    where cr.coupon_code = code
      and cr.user_id = current_user_id;

    if customer_uses >= coupon_limit then
      raise exception 'Limite de uso deste cupom por cliente foi atingido.';
    end if;
  end if;

  return next;
  return;
end;
$$;

grant execute on function public.validate_coupon(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin logs
-- ---------------------------------------------------------------------------
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  scope text not null check (
    scope in ('system', 'product', 'category', 'stock', 'order', 'settings', 'coupon')
  ),
  action text not null,
  description text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  actor_email text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.admin_logs enable row level security;

drop policy if exists admin_logs_admin_all on public.admin_logs;
create policy admin_logs_admin_all
on public.admin_logs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Favorites
-- ---------------------------------------------------------------------------
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
  coupon_code text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_cpf text not null,
  customer_address text not null,
  customer_address_number text not null default '',
  customer_address_complement text not null default '',
  customer_reference_point text not null default '',
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

-- Ensure new columns exist in projects created before this version.
alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists customer_address_number text not null default '',
  add column if not exists customer_address_complement text not null default '',
  add column if not exists customer_reference_point text not null default '';

create or replace function public.create_order_with_stock(
  p_order_id text,
  p_user_id uuid,
  p_created_at timestamptz,
  p_status text,
  p_payment_method text,
  p_total numeric,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_cpf text,
  p_customer_address text,
  p_customer_address_number text,
  p_customer_address_complement text,
  p_customer_reference_point text,
  p_customer_city text,
  p_customer_state text,
  p_customer_zip_code text,
  p_items jsonb,
  p_coupon_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item_record record;
  normalized_size text;
  normalized_coupon_code text;
  coupon_limit integer;
  customer_coupon_uses integer;
  requested_quantity integer;
  current_stock integer;
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;

  if p_user_id is null then
    raise exception 'Usuario do pedido obrigatorio';
  end if;

  if auth.uid() <> p_user_id and not public.is_admin() then
    raise exception 'Sem permissao para criar pedido para outro usuario';
  end if;

  normalized_coupon_code := upper(trim(coalesce(p_coupon_code, '')));
  if normalized_coupon_code = '' then
    normalized_coupon_code := null;
  end if;

  if normalized_coupon_code is not null then
    select c.max_uses_per_customer
    into coupon_limit
    from public.coupons c
    where c.code = normalized_coupon_code
      and c.is_active = true
    limit 1;

    if coupon_limit is null then
      raise exception 'Cupom invalido ou desativado.';
    end if;

    select count(*)
    into customer_coupon_uses
    from public.coupon_redemptions cr
    where cr.coupon_code = normalized_coupon_code
      and cr.user_id = p_user_id;

    if customer_coupon_uses >= coupon_limit then
      raise exception 'Limite de uso deste cupom por cliente foi atingido.';
    end if;
  end if;

  for item_record in
    select
      (entry ->> 'product_id')::text as product_id,
      coalesce((entry ->> 'size')::text, 'UN') as size,
      coalesce((entry ->> 'quantity')::int, 0) as quantity
    from jsonb_array_elements(p_items) as entry
  loop
    normalized_size := upper(trim(item_record.size));
    requested_quantity := item_record.quantity;

    if item_record.product_id is null or item_record.product_id = '' then
      raise exception 'Produto invalido no pedido';
    end if;

    if requested_quantity <= 0 then
      raise exception 'Quantidade invalida para produto %', item_record.product_id;
    end if;

    select ps.stock
    into current_stock
    from public.product_sizes ps
    where ps.product_id = item_record.product_id
      and ps.size = normalized_size
    for update;

    if current_stock is null then
      raise exception 'Sem estoque para produto % no tamanho %', item_record.product_id, normalized_size;
    end if;

    if current_stock < requested_quantity then
      raise exception 'Estoque insuficiente para produto % no tamanho %', item_record.product_id, normalized_size;
    end if;
  end loop;

  insert into public.orders (
    id,
    user_id,
    created_at,
    status,
    payment_method,
    total,
    coupon_code,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    customer_address,
    customer_address_number,
    customer_address_complement,
    customer_reference_point,
    customer_city,
    customer_state,
    customer_zip_code
  )
  values (
    p_order_id,
    p_user_id,
    coalesce(p_created_at, timezone('utc', now())),
    p_status,
    p_payment_method,
    p_total,
    normalized_coupon_code,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_customer_cpf,
    p_customer_address,
    coalesce(p_customer_address_number, ''),
    coalesce(p_customer_address_complement, ''),
    coalesce(p_customer_reference_point, ''),
    p_customer_city,
    p_customer_state,
    p_customer_zip_code
  );

  insert into public.order_items (
    order_id,
    product_id,
    name,
    image,
    quantity,
    price,
    size
  )
  select
    p_order_id,
    (entry ->> 'product_id')::text,
    (entry ->> 'name')::text,
    (entry ->> 'image')::text,
    coalesce((entry ->> 'quantity')::int, 1),
    coalesce((entry ->> 'price')::numeric, 0),
    nullif((entry ->> 'size')::text, '')
  from jsonb_array_elements(p_items) as entry;

  update public.product_sizes ps
  set stock = ps.stock - grouped.quantity
  from (
    select
      (entry ->> 'product_id')::text as product_id,
      upper(trim(coalesce((entry ->> 'size')::text, 'UN'))) as size,
      sum(coalesce((entry ->> 'quantity')::int, 0)) as quantity
    from jsonb_array_elements(p_items) as entry
    group by 1, 2
  ) as grouped
  where ps.product_id = grouped.product_id
    and ps.size = grouped.size;

  if normalized_coupon_code is not null then
    insert into public.coupon_redemptions (
      coupon_code,
      user_id,
      order_id
    )
    values (
      normalized_coupon_code,
      p_user_id,
      p_order_id
    )
    on conflict (order_id) do nothing;
  end if;
end;
$$;

grant execute on function public.create_order_with_stock(
  text, uuid, timestamptz, text, text, numeric, text, text, text, text, text, text, text, text, text, text, text, jsonb, text
) to authenticated;

create or replace function public.update_order_delivery_address(
  p_order_id text,
  p_customer_address text,
  p_customer_city text,
  p_customer_state text,
  p_customer_zip_code text,
  p_customer_address_number text default '',
  p_customer_address_complement text default '',
  p_customer_reference_point text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Nao autenticado';
  end if;

  select *
  into target_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido nao encontrado';
  end if;

  if target_order.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Sem permissao para alterar este pedido';
  end if;

  if target_order.status not in ('pending_payment', 'paid') then
    raise exception 'Nao e possivel alterar o endereco de entrega. Pedido ja esta em separacao ou enviado.';
  end if;

  if trim(coalesce(p_customer_address, '')) = '' then
    raise exception 'Endereco de entrega obrigatorio';
  end if;

  if trim(coalesce(p_customer_city, '')) = '' then
    raise exception 'Cidade obrigatoria';
  end if;

  if trim(coalesce(p_customer_state, '')) = '' then
    raise exception 'Estado obrigatorio';
  end if;

  if trim(coalesce(p_customer_zip_code, '')) = '' then
    raise exception 'CEP obrigatorio';
  end if;

  update public.orders
  set
    customer_address = trim(p_customer_address),
    customer_address_number = trim(coalesce(p_customer_address_number, '')),
    customer_address_complement = trim(coalesce(p_customer_address_complement, '')),
    customer_reference_point = trim(coalesce(p_customer_reference_point, '')),
    customer_city = trim(p_customer_city),
    customer_state = upper(trim(p_customer_state)),
    customer_zip_code = trim(p_customer_zip_code)
  where id = p_order_id;
end;
$$;

grant execute on function public.update_order_delivery_address(text, text, text, text, text, text, text, text)
to authenticated;

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
