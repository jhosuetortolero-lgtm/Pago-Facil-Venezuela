-- Persists the exact VES conversion used by Pago Movil orders.
alter table public.orders
  add column if not exists exchange_rate_used numeric(18, 6),
  add column if not exists total_ves numeric(18, 2);

alter table public.orders
  drop constraint if exists orders_exchange_rate_used_positive;
alter table public.orders
  add constraint orders_exchange_rate_used_positive
  check (exchange_rate_used is null or exchange_rate_used > 0);

alter table public.orders
  drop constraint if exists orders_total_ves_positive;
alter table public.orders
  add constraint orders_total_ves_positive
  check (total_ves is null or total_ves > 0);

-- Existing Pago Movil orders may predate these audit columns, so the migration
-- leaves them nullable. The transactional checkout RPC below requires both
-- values for every new Pago Movil order.
alter table public.orders
  drop constraint if exists orders_pago_movil_exchange_snapshot;

comment on column public.orders.exchange_rate_used is
  'USD/VES rate frozen when the order was created.';
comment on column public.orders.total_ves is
  'VES total frozen when the order was created.';

-- Expose only the public exchange-rate configuration required by checkout.
drop function if exists public.get_storefront(text);
create function public.get_storefront(requested_slug text)
returns table (
  store_name text,
  store_slug text,
  product_id uuid,
  product_name text,
  product_description text,
  price_usd numeric,
  zelle_email text,
  pago_movil_phone text,
  pago_movil_bank text,
  pago_movil_id text,
  binance_pay_id text,
  exchange_rate_mode text,
  manual_exchange_rate numeric,
  current_exchange_rate numeric,
  exchange_rate_updated_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    store.name,
    store.slug,
    product.id,
    product.name,
    product.description,
    product.price_usd,
    store.zelle_email,
    store.pago_movil_phone,
    store.pago_movil_bank,
    store.pago_movil_id,
    store.binance_pay_id,
    store.exchange_rate_mode,
    store.manual_exchange_rate,
    store.current_exchange_rate,
    store.exchange_rate_updated_at
  from public.stores as store
  left join public.products as product
    on product.store_id = store.id
   and product.is_active = true
  join public.profiles as owner_profile
    on owner_profile.id = store.owner_id
   and owner_profile.status = 'active'
  where store.slug = requested_slug;
$$;
revoke all on function public.get_storefront(text) from public;
grant execute on function public.get_storefront(text) to anon, authenticated;

-- Replace the previous checkout RPC so inventory, line items and the currency
-- snapshot are committed in one database transaction.
drop function if exists public.create_order_with_items(
  uuid, text, text, text, text, jsonb, numeric, jsonb
);
drop function if exists public.create_order_with_items(
  uuid, text, text, text, text, jsonb, numeric, numeric, numeric, jsonb
);

create function public.create_order_with_items(
  p_store_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_payment_method text,
  p_payment_reference text,
  p_ocr_data jsonb,
  p_expected_total_usd numeric,
  p_exchange_rate_used numeric,
  p_total_ves numeric,
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
  v_exchange_rate_used numeric(18, 6);
  v_total_ves numeric(18, 2);
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

  if p_payment_method = 'pago_movil' then
    if p_exchange_rate_used is null or p_exchange_rate_used <= 0
      or p_total_ves is null or p_total_ves <= 0 then
      raise exception using errcode = 'P0001', message = 'INVALID_EXCHANGE_SNAPSHOT';
    end if;

    v_exchange_rate_used := round(p_exchange_rate_used, 6);
    v_total_ves := round(v_total_usd * v_exchange_rate_used, 2);
    if round(p_total_ves, 2) <> v_total_ves then
      raise exception using errcode = 'P0001', message = 'EXCHANGE_TOTAL_CHANGED';
    end if;
  elsif p_exchange_rate_used is not null or p_total_ves is not null then
    raise exception using errcode = 'P0001', message = 'UNEXPECTED_EXCHANGE_SNAPSHOT';
  end if;

  insert into public.orders (
    store_id,
    customer_name,
    customer_phone,
    total_usd,
    exchange_rate_used,
    total_ves,
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
    v_exchange_rate_used,
    v_total_ves,
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
  uuid, text, text, text, text, jsonb, numeric, numeric, numeric, jsonb
) from public, anon, authenticated;
grant execute on function public.create_order_with_items(
  uuid, text, text, text, text, jsonb, numeric, numeric, numeric, jsonb
) to service_role;
