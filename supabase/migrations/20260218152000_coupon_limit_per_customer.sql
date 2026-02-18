-- Coupon usage limit per customer.
-- Adds per-coupon limit, tracks redemptions, and enforces limits on validation/order creation.

alter table public.coupons
  add column if not exists max_uses_per_customer integer not null default 1;

update public.coupons
set max_uses_per_customer = 1
where max_uses_per_customer is null
   or max_uses_per_customer <= 0;

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

alter table public.orders
  add column if not exists coupon_code text;

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
