-- Add support for multiple product images + storage bucket + small settings cleanup.

-- ---------------------------------------------------------------------------
-- Products: optional array of image URLs
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists images text[];

update public.products
set images = array[image]
where images is null;

-- ---------------------------------------------------------------------------
-- Store settings: remove leading "@" from handle
-- ---------------------------------------------------------------------------
update public.store_settings
set contact_handle = regexp_replace(contact_handle, '^@+', '')
where id = 1;

-- ---------------------------------------------------------------------------
-- Storage: bucket + policies (public read, admin write)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
  set public = excluded.public;

alter table storage.objects enable row level security;

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

