-- Run this in the Supabase SQL Editor (left sidebar) after creating the
-- "case-media" bucket, so the browser (using the public anon key) is allowed
-- to upload and read files. Matches this app's current no-login demo flow.
-- Tighten before handling real patient data (e.g. scope by authenticated
-- role instead of "true").

create policy "Public read access on case-media"
on storage.objects for select
to public
using (bucket_id = 'case-media');

create policy "Public upload access on case-media"
on storage.objects for insert
to public
with check (bucket_id = 'case-media');
