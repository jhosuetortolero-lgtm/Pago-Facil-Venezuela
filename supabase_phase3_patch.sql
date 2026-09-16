-- Migração idempotente para um banco que já recebeu o schema inicial.
alter table public.stores add column if not exists binance_pay_id text;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  is_super_admin boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and is_super_admin = true and status = 'active');
$$;
drop policy if exists "profiles_owner_select" on public.profiles;
create policy "profiles_owner_select" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_super_admin());
drop policy if exists "profiles_super_admin_update" on public.profiles;
create policy "profiles_super_admin_update" on public.profiles for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert" on public.profiles for insert to authenticated with check (id = (select auth.uid()) and is_super_admin = false);
drop policy if exists "stores_super_admin_select" on public.stores;
create policy "stores_super_admin_select" on public.stores for select to authenticated using (public.is_super_admin());
drop policy if exists "stores_super_admin_update" on public.stores;
create policy "stores_super_admin_update" on public.stores for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists "products_super_admin_select" on public.products;
create policy "products_super_admin_select" on public.products for select to authenticated using (public.is_super_admin());
drop policy if exists "orders_super_admin_select" on public.orders;
create policy "orders_super_admin_select" on public.orders for select to authenticated using (public.is_super_admin());
drop policy if exists "orders_super_admin_update" on public.orders;
create policy "orders_super_admin_update" on public.orders for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
grant select, insert, update on public.profiles to authenticated;
alter table public.orders add column if not exists payment_proof_path text;
alter table public.orders add column if not exists ocr_data jsonb;
drop index if exists public.orders_store_reference_unique_idx;
alter table public.orders drop constraint if exists orders_payment_method_reference_unique;
alter table public.orders add constraint orders_payment_method_reference_unique unique (payment_method, payment_reference);
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('zelle', 'pago_movil', 'binance_pay'));
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in ('pending', 'verified', 'fraud_alert', 'fraud_alert_duplicate', 'manual_review', 'cancelled'));
insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do update set public = false;

drop function if exists public.get_storefront(text);
create function public.get_storefront(requested_slug text)
returns table (store_name text, store_slug text, product_id uuid, product_name text, product_description text, price_usd numeric, zelle_email text, pago_movil_phone text, pago_movil_bank text, pago_movil_id text, binance_pay_id text)
language sql security definer set search_path = public stable as $$
  select s.name, s.slug, p.id, p.name, p.description, p.price_usd, s.zelle_email, s.pago_movil_phone, s.pago_movil_bank, s.pago_movil_id, s.binance_pay_id
  from public.stores s left join public.products p on p.store_id = s.id and p.is_active = true
  join public.profiles owner_profile on owner_profile.id = s.owner_id and owner_profile.status = 'active'
  where s.slug = requested_slug;
$$;
revoke all on function public.get_storefront(text) from public;
grant execute on function public.get_storefront(text) to anon, authenticated;
