-- Add customer profile address fields and allow delivery address update before separation.

alter table public.profiles
  add column if not exists phone text not null default '',
  add column if not exists cpf text not null default '',
  add column if not exists address text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '',
  add column if not exists zip_code text not null default '';

create or replace function public.update_order_delivery_address(
  p_order_id text,
  p_customer_address text,
  p_customer_city text,
  p_customer_state text,
  p_customer_zip_code text
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
    customer_city = trim(p_customer_city),
    customer_state = upper(trim(p_customer_state)),
    customer_zip_code = trim(p_customer_zip_code)
  where id = p_order_id;
end;
$$;

grant execute on function public.update_order_delivery_address(text, text, text, text, text)
to authenticated;
