insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-covers', 'social-covers', true, 5242880, array['image/webp'])
on conflict (id) do nothing;

create policy "Public read social covers"
on storage.objects
for select
to public
using (bucket_id = 'social-covers');
