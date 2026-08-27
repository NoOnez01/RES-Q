-- Run this in the Supabase SQL Editor so the app's "clear all data" button
-- (and any other cleanup code) can actually remove files from the
-- case-media bucket, not just their case_media tracking rows. Without this,
-- storage.objects has no DELETE policy, so a bulk remove silently deletes
-- nothing (Supabase storage returns 200 with an empty list rather than an
-- error). Matches the read/insert policies in supabase-storage-policies.sql.

create policy "Public delete access on case-media"
on storage.objects for delete
to public
using (bucket_id = 'case-media');
