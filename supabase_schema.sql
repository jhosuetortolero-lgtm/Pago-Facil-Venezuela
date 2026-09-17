-- PagoFácil - esquema inicial multi-tenant. Execute no SQL Editor do Supabase.
create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_super_admin boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  zelle_email text,
  pago_movil_phone text,
  pago_movil_bank text,
  pago_movil_id text,
  binance_pay_id text,
  onboarding_status text not null default 'active' check (onboarding_status in ('pending', 'active')),
  exchange_rate_mode text not null default 'automatic' check (exchange_rate_mode in ('automatic', 'manual')),
  manual_exchange_rate numeric(12, 4) check (manual_exchange_rate is null or manual_exchange_rate > 0),
  current_exchange_rate numeric(12, 4) check (current_exchange_rate is null or current_exchange_rate > 0),
  exchange_rate_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 160),
  description text,
  image_url text,
  price_usd numeric(12, 2) not null check (price_usd > 0),
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  customer_name text,
  customer_phone text,
  total_usd numeric(12, 2) not null check (total_usd > 0),
  payment_method text not null check (payment_method in ('zelle', 'pago_movil', 'binance_pay')),
  status text not null default 'pending' check (status in ('pending', 'verified', 'fraud_alert', 'fraud_alert_duplicate', 'manual_review', 'cancelled')),
  payment_reference text,
  payment_proof_path text,
  ocr_data jsonb,
  constraint orders_payment_method_reference_unique unique (payment_method, payment_reference),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_store_id_idx on public.products(store_id);
create index orders_store_id_idx on public.orders(store_id);

create or replace function public.is_store_owner(target_store_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.stores where id = target_store_id and owner_id = (select auth.uid()));
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_super_admin = true and status = 'active');
$$;

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

create policy "profiles_owner_select" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_super_admin());
create policy "profiles_super_admin_update" on public.profiles for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
create policy "profiles_owner_insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()) and is_super_admin = false);

create policy "stores_owner_select" on public.stores for select to authenticated using (owner_id = (select auth.uid()));
create policy "stores_owner_insert" on public.stores for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "stores_owner_update" on public.stores for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "stores_owner_delete" on public.stores for delete to authenticated using (owner_id = (select auth.uid()));
create policy "stores_super_admin_select" on public.stores for select to authenticated using (public.is_super_admin());
create policy "stores_super_admin_update" on public.stores for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy "products_owner_select" on public.products for select to authenticated using (public.is_store_owner(store_id));
create policy "products_owner_insert" on public.products for insert to authenticated with check (public.is_store_owner(store_id));
create policy "products_owner_update" on public.products for update to authenticated using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "products_owner_delete" on public.products for delete to authenticated using (public.is_store_owner(store_id));
create policy "products_super_admin_select" on public.products for select to authenticated using (public.is_super_admin());

create policy "orders_owner_select" on public.orders for select to authenticated using (public.is_store_owner(store_id));
create policy "orders_owner_update" on public.orders for update to authenticated using (public.is_store_owner(store_id)) with check (public.is_store_owner(store_id));
create policy "orders_super_admin_select" on public.orders for select to authenticated using (public.is_super_admin());
create policy "orders_super_admin_update" on public.orders for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- A vitrine consulta apenas campos públicos e nunca expõe owner_id.
create or replace function public.get_storefront(requested_slug text)
returns table (store_name text, store_slug text, product_id uuid, product_name text, product_description text, price_usd numeric, zelle_email text, pago_movil_phone text, pago_movil_bank text, pago_movil_id text, binance_pay_id text)
language sql security definer set search_path = public stable as $$
  select s.name, s.slug, p.id, p.name, p.description, p.price_usd, s.zelle_email, s.pago_movil_phone, s.pago_movil_bank, s.pago_movil_id, s.binance_pay_id
  from public.stores s
  left join public.products p on p.store_id = s.id and p.is_active = true
  join public.profiles owner_profile on owner_profile.id = s.owner_id and owner_profile.status = 'active'
  where s.slug = requested_slug;
$$;
revoke all on function public.get_storefront(text) from public;
grant execute on function public.get_storefront(text) to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;

-- Pedidos serão inseridos por backend protegido na Fase 3, não diretamente pelo cliente.
revoke all on public.stores, public.products, public.orders from anon;
grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, update on public.orders to authenticated;

-- Comprovantes privados; somente o backend com service role faz upload/leitura.
insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger stores_set_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
