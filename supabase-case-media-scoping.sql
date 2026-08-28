-- Run this AFTER supabase-case-fk-columns.sql. Closes a real data leak:
-- case_media (photo/audio file paths + URLs for every case) has been
-- readable by ANY authenticated session since supabase-case-tables.sql --
-- unlike `cases` itself, it was never re-scoped when the rest of the app
-- moved to per-role RLS. Any citizen/rescue/hospital account could list
-- every case's media across every org, not just their own.

drop policy if exists "Public read case_media" on case_media;
drop policy if exists "Public insert case_media" on case_media;
drop policy if exists "Public delete case_media" on case_media;

create policy "Scoped case_media select" on case_media for select to authenticated using (
  exists (
    select 1 from cases c, profiles p
    where c.case_id = case_media.case_id
      and p.id = auth.uid()
      and p.approval_status = 'approved'
      and (
        p.is_admin
        or p.role = 'dispatch'
        or (p.role = 'rescue' and (c.rescue_team_id = p.rescue_team_id or c.supporting_rescue_team_id = p.rescue_team_id))
        or (p.role = 'hospital' and c.hospital_id = p.hospital_id)
        or (p.role = 'public' and c.reporter_user_id = auth.uid())
      )
  )
);

-- Insert stays permissive to any authenticated session (not scoped to the
-- case's own reporter) on purpose -- a photo/audio upload can land a moment
-- before the case row's own upsert finishes (see supabase-case-tables.sql's
-- comment), so there's nothing yet to check ownership against at insert
-- time. The actual leak was on the read side, fixed above.
create policy "Authenticated insert case_media" on case_media for insert to authenticated with check (true);

create policy "Dispatch/admin delete case_media" on case_media for delete to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.approval_status = 'approved' and (p.is_admin or p.role = 'dispatch')
  )
);

-- Anonymous (no-session) access is unused now that citizens get an
-- anonymous Supabase Auth session (see src/lib/auth.ts) -- that session is
-- `authenticated`, not the raw `anon` role.
revoke select, insert, delete on case_media from anon;
grant select, insert, delete on case_media to authenticated;

-- ---------------------------------------------------------------------
-- IMPORTANT CAVEAT: this only closes the case_media TABLE (which file
-- exists for which case). The actual photo/audio files live in the
-- "case-media" Storage bucket, which is marked Public in the dashboard --
-- Supabase serves public-bucket files from an unauthenticated URL that
-- bypasses storage RLS entirely, regardless of any policy on
-- storage.objects. So a file is still viewable by anyone who has (or
-- guesses) its exact URL, even after this fix. Ask Claude about switching
-- to a private bucket + signed URLs if you want that fully closed too --
-- it's a bigger change (every place a photo/audio renders needs to fetch a
-- signed URL instead of using the stored public one).
