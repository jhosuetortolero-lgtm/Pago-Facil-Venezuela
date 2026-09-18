-- Migração necessária para o cadastro de produtos com imagem e estoque.
-- Execute este arquivo no Supabase SQL Editor.

alter table public.products
  add column if not exists image_url text;

alter table public.products
  add column if not exists stock integer not null default 0;

alter table public.products
  drop constraint if exists products_stock_check;

alter table public.products
  add constraint products_stock_check check (stock >= 0);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product_images_owner_insert" on storage.objects;
create policy "product_images_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.stores
    where id = (storage.foldername(name))[1]::uuid
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.stores
    where id = (storage.foldername(name))[1]::uuid
      and owner_id = (select auth.uid())
  )
)
with check (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.stores
    where id = (storage.foldername(name))[1]::uuid
      and owner_id = (select auth.uid())
  )
);

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1 from public.stores
    where id = (storage.foldername(name))[1]::uuid
      and owner_id = (select auth.uid())
  )
);
