-- Run this AFTER creating an "avatars" bucket in the Supabase dashboard
-- (Storage -> New bucket -> name it "avatars", mark it Public), the same
-- way the case-media bucket was created. Unlike case-media (open to
-- anonymous citizens reporting a case), avatars belong to a real signed-in
-- account, so uploads are scoped to the caller's own auth.uid() -- one
-- person can't overwrite another's profile photo.

create policy "Public read access on avatars"
on storage.objects for select
to public
using (bucket_id = 'avatars');

create policy "Users upload their own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users replace their own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own avatar"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
