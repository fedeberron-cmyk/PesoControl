-- Optional food photos

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-photos',
  'food-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can view own food photos'
  ) then
    create policy "Users can view own food photos"
      on storage.objects for select
      using (bucket_id = 'food-photos' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload own food photos'
  ) then
    create policy "Users can upload own food photos"
      on storage.objects for insert
      with check (bucket_id = 'food-photos' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update own food photos'
  ) then
    create policy "Users can update own food photos"
      on storage.objects for update
      using (bucket_id = 'food-photos' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete own food photos'
  ) then
    create policy "Users can delete own food photos"
      on storage.objects for delete
      using (bucket_id = 'food-photos' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;
