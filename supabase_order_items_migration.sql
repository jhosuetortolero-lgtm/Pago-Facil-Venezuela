-- Atomic checkout inventory and line-item migration.
create table if not exists public.order_items (
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric(12, 2) not null check (price > 0),
  primary key (order_id, product_id)
);

comment on column public.order_items.price is
  'Unit price snapshot at the moment the order is created.';

create index if not exists order_items_product_id_idx
  on public.order_items(product_id);

alter table public.order_items enable row level security;

drop policy if exists "order_items_owner_select" on public.order_items;
create policy "order_items_owner_select"
on public.order_items for select to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and public.is_store_owner(orders.store_id)
  )
);

drop policy if exists "order_items_super_admin_select" on public.order_items;
create policy "order_items_super_admin_select"
on public.order_items for select to authenticated
using (public.is_super_admin());

revoke all on public.order_items from anon, authenticated;
grant select on public.order_items to authenticated;

create or replace function public.create_order_with_items(
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method text,
  p_payment_reference text,
  p_ocr_data jsonb,
  p_expected_total_usd numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item_count integer;
  v_product_count integer;
  v_total_usd numeric(12, 2);
  v_order_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = 'P0001', message = 'INVALID_CART';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 100 then
    raise exception using errcode = 'P0001', message = 'INVALID_CART';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id text, quantity numeric)
    where item.product_id is null
      or item.product_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or item.quantity is null
      or item.quantity <> trunc(item.quantity)
      or item.quantity < 1
      or item.quantity > 999
  ) then
    raise exception using errcode = 'P0001', message = 'INVALID_CART';
  end if;

  if (
    select count(distinct item.product_id)
    from jsonb_to_recordset(p_items) as item(product_id text, quantity numeric)
  ) <> v_item_count then
    raise exception using errcode = 'P0001', message = 'DUPLICATE_CART_ITEM';
  end if;

  -- Lock in a deterministic order so concurrent checkouts cannot oversell.
  perform product.id
  from public.products as product
  join jsonb_to_recordset(p_items) as item(product_id text, quantity numeric)
    on product.id = item.product_id::uuid
  where product.store_id = p_store_id
    and product.is_active = true
  order by product.id
  for update of product;

  select count(*)
  into v_product_count
  from public.products as product
  join jsonb_to_recordset(p_items) as item(product_id text, quantity numeric)
    on product.id = item.product_id::uuid
  where product.store_id = p_store_id
    and product.is_active = true;

  if v_product_count <> v_item_count then
    raise exception using errcode = 'P0001', message = 'PRODUCT_UNAVAILABLE';
  end if;

  if exists (
    select 1
    from public.products as product
    join jsonb_to_recordset(p_items) as item(product_id text, quantity numeric)
      on product.id = item.product_id::uuid
    where product.store_id = p_store_id
      and product.stock < item.quantity
  ) then
    raise exception using errcode = 'P0001', message = 'INSUFFICIENT_STOCK';
  end if;

  select round(sum(product.price_usd * item.quantity), 2)::numeric(12, 2)
  into v_total_usd
  from public.products as product
  join jsonb_to_recordset(p_items) as item(product_id text, quantity numeric)
    on product.id = item.product_id::uuid
  where product.store_id = p_store_id;

  if p_expected_total_usd is null
    or round(p_expected_total_usd, 2) <> v_total_usd then
    raise exception using errcode = 'P0001', message = 'PRICE_CHANGED';
  end if;

  insert into public.orders (
    store_id,
    customer_name,
    customer_phone,
    total_usd,
    payment_method,
    payment_reference,
    ocr_data,
    status
  )
  values (
    p_store_id,
    nullif(trim(p_customer_name), ''),
    p_customer_phone,
    v_total_usd,
    p_payment_method,
    p_payment_reference,
    p_ocr_data,
    'pending'
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, product_id, quantity, price)
  select
    v_order_id,
    product.id,
    item.quantity::integer,
    product.price_usd
  from public.products as product
  join jsonb_to_recordset(p_items) as item(product_id text, quantity numeric)
    on product.id = item.product_id::uuid
  where product.store_id = p_store_id;

  update public.products as product
  set stock = product.stock - item.quantity::integer
  from jsonb_to_recordset(p_items) as item(product_id text, quantity numeric)
  where product.id = item.product_id::uuid
    and product.store_id = p_store_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_order_with_items(
  uuid, text, text, text, text, jsonb, numeric, jsonb
) from public, anon, authenticated;
grant execute on function public.create_order_with_items(
  uuid, text, text, text, text, jsonb, numeric, jsonb
) to service_role;
