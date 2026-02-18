-- Add address complement/reference fields for profiles and orders.
-- Also add overloaded RPC/functions to persist these fields.

alter table public.profiles
  add column if not exists address_number text not null default '',
  add column if not exists address_complement text not null default '',
  add column if not exists reference_point text not null default '';

alter table public.orders
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
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item_record record;
  normalized_size text;
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
end;
$$;

grant execute on function public.create_order_with_stock(
  text, uuid, timestamptz, text, text, numeric, text, text, text, text, text, text, text, text, text, text, text, jsonb
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
