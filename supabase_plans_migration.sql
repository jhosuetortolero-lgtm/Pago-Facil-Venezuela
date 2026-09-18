-- Planos SaaS e assinaturas do PagoFácil.
-- Execute no SQL Editor do Supabase depois do schema inicial.

alter table public.stores add column if not exists onboarding_status text not null default 'active';
alter table public.stores drop constraint if exists stores_onboarding_status_check;
alter table public.stores add constraint stores_onboarding_status_check check (onboarding_status in ('pending', 'active'));

alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists stock integer not null default 0;
alter table public.products drop constraint if exists products_stock_check;
alter table public.products add constraint products_stock_check check (stock >= 0);

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product_images_owner_insert" on storage.objects;
create policy "product_images_owner_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and exists (select 1 from public.stores where id = (storage.foldername(name))[1]::uuid and owner_id = (select auth.uid())));

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update" on storage.objects for update to authenticated
using (bucket_id = 'product-images' and exists (select 1 from public.stores where id = (storage.foldername(name))[1]::uuid and owner_id = (select auth.uid())))
with check (bucket_id = 'product-images' and exists (select 1 from public.stores where id = (storage.foldername(name))[1]::uuid and owner_id = (select auth.uid())));

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete" on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and exists (select 1 from public.stores where id = (storage.foldername(name))[1]::uuid and owner_id = (select auth.uid())));

create table if not exists public.plans (
  code text primary key check (code in ('growth', 'enterprise')),
  name text not null,
  monthly_price_usd numeric(12, 2),
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.plans (code, name, monthly_price_usd, features, limits)
values
  ('growth', 'Growth', null, '{"ocr": true, "waha": true, "advanced_reports": true, "priority_support": false}', '{"products": 500, "orders_per_month": 5000}'),
  ('enterprise', 'Enterprise', null, '{"ocr": true, "waha": true, "advanced_reports": true, "priority_support": true}', '{"products": null, "orders_per_month": null}')
on conflict (code) do update set
  name = excluded.name,
  monthly_price_usd = excluded.monthly_price_usd,
  features = excluded.features,
  limits = excluded.limits,
  updated_at = now();

create table if not exists public.store_subscriptions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  plan_code text not null references public.plans(code),
  price_usd numeric(12, 2),
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.store_subscriptions add column if not exists current_period_end timestamptz;

alter table public.plans enable row level security;
alter table public.store_subscriptions enable row level security;

drop policy if exists "plans_authenticated_select" on public.plans;
create policy "plans_authenticated_select" on public.plans for select to authenticated using (is_active = true or public.is_super_admin());
drop policy if exists "subscriptions_owner_select" on public.store_subscriptions;
create policy "subscriptions_owner_select" on public.store_subscriptions for select to authenticated using (exists (select 1 from public.stores where stores.id = store_subscriptions.store_id and stores.owner_id = auth.uid()) or public.is_super_admin());
drop policy if exists "subscriptions_super_admin_insert" on public.store_subscriptions;
create policy "subscriptions_super_admin_insert" on public.store_subscriptions for insert to authenticated with check (public.is_super_admin());
drop policy if exists "subscriptions_super_admin_update" on public.store_subscriptions;
create policy "subscriptions_super_admin_update" on public.store_subscriptions for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "stores_super_admin_insert" on public.stores;
create policy "stores_super_admin_insert" on public.stores for insert to authenticated with check (public.is_super_admin());
drop policy if exists "stores_super_admin_delete" on public.stores;
create policy "stores_super_admin_delete" on public.stores for delete to authenticated using (public.is_super_admin());

grant select on public.plans to authenticated;
grant select, insert, update on public.store_subscriptions to authenticated;

create or replace function public.get_store_entitlements(target_store_id uuid)
returns table (plan_code text, price_usd numeric, features jsonb, limits jsonb)
language sql security definer set search_path = public stable as $$
  select sub.plan_code, sub.price_usd, p.features, p.limits
  from public.store_subscriptions sub
  join public.plans p on p.code = sub.plan_code
  where sub.store_id = target_store_id and sub.status = 'active';
$$;

revoke all on function public.get_store_entitlements(uuid) from public;
grant execute on function public.get_store_entitlements(uuid) to authenticated;

-- Migração de contas antigas: Starter passa a usar o plano combinado Growth.
update public.store_subscriptions set plan_code = 'growth' where plan_code = 'starter';
delete from public.plans where code = 'starter';
alter table public.plans drop constraint if exists plans_code_check;
alter table public.plans add constraint plans_code_check check (code in ('growth', 'enterprise'));
